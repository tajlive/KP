/**
 * Leaderboard Preview Data
 * 
 * KLA-239: Leaderboard-preview på landing
 * Temporary mock data until real leaderboard endpoint is available
 */

export interface LeaderboardEntry {
  rank: number;
  username: string;
  return: number;
  klt: number;
}

/**
 * Mock data for leaderboard preview
 * Shows top 3 from paper-trading competition
 */
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, username: "Trader***", return: 45.2, klt: 50000 },
  { rank: 2, username: "Crypto**", return: 38.7, klt: 30000 },
  { rank: 3, username: "Hodl****", return: 32.1, klt: 20000 },
];

/**
 * Fetch leaderboard preview data
 * Currently returns mock data - will be replaced with API call
 */
export async function getLeaderboardPreview(): Promise<LeaderboardEntry[]> {
  // TODO: Replace with real API call when leaderboard endpoint is ready
  // const response = await fetch('/api/leaderboard/preview');
  // return response.json();
  
  return MOCK_LEADERBOARD;
}
