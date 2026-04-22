/**
 * Admin API: Create users via Admin API
 *
 * This endpoint allows admin users to create new users.
 * The user_profiles table and all related tables are automatically
 * created via the handle_new_user_consolidated trigger.
 */

import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * POST: Create a new user via Admin API
 *
 * Request body:
 * {
 *   email: string,
 *   password: string,
 *   user_metadata?: {
 *     full_name?: string,
 *     locale?: string,
 *     provider?: string,
 *     referral_code?: string
 *   },
 *   email_confirm?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (!adminCheck.ok) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Admin client not configured" },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const { email, password, user_metadata = {}, email_confirm = true } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 },
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    // Create user via Admin API
    const { data: userData, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          full_name: user_metadata.full_name || email.split("@")[0],
          locale: user_metadata.locale || "no",
          provider: user_metadata.provider || "email",
          ...user_metadata,
        },
        email_confirm,
      });

    if (createError) {
      console.error("[Admin Create User]:", createError);
      return NextResponse.json({ error: createError.message }, { status: 400 });
    }

    if (!userData.user) {
      return NextResponse.json(
        { error: "User creation failed" },
        { status: 500 },
      );
    }

    // Verify that user_profiles was created by the trigger
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userData.user.id)
      .single();

    if (profileError || !profile) {
      console.error("[Admin Create User]: Profile not created:", profileError);
      return NextResponse.json(
        {
          error:
            "User created but profile creation failed. Trigger may not be working.",
          user: userData.user,
          profileError: profileError?.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "User created successfully via Admin API",
      user: {
        id: userData.user.id,
        email: userData.user.email,
        created_at: userData.user.created_at,
      },
      profile: {
        id: profile.id,
        user_id: profile.user_id,
        display_name: profile.display_name,
        tier: profile.tier,
        role: profile.role,
      },
      tables_created: [
        "user_profiles",
        "email_preferences",
        "kltbalances",
        "onboarding_progress",
        "portfolios",
        "user_settings",
        "user_notification_settings",
        "risk_profiles",
      ],
    });
  } catch (error) {
    console.error("[Admin Create User]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * GET: List users (admin only)
 */
export async function GET(request: NextRequest) {
  const adminCheck = await verifyAdminAccess();
  if (!adminCheck.ok) {
    return NextResponse.json(
      { error: adminCheck.error },
      { status: adminCheck.status },
    );
  }

  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json(
      { error: "Admin client not configured" },
      { status: 503 },
    );
  }

  try {
    // Get pagination params
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("per_page") || "50");

    // List users via Admin API
    const { data: usersData, error: listError } =
      await supabase.auth.admin.listUsers({
        page,
        perPage,
      });

    if (listError) {
      console.error("[Admin List Users]:", listError);
      return NextResponse.json({ error: listError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      users: usersData.users.map((user) => ({
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        user_metadata: user.user_metadata,
      })),
      total: usersData.users.length,
      page,
      per_page: perPage,
    });
  } catch (error) {
    console.error("[Admin List Users]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
