import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Price Data Fetcher
async function fetchCurrentPrices(symbols: string[]): Promise<Record<string, number>> {
  const baseUrl = "https://api.binance.com";
  const prices: Record<string, number> = {};
  
  // Always include USDT as baseline
  prices["USDT"] = 1.0;

  try {
    const res = await fetch(`${baseUrl}/api/v3/ticker/price`, {
      next: { revalidate: 60 },
    });
    
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    
    const data = await res.json();
    for (const item of data) {
      for (const symbol of symbols) {
        if (item.symbol === `${symbol}USDT`) {
          prices[symbol] = parseFloat(item.price);
        }
      }
    }
  } catch (err) {
    logger.error("Binance API fetch failed in portfolio rebalance", { error: (err as Error).message });
  }

  return prices;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // 1. Fetch active configs
    const { data: configs, error: configError } = await (supabase as any)
      .from("portfolio_rebalance_configs")
      .select("*")
      .eq("is_active", true);

    if (configError) throw configError;
    if (!configs || configs.length === 0) {
      return NextResponse.json({ message: "No active configs found" });
    }

    // Process each user config
    for (const config of configs) {
      try {
        const userId = config.user_id;
        const targetAllocations: Record<string, number> = config.target_allocations;
        const threshold = config.threshold_percent / 100.0;
        
        // 2. Fetch user wallets
        const { data: wallets, error: walletsError } = await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", userId);

        if (walletsError) throw walletsError;

        // Ensure we check prices for held assets + target assets
        const symbolsToFetch = new Set<string>(Object.keys(targetAllocations));
        wallets?.forEach(w => symbolsToFetch.add(w.currency));
        // Remove standard fiats or stables from price fetch if needed
        symbolsToFetch.delete("USDT");
        symbolsToFetch.delete("NOK");

        // 3. Fetch Prices
        const prices = await fetchCurrentPrices(Array.from(symbolsToFetch));

        // 4. Calculate total portfolio value and current allocations
        let totalValueUsdt = 0;
        const currentValuesUsdt: Record<string, number> = {};
        
        for (const wallet of wallets || []) {
          const currency = wallet.currency;
          const balance = wallet.balance;
          
          if (currency === "NOK") {
            // In a real app we'd convert NOK to USDT, but let's assume portfolio is crypto-only for now
            continue; 
          }

          const price = prices[currency] || (currency === "USDT" ? 1 : 0);
          const valueUsdt = balance * price;
          
          currentValuesUsdt[currency] = valueUsdt;
          totalValueUsdt += valueUsdt;
        }

        if (totalValueUsdt === 0) continue; // Nothing to rebalance

        const currentAllocations: Record<string, number> = {};
        let needsRebalance = false;
        let triggerReason = "";

        // Combine all known assets from target and current
        const allAssets = new Set([...Object.keys(targetAllocations), ...Object.keys(currentValuesUsdt)]);

        for (const asset of Array.from(allAssets)) {
          const currentWeight = (currentValuesUsdt[asset] || 0) / totalValueUsdt;
          const targetWeight = targetAllocations[asset] || 0;
          currentAllocations[asset] = currentWeight;

          const diff = Math.abs(currentWeight - targetWeight);
          if (diff >= threshold) {
            needsRebalance = true;
            triggerReason = `Asset ${asset} deviated by ${(diff * 100).toFixed(2)}% (Target: ${(targetWeight * 100).toFixed(2)}%, Current: ${(currentWeight * 100).toFixed(2)}%)`;
            break; // Stop checking, we already know we need to rebalance
          }
        }

        // 5. Trigger Rebalance Event if needed
        if (needsRebalance) {
          logger.info(`Triggering portfolio rebalance for ${userId}`, { reason: triggerReason });

          // Check if there is already an active rebalance event
          const { data: existingEvents } = await (supabase as any)
            .from("portfolio_rebalance_events")
            .select("id")
            .eq("user_id", userId)
            .in("status", ["pending", "in_progress"]);
            
          if (existingEvents && existingEvents.length > 0) {
             logger.info(`User ${userId} already has an active rebalance event, skipping new trigger.`);
             continue;
          }

          const { data: newEvent, error: eventInsertError } = await (supabase as any)
            .from("portfolio_rebalance_events")
            .insert({
              user_id: userId,
              status: "pending",
              trigger_reason: triggerReason,
              current_allocations: currentAllocations,
              target_allocations: targetAllocations
            })
            .select()
            .single();

          if (eventInsertError) throw eventInsertError;

          // 6. Generate Rebalance Orders
          const ordersToInsert = [];
          for (const asset of Array.from(allAssets)) {
            const currentWeight = currentAllocations[asset] || 0;
            const targetWeight = targetAllocations[asset] || 0;
            const diffWeight = targetWeight - currentWeight;
            
            // Value to buy or sell in USDT
            const amountUsdt = Math.abs(diffWeight * totalValueUsdt);
            
            // Minimum trade size usually $10 on Binance
            if (amountUsdt > 10 && asset !== "USDT") {
              ordersToInsert.push({
                event_id: newEvent.id,
                user_id: userId,
                symbol: asset,
                side: diffWeight > 0 ? "buy" : "sell",
                amount_usdt: amountUsdt,
                twap_chunks: Math.max(1, Math.ceil(amountUsdt / 100)), // E.g., split into $100 chunks
                status: "pending"
              });
            }
          }

          if (ordersToInsert.length > 0) {
            const { error: orderInsertError } = await (supabase as any)
              .from("portfolio_rebalance_orders")
              .insert(ordersToInsert);
              
            if (orderInsertError) throw orderInsertError;
          } else {
             // If no orders were generated (e.g. only USDT difference or too small), mark completed
             await (supabase as any)
                .from("portfolio_rebalance_events")
                .update({ status: "completed", completed_at: new Date().toISOString() })
                .eq("id", newEvent.id);
          }
        }

      } catch (userErr) {
        logger.error(`Error processing portfolio rebalance for config ${config.id}:`, { error: (userErr as Error).message });
      }
    }

    return NextResponse.json({ success: true, processed: configs.length });
  } catch (error) {
    logger.error("Portfolio rebalance cron failed:", { error: (error as Error).message });
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
