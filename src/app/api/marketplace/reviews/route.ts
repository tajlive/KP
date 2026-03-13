import { withRateLimit } from "@/lib/api-auth";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase-generated";

export const dynamic = "force-dynamic";

const reviewSchema = z.object({
  listingId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(1000).optional(),
});

/**
 * GET /api/marketplace/reviews?listingId=xxx — Public: get reviews for a listing
 */
export async function GET(request: NextRequest) {
  const listingId = request.nextUrl.searchParams.get("listingId");

  if (!listingId) {
    return NextResponse.json({ error: "listingId required" }, { status: 400 });
  }

  const db = await createClient() as SupabaseClient<Database>;

  const { data, error } = await db
    .from("strategy_reviews")
    .select("*")
    .eq("strategy_id", listingId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ratings = (data || []).map(
    (r) => (r as { rating: number }).rating,
  );
  const avgRating =
    ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : 0;

  return NextResponse.json({
    reviews: data || [],
    aggregate: {
      count: ratings.length,
      average: Math.round(avgRating * 10) / 10,
    },
  });
}

/**
 * POST /api/marketplace/reviews — Authenticated + rate limited: create a review
 */
export const POST = withRateLimit(
  5,
  60_000,
  async (req: NextRequest, { user }) => {
    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { listingId, rating, reviewText } = parsed.data;
    const db = await createClient() as SupabaseClient<Database>;

    // Check if user already reviewed
    const { data: existing } = await db
      .from("strategy_reviews")
      .select("id")
      .eq("strategy_id", listingId)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      return NextResponse.json({ error: "Already reviewed" }, { status: 409 });
    }

    const { data, error } = await db
      .from("strategy_reviews")
      .insert({
        strategy_id: listingId,
        user_id: user.id,
        rating,
        review: reviewText || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update average rating on the listing
    const { data: allReviews } = await db
      .from("strategy_reviews")
      .select("rating")
      .eq("strategy_id", listingId);

    if (allReviews && allReviews.length > 0) {
      const avg =
        allReviews.reduce(
          (sum, r) => sum + ((r as { rating: number }).rating || 0),
          0,
        ) / allReviews.length;
      await db
        .from("marketplace_listings")
        .update({
          rating: Math.round(avg * 10) / 10,
          review_count: allReviews.length,
        })
        .eq("id", listingId);
    }

    return NextResponse.json({ review: data }, { status: 201 });
  },
);
