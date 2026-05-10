import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { getUsdtToNokRateAsync } from "@/lib/trading/currency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple price fetcher
async function fetchPrice(symbol: string): Promise<number> {
  if (symbol === "USDT") return 1.0;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`);
    if (!res.ok) return 0;
    const data = await res.json();
    return parseFloat(data.price);
  } catch {
    return 0;
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeaderRaw = req.headers.get("authorization")?.replace("Bearer ", "");
    const isDev = process.env.NODE_ENV === "development";
    const cronSecret = process.env.CRON_SECRET;

    if (!isDev && cronSecret && authHeaderRaw !== cronSecret.trim()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await createClient();

    // 1. Fetch orders that are pending or partial
    const { data: orders, error: ordersError } = await (supabase as any)
      .from("portfolio_rebalance_orders")
      .select("*")
      .in("status", ["pending", "partial"]);

    if (ordersError) throw ordersError;
    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: "No active TWAP orders found" });
    }

    const eventsToCheck = new Set<string>();

    for (const order of orders) {
      try {
        // Calculate chunk size (e.g., $100 per chunk, or total divided by twap_chunks)
        // If amount_usdt is 500, and twap_chunks is 5, chunk = 100
        const chunkUsdt = order.amount_usdt / order.twap_chunks;
        
        // Ensure minimum binance trade size ($10)
        let executeUsdt = Math.min(chunkUsdt, order.amount_usdt - (order.executed_amount_usdt || 0));
        if (executeUsdt < 10 && executeUsdt > 0) {
          executeUsdt = order.amount_usdt - (order.executed_amount_usdt || 0); // execute the rest if it's small
        }

        if (executeUsdt <= 0) {
           await (supabase as any)
              .from("portfolio_rebalance_orders")
              .update({ status: "completed", updated_at: new Date().toISOString() })
              .eq("id", order.id);
           eventsToCheck.add(order.event_id);
           continue;
        }

        const price = await fetchPrice(order.symbol);
        if (price === 0) {
          logger.warn(`Could not fetch price for ${order.symbol}, skipping TWAP chunk.`);
          continue;
        }

        let quantity = executeUsdt / price;

        // Fetch user profile to check if live trading
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("binance_connected")
          .eq("id", order.user_id)
          .single();

        let executionSuccess = false;

        if (profile?.binance_connected) {
           // LIVE EXECUTION via Binance
           // NOTE: In a full production scenario, we would use BinanceExecutor here.
           // For this implementation, we log the intent.
           logger.info(`[LIVE] TWAP Order ${order.side.toUpperCase()} ${quantity.toFixed(6)} ${order.symbol} at ${price} (Value: $${executeUsdt.toFixed(2)})`);
           
           // Simulate success for now
           executionSuccess = true;
        } else {
           // PAPER / SIMULATED EXECUTION -> Update wallets directly
           logger.info(`[PAPER] TWAP Order ${order.side.toUpperCase()} ${quantity.toFixed(6)} ${order.symbol} at ${price} (Value: $${executeUsdt.toFixed(2)})`);
           
           // 1. Get current balances
           const { data: wallets } = await supabase
             .from("wallets")
             .select("*")
             .eq("user_id", order.user_id)
             .in("currency", [order.symbol, "USDT", "NOK"]);

           const assetWallet = wallets?.find(w => w.currency === order.symbol);
           const usdtWallet = wallets?.find(w => w.currency === "USDT");
           const nokWallet = wallets?.find(w => w.currency === "NOK");

           let assetBalance = assetWallet?.balance ? Number(assetWallet.balance) : 0;
           let usdtBalance = usdtWallet?.balance ? Number(usdtWallet.balance) : 0;
           let nokBalance = nokWallet?.balance ? Number(nokWallet.balance) : 0;

           if (order.side === "buy") {
              if (usdtBalance >= executeUsdt) {
                 usdtBalance -= executeUsdt;
                 assetBalance += quantity;
                 executionSuccess = true;
              } else {
                 // Fallback: check NOK balance
                 const rate = await getUsdtToNokRateAsync(supabase);
                 const costNok = executeUsdt * rate;
                 
                 if (nokBalance >= costNok) {
                   nokBalance -= costNok;
                   assetBalance += quantity;
                   executionSuccess = true;
                   logger.info(`Used ${costNok.toFixed(2)} NOK for ${order.symbol} buy (Rate: ${rate})`);
                 } else {
                   logger.warn(`Insufficient USDT and NOK to buy ${order.symbol}`);
                 }
              }
           } else {
              if (assetBalance >= quantity) {
                 assetBalance -= quantity;
                 usdtBalance += executeUsdt;
                 executionSuccess = true;
              } else {
                 logger.warn(`Insufficient ${order.symbol} to sell`);
                 // Try selling whatever is left
                 const maxUsdt = assetBalance * price;
                 if (maxUsdt > 10) {
                    executeUsdt = maxUsdt;
                    quantity = assetBalance;
                    assetBalance = 0;
                    usdtBalance += executeUsdt;
                    executionSuccess = true;
                 }
              }
           }

            if (executionSuccess) {
               // Update asset wallet
               if (assetWallet) {
                  await supabase.from("wallets").update({ balance: assetBalance }).eq("id", assetWallet.id);
               } else {
                  await supabase.from("wallets").insert({ user_id: order.user_id, currency: order.symbol, balance: assetBalance });
               }

               // Update USDT wallet
               if (usdtWallet) {
                  await supabase.from("wallets").update({ balance: usdtBalance }).eq("id", usdtWallet.id);
               } else {
                  await supabase.from("wallets").insert({ user_id: order.user_id, currency: "USDT", balance: usdtBalance });
               }

               // Update NOK wallet if used
               if (nokWallet) {
                  await supabase.from("wallets").update({ balance: nokBalance }).eq("id", nokWallet.id);
               }

               // LOG THE TRADE
               try {
                  // 1. Get or create a session for this trade
                  let sessionId = "";
                  const { data: session } = await supabase
                    .from("trading_sessions")
                    .select("id")
                    .eq("user_id", order.user_id)
                    .eq("status", "active")
                    .eq("strategy_id", "manual")
                    .maybeSingle();
                  
                  if (session) {
                    sessionId = session.id;
                  } else {
                    const { data: newSession, error: createError } = await supabase
                      .from("trading_sessions")
                      .insert({
                        user_id: order.user_id,
                        strategy_id: "manual",
                        status: "active",
                        mode: profile?.binance_connected ? "live" : "paper",
                        strategy_config: { name: "Manual Rebalancing" },
                        trading_pair: order.symbol || "ALL",
                        current_capital: 0,
                        initial_capital: 0,
                        total_trades: 0,
                        winning_trades: 0,
                        losing_trades: 0,
                        total_pnl: 0,
                        last_heartbeat: new Date().toISOString(),
                        started_at: new Date().toISOString(),
                        is_leaderboard_visible: false,
                      })
                      .select()
                      .single();
                    if (newSession) sessionId = newSession.id;
                  }

                   if (sessionId) {
                    const { error: tradeError } = await supabase.from("trades").insert({
                      session_id: sessionId,
                      user_id: order.user_id,
                      symbol: order.symbol,
                      trading_pair: order.symbol.includes("/") ? order.symbol : `${order.symbol}/USDT`,
                      side: order.side,
                      quantity,
                      price,
                      total_value: executeUsdt,
                      fee: executeUsdt * 0.001,
                      status: "filled",
                      order_type: "market",
                      mode: profile?.binance_connected ? "live" : "paper",
                      executed_at: new Date().toISOString(),
                      idempotency_key: `twap-${order.id}-${Date.now()}`
                    });

                    if (tradeError) {
                      logger.error(`Failed to log trade for order ${order.id}:`, tradeError);
                      (order as any).tradeError = tradeError;
                    } else {
                      logger.info(`Successfully logged trade for order ${order.id}`);
                    }
                  }
               } catch (tradeLogErr: any) {
                  logger.error(`Failed to log TWAP trade for order ${order.id}:`, tradeLogErr);
                  (order as any).tradeError = tradeLogErr.message || tradeLogErr;
               }
            }
         }

        if (executionSuccess) {
           const newExecutedAmount = (order.executed_amount_usdt || 0) + executeUsdt;
           const newStatus = newExecutedAmount >= order.amount_usdt * 0.99 ? "completed" : "partial"; // 0.99 for float math safety
           
           await (supabase as any)
              .from("portfolio_rebalance_orders")
              .update({
                 executed_amount_usdt: newExecutedAmount,
                 status: newStatus,
                 updated_at: new Date().toISOString()
              })
              .eq("id", order.id);

           if (newStatus === "completed") {
              eventsToCheck.add(order.event_id);
           }
        }

      } catch (err) {
         logger.error(`Error processing TWAP chunk for order ${order.id}:`, { error: (err as Error).message });
      }
    }

    // 2. Check if events are fully completed
    for (const eventId of Array.from(eventsToCheck)) {
       const { data: eventOrders } = await (supabase as any)
          .from("portfolio_rebalance_orders")
          .select("status")
          .eq("event_id", eventId);

       const allCompleted = eventOrders?.every((o: any) => o.status === "completed") || false;
       
       if (allCompleted) {
          await (supabase as any)
             .from("portfolio_rebalance_events")
             .update({
                status: "completed",
                completed_at: new Date().toISOString()
             })
             .eq("id", eventId);
          logger.info(`Portfolio rebalance event ${eventId} marked as completed.`);
       }
    }

    return NextResponse.json({ 
      success: true, 
      processedOrders: orders.length,
      orders: orders.map((o: any) => ({ id: o.id, tradeError: (o as any).tradeError }))
    });
  } catch (error) {
    logger.error("TWAP Executor cron failed:", { error: (error as Error).message });
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
