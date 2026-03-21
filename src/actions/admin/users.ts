"use server";

import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Grant Founder Status to a user
 * - Updates role to 'founder'
 * - Awards 10,000 KLT tokens
 * - Logs the transaction
 */
export async function grantFounderStatus(userId: string) {
  const supabase = createClient();

  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) throw new Error(auth.error);

    // 2. Get target user info
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) throw new Error(`User not found: ${userId}`);
    if (user.role === "founder")
      return { success: false, message: "User is already a founder" };

    // 3. Update role
    const { error: updateError } = await supabase
      .from("user_profiles")
      .update({ role: "founder", is_founder: true })
      .eq("id", userId);

    if (updateError) throw updateError;

    // 4. Award KLT tokens
    const { data: balance } = await supabase
      .from("user_klt_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const currentBalance = balance?.balance || 0;
    const newBalance = currentBalance + 10000;

    const { error: tokenError } = await supabase
      .from("user_klt_balances")
      .upsert({
        user_id: userId,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      });

    if (tokenError) throw tokenError;

    // 5. Log transaction
    await supabase.from("klt_transactions").insert({
      user_id: userId,
      amount: 10000,
      type: "award",
      category: "founder",
      description: "Founder status granted",
      reason: "Founder status granted",
    });

    revalidatePath("/admin/students");
    return {
      success: true,
      message: `Founder status granted to ${user.email}. Awarded 10,000 KLT.`,
    };
  } catch (error) {
    console.error("Error granting founder status:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Ban a user
 * - Updates status to 'banned'
 * - Sets banned_at and ban_reason
 */
export async function banUser(userId: string, reason: string) {
  const supabase = createClient();

  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) throw new Error(auth.error);

    // 2. Update status
    const { error } = await supabase
      .from("user_profiles")
      .update({
        status: "banned",
        banned_at: new Date().toISOString(),
        ban_reason: reason,
      })
      .eq("id", userId);

    if (error) throw error;

    revalidatePath("/admin/students");
    return { success: true, message: "User banned successfully" };
  } catch (error) {
    console.error("Error banning user:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get User Details
 * - Fetches profile, balance, and signup data
 */
export async function getUserDetails(userId: string) {
  const supabase = createClient();

  try {
    const auth = await verifyAdminAccess();
    if (!auth.ok) {
      return { success: false, error: auth.error };
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*, user_klt_balances(balance), beta_signups(*)")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error("Error fetching user details:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
