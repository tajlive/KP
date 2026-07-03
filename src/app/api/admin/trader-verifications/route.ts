// Admin API: approve/reject trader verification requests and list them.

import { NextRequest, NextResponse } from "next/server";
import { withRole, getServiceRoleClient } from "@/lib/api-auth";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VerificationStatusSchema = z.enum(["approved", "rejected"]);

const PostBodySchema = z.object({
  trader_profile_id: z.string().uuid(),
  status: VerificationStatusSchema,
  reason: z.string().max(1000).optional(),
});

const ListQuerySchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "revoked"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const POST = withRole(["admin"], async (req: NextRequest, { user }) => {
  try {
    const body = await req.json();
    const parsed = PostBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { trader_profile_id, status, reason } = parsed.data;
    const db = getServiceRoleClient();

    // Verify the trader profile exists and fetch related fields.
    const { data: profile, error: profileError } = await db
      .from("trader_profiles")
      .select("id, user_id, display_name, verified")
      .eq("id", trader_profile_id)
      .maybeSingle();

    if (profileError) {
      console.error(
        "[admin/trader-verifications] fetch profile:",
        profileError.message,
      );
      return NextResponse.json(
        { error: "Failed to fetch trader profile" },
        { status: 500 },
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Trader profile not found" },
        { status: 404 },
      );
    }

    // Insert the verification audit row.
    const { data: verification, error: verificationError } = await db
      .from("trader_verifications")
      .insert({
        trader_profile_id,
        status,
        reason: reason ?? null,
        verified_by: user.id,
      })
      .select()
      .single();

    if (verificationError) {
      console.error(
        "[admin/trader-verifications] insert verification:",
        verificationError.message,
      );
      return NextResponse.json(
        { error: "Failed to record verification" },
        { status: 500 },
      );
    }

    // Update trader_profiles.verified only when approved.
    if (status === "approved") {
      const { data: updatedProfile, error: updateError } = await db
        .from("trader_profiles")
        .update({ verified: true })
        .eq("id", trader_profile_id)
        .select()
        .single();

      if (updateError) {
        console.error(
          "[admin/trader-verifications] update verified:",
          updateError.message,
        );
        return NextResponse.json(
          { error: "Failed to update trader profile verified status" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        verification,
        profile: updatedProfile,
      });
    }

    return NextResponse.json({
      success: true,
      verification,
      profile,
    });
  } catch (err) {
    console.error("[admin/trader-verifications] POST:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});

export const GET = withRole(["admin"], async (req: NextRequest) => {
  try {
    const searchParams = req.nextUrl.searchParams;
    const parsed = ListQuerySchema.safeParse({
      status: searchParams.get("status") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { status, limit, offset } = parsed.data;
    const db = getServiceRoleClient();

    let query = db
      .from("trader_verifications")
      .select(
        "*, trader_profiles!inner(id, user_id, display_name, verified)",
        { count: "exact" },
      );

    if (status) {
      query = query.eq("status", status);
    }

    const { data: verifications, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error(
        "[admin/trader-verifications] list:",
        error.message,
      );
      return NextResponse.json(
        { error: "Failed to fetch verifications" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      verifications: verifications ?? [],
      count: count ?? 0,
    });
  } catch (err) {
    console.error("[admin/trader-verifications] GET:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
