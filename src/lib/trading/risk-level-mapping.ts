/**
 * Risk Level Mapping Utility
 * 
 * Maps between UI risk levels (safe/balanced/aggressive) and backend risk levels (low/medium/high)
 * This ensures consistent communication between frontend and backend.
 */

/** UI-facing risk levels */
export type UIRiskLevel = "safe" | "balanced" | "aggressive";

/** Backend/API risk levels */
export type ApiRiskLevel = "low" | "medium" | "high";

/**
 * Map UI risk level to API/backend risk level
 */
export function mapUiToApiRiskLevel(uiLevel: UIRiskLevel): ApiRiskLevel {
  const mapping: Record<UIRiskLevel, ApiRiskLevel> = {
    safe: "low",
    balanced: "medium",
    aggressive: "high",
  };
  return mapping[uiLevel];
}

/**
 * Map API/backend risk level to UI risk level
 */
export function mapApiToUiRiskLevel(apiLevel: ApiRiskLevel): UIRiskLevel {
  const mapping: Record<ApiRiskLevel, UIRiskLevel> = {
    low: "safe",
    medium: "balanced",
    high: "aggressive",
  };
  return mapping[apiLevel];
}

/**
 * Validate and convert UI risk level to API risk level
 * Returns null if invalid
 */
export function validateAndMapUiToApiRiskLevel(
  level: string
): ApiRiskLevel | null {
  const validUiLevels: UIRiskLevel[] = ["safe", "balanced", "aggressive"];
  if (validUiLevels.includes(level as UIRiskLevel)) {
    return mapUiToApiRiskLevel(level as UIRiskLevel);
  }
  return null;
}

/**
 * Validate and convert API risk level to UI risk level
 * Returns null if invalid
 */
export function validateAndMapApiToUiRiskLevel(
  level: string
): UIRiskLevel | null {
  const validApiLevels: ApiRiskLevel[] = ["low", "medium", "high"];
  if (validApiLevels.includes(level as ApiRiskLevel)) {
    return mapApiToUiRiskLevel(level as ApiRiskLevel);
  }
  return null;
}
