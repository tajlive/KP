/**
 * Leaderboard Preview Data
 *
 * KLA-239: Leaderboard-preview på landing
 */

export interface LeaderboardEntry {
  rank: number;
  username: string;
  return: number;
  klt: number;
}

/**
 * Fetch leaderboard preview data
 * Returns empty array until real endpoint is ready
 */
export async function getLeaderboardPreview(): Promise<LeaderboardEntry[]> {
  return [];
}
