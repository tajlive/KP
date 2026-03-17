import { createClient as createBrowserClient } from "@/lib/utils";
import type { SupabaseClient } from "@supabase/supabase-js";

// KLT Rewards Configuration
export const KLT_REWARDS = {
  // Onboarding
  WELCOME_BONUS: 500,
  
  // Learning
  LESSON_COMPLETE: 50,
  QUIZ_PASS: 100,
  QUIZ_PERFECT: 200,
  COURSE_COMPLETE: 500,
  
  // Trading (Paper)
  FIRST_PAPER_TRADE: 100,
  PAPER_TRADE_WIN: 25,
  PAPER_TRADE_WIN_STREAK_5: 150,
  
  // Social
  INVITE_FRIEND: 200,
  FRIEND_PURCHASE: 500,
  
  // Engagement
  DAILY_LOGIN_STREAK_7: 100,
  DAILY_LOGIN_STREAK_30: 500,
  PROFILE_COMPLETE: 100,
};

export type KLTTransactionType = 
  | "welcome_bonus"
  | "lesson_complete"
  | "quiz_pass"
  | "quiz_perfect"
  | "course_complete"
  | "first_paper_trade"
  | "paper_trade_win"
  | "invite_friend"
  | "daily_streak"
  | "profile_complete"
  | "admin_award"
  | "purchase";

interface AwardKLTPayload {
  userId: string;
  amount: number;
  type: KLTTransactionType;
  reason: string;
  metadata?: Record<string, unknown>;
  /** Server-side: pass Supabase service client so RLS allows insert/upsert */
  supabase?: SupabaseClient;
}

/**
 * Award KLT tokens to a user
 * Call from server actions/API with supabase from createClient() (server) for writes to succeed under RLS.
 */
export async function awardKLT({
  userId,
  amount,
  type,
  reason,
  metadata = {},
  supabase: injectedClient,
}: AwardKLTPayload): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = injectedClient ?? createBrowserClient();
    
    // Get current balance
    const { data: currentBalance } = await supabase
      .from("user_klt_balances")
      .select("balance, total_earned")
      .eq("user_id", userId)
      .single();
    
    const newBalance = (currentBalance?.balance || 0) + amount;
    const newTotalEarned = (currentBalance?.total_earned || 0) + amount;
    
    // Upsert balance
    const { error: balanceError } = await supabase
      .from("user_klt_balances")
      .upsert({
        user_id: userId,
        balance: newBalance,
        total_earned: newTotalEarned,
        updated_at: new Date().toISOString(),
      });
    
    if (balanceError) throw balanceError;
    
    // Record transaction (type = reward|spend|bonus|founder; category = lesson_complete etc.)
    const { error: txError } = await supabase
      .from("klt_transactions")
      .insert({
        user_id: userId,
        amount,
        type: "reward",
        category: type,
        description: reason,
        reason: reason,
        metadata: metadata ?? {},
      });
    
    if (txError) throw txError;
    
    return { success: true };
  } catch (error) {
    console.error("[awardKLT] Error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Award XP to user for gamification progression
 */
export async function awardXP(
  userId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; newLevel?: boolean; error?: string }> {
  try {
    const supabase = createBrowserClient();
    
    // Get current level data
    const { data: currentLevel } = await supabase
      .from("user_levels")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    let level = currentLevel?.level || 1;
    let xp = (currentLevel?.xp || 0) + amount;
    let xpToNext = currentLevel?.xp_to_next || 100;
    const totalXP = (currentLevel?.total_xp || 0) + amount;
    
    // Check for level up
    let newLevel = false;
    while (xp >= xpToNext) {
      xp -= xpToNext;
      level++;
      xpToNext = Math.floor(xpToNext * 1.2); // Increase XP requirement
      newLevel = true;
    }
    
    // Update level
    const { error } = await supabase
      .from("user_levels")
      .upsert({
        user_id: userId,
        level,
        xp,
        xp_to_next: xpToNext,
        total_xp: totalXP,
        rank: getRankForLevel(level),
        updated_at: new Date().toISOString(),
      });
    
    if (error) throw error;
    
    return { success: true, newLevel };
  } catch (error) {
    console.error("[awardXP] Error:", error);
    return { success: false, error: String(error) };
  }
}

function getRankForLevel(level: number): string {
  if (level >= 30) return "Professor";
  if (level >= 20) return "PhD";
  if (level >= 10) return "Master";
  if (level >= 5) return "Bachelor";
  return "Student";
}

/**
 * Unlock achievement for user
 */
export async function unlockAchievement(
  userId: string,
  achievementId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createBrowserClient();
    
    const { error } = await supabase
      .from("user_achievements")
      .upsert({
        user_id: userId,
        achievement_id: achievementId,
        unlocked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error("[unlockAchievement] Error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get user's KLT balance
 */
export async function getKLTBalance(userId: string): Promise<number> {
  try {
    const supabase = createBrowserClient();
    
    const { data } = await supabase
      .from("user_klt_balances")
      .select("balance")
      .eq("user_id", userId)
      .single();
    
    return data?.balance || 0;
  } catch {
    return 0;
  }
}
