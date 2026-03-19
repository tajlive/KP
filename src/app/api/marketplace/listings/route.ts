// ============================================================================
// GET /api/marketplace/listings
// KLA-91: Returns marketplace strategy listings
// Public endpoint with optional authentication for personalized results
// ============================================================================

import { createServerClient } from "@/lib/supabase/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database } from "@/types/supabase-generated";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface MarketplaceListing {
  id: string;
  sellerId: string;
  strategyId: string | null;
  title: string;
  description: string | null;
  priceModel: "free" | "subscription" | "one_time";
  priceNok: number;
  backtestSummary: Record<string, unknown> | unknown;
  category: string | null;
  status: "draft" | "published" | "archived";
  subscriberCount: number;
  rating: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  // Joined fields from seller
  sellerName?: string;
  sellerAvatar?: string | null;
  // Risk level derived from strategy
  riskLevel?: "low" | "medium" | "high";
  // Performance metrics from backtest
  winRate?: number;
  pnl30d?: number;
}

export interface MarketplaceListingsResponse {
  listings: MarketplaceListing[];
  total: number;
  page: number;
  limit: number;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MarketplaceListingsResponse | { error: string }>> {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      parseInt(searchParams.get("limit") || "20", 10),
      100,
    );
    const offset = (page - 1) * limit;
    const riskLevel = searchParams.get("risk") as
      | "low"
      | "medium"
      | "high"
      | null;
    const sortBy = searchParams.get("sort") || "performance"; // 'performance', 'newest', 'rating'
    const category = searchParams.get("category");

    // Try to get authenticated user (optional)
    let userId: string | null = null;
    try {
      const authClient = await createServerClient();
      const { data } = await authClient.auth.getUser();
      if (data.user) {
        userId = data.user.id;
      }
    } catch {
      // Not authenticated, continue as public
    }

    // Create public Supabase client
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    ) as SupabaseClient<Database>;

    // Build query for marketplace_listings
    let query = supabase
      .from("marketplace_listings")
      .select("*, profiles:seller_id(display_name, avatar_url)", {
        count: "exact",
      })
      .eq("status", "published");

    // Apply filters
    if (category) {
      query = query.eq("category", category);
    }

    // Apply sorting
    if (sortBy === "performance") {
      query = query.order("rating", { ascending: false });
    } else if (sortBy === "newest") {
      query = query.order("created_at", { ascending: false });
    } else if (sortBy === "rating") {
      query = query.order("rating", { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching marketplace listings:", error);

      // Fallback: return user_strategies with is_marketplace_listed = true
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("strategies")
        .select("*, profiles:user_id(display_name, avatar_url)")
        .eq("is_marketplace_listed", true)
        .eq("is_public", true)
        .range(offset, offset + limit - 1);

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to fetch marketplace listings" },
          { status: 500 },
        );
      }

      // Map fallback data to MarketplaceListing format (alltid array — unngå .map på ikke-array)
      const fallbackRows = Array.isArray(fallbackData) ? fallbackData : [];

      const listings: MarketplaceListing[] = fallbackRows.map(
        (value: unknown) => {
          const item = value as Record<string, unknown>;
          const profiles = item.profiles as
            | { display_name: string; avatar_url: string | null }
            | undefined;
          return {
            id: item.id as string,
            sellerId: item.user_id as string,
            strategyId: item.id as string,
            title: `${item.strategy_type || "Strategy"} - ${profiles?.display_name || "Creator"}`,
            description: null,
            priceModel: "free",
            priceNok: 0,
            backtestSummary: (item.strategy_config || {}) as unknown,
            category: item.strategy_type as string | null,
            status: "published",
            subscriberCount:
              ((item as Record<string, unknown>).subscriber_count as number) ||
              0,
            rating: 0,
            reviewCount: 0,
            createdAt: (item.created_at as string) ?? "",
            updatedAt: (item.updated_at as string) ?? "",
            sellerName: profiles?.display_name || "Anonym Creator",
            sellerAvatar: profiles?.avatar_url,
            riskLevel: getRiskLevel(item.strategy_type as string | null),
            winRate: 0,
            pnl30d: 0,
          };
        },
      );

      return NextResponse.json({
        listings,
        total: listings.length,
        page,
        limit,
      });
    }

    // Map data to MarketplaceListing format

    const listings: MarketplaceListing[] =
      (data as unknown[])?.map((value: unknown) => {
        const item = value as Record<string, unknown>;
        const profiles = item.profiles as
          | { display_name: string; avatar_url: string | null }
          | undefined;
        const backtestSummary = (item.backtest_summary || {}) as unknown;
        return {
          id: item.id as string,
          sellerId: item.seller_id as string,
          strategyId: item.strategy_id as string | null,
          title: item.title as string,
          description: item.description as string | null,
          priceModel: item.price_model as "free" | "subscription" | "one_time",
          priceNok: item.price_nok as number,
          backtestSummary: backtestSummary,
          category: item.category as string | null,
          status: item.status as "draft" | "published" | "archived",
          subscriberCount: (item.subscriber_count as number) || 0,
          rating: (item.rating as number) || 0,
          reviewCount: (item.review_count as number) || 0,
          createdAt: (item.created_at as string) ?? "",
          updatedAt: (item.updated_at as string) ?? "",
          sellerName: profiles?.display_name || "Anonym Creator",
          sellerAvatar: profiles?.avatar_url,
          riskLevel: getRiskLevelFromBacktest(
            backtestSummary as Record<string, unknown> | null,
          ),
          winRate:
            ((backtestSummary as Record<string, unknown>)
              ?.win_rate as number) || 0,
          pnl30d:
            ((backtestSummary as Record<string, unknown>)?.pnl_30d as number) ||
            0,
        };
      }) || [];

    // Filter by risk level if specified
    let filteredListings = listings;
    if (riskLevel) {
      filteredListings = listings.filter((l) => l.riskLevel === riskLevel);
    }

    return NextResponse.json({
      listings: filteredListings,
      total: count || 0,
      page,
      limit,
    });
  } catch (error) {
    console.error("Error in /api/marketplace/listings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Helper function to determine risk level from strategy type
function getRiskLevel(strategyType: string | null): "low" | "medium" | "high" {
  if (!strategyType) return "medium";
  const type = strategyType.toLowerCase();
  if (type.includes("dca") || type.includes("trygg")) return "low";
  if (
    type.includes("trend") ||
    type.includes("balansert") ||
    type.includes("grid")
  )
    return "medium";
  if (
    type.includes("multi") ||
    type.includes("aktiv") ||
    type.includes("aggressiv")
  )
    return "high";
  return "medium";
}

// Helper function to determine risk level from backtest summary
function getRiskLevelFromBacktest(
  backtest: Record<string, unknown> | null,
): "low" | "medium" | "high" {
  if (!backtest) return "medium";
  const volatility = (backtest.volatility as number) || 0;
  if (volatility < 0.1) return "low";
  if (volatility > 0.3) return "high";
  return "medium";
}
