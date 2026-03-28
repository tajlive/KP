/**
 * Test User Definitions for E2E Testing
 * 
 * Test users for different scenarios:
 * - Tier-based users (student, bachelor, master, phd, professor)
 * - Trading session users (with/without paper trading sessions)
 * - Notification users (with/without push subscriptions)
 * 
 * These users should be created via scripts/create-test-users.js
 */

export type UserTier = "student" | "bachelor" | "master" | "phd" | "professor";
export type UserType = "primary" | "tier" | "trading" | "notifications";

export interface TestUser {
  email: string;
  password: string;
  displayName: string;
  tier: UserTier;
  description: string;
  features: {
    hasTradingSession: boolean;
    hasNotifications: boolean;
    isVerified: boolean;
  };
}

/**
 * Primary E2E test user - the main user for most tests
 */
export const PRIMARY_TEST_USER: TestUser = {
  email: "tom@klarpakke.no",
  password: "TestPassword123!",
  displayName: "E2E Test User",
  tier: "student",
  description: "Primary E2E test user - standard student tier",
  features: {
    hasTradingSession: false,
    hasNotifications: false,
    isVerified: true,
  },
};

/**
 * Test users for each pricing tier
 */
export const TIER_TEST_USERS: Record<UserTier, TestUser> = {
  student: {
    email: "e2e.student@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E Student User",
    tier: "student",
    description: "Student tier - entry level",
    features: {
      hasTradingSession: false,
      hasNotifications: false,
      isVerified: true,
    },
  },
  bachelor: {
    email: "e2e.bachelor@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E Bachelor User",
    tier: "bachelor",
    description: "Bachelor tier - basic features",
    features: {
      hasTradingSession: true,
      hasNotifications: false,
      isVerified: true,
    },
  },
  master: {
    email: "e2e.master@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E Master User",
    tier: "master",
    description: "Master tier - advanced features",
    features: {
      hasTradingSession: true,
      hasNotifications: true,
      isVerified: true,
    },
  },
  phd: {
    email: "e2e.phd@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E PhD User",
    tier: "phd",
    description: "PhD tier - professional features",
    features: {
      hasTradingSession: true,
      hasNotifications: true,
      isVerified: true,
    },
  },
  professor: {
    email: "e2e.professor@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E Professor User",
    tier: "professor",
    description: "Professor tier - all features",
    features: {
      hasTradingSession: true,
      hasNotifications: true,
      isVerified: true,
    },
  },
};

/**
 * Test users for trading scenarios
 */
export const TRADING_TEST_USERS = {
  withSession: {
    email: "e2e.trading.active@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E Active Trader",
    tier: "master" as UserTier,
    description: "User with active paper trading session",
    features: {
      hasTradingSession: true,
      hasNotifications: false,
      isVerified: true,
    },
  },
  withoutSession: {
    email: "e2e.trading.new@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E New Trader",
    tier: "bachelor" as UserTier,
    description: "User without any trading session",
    features: {
      hasTradingSession: false,
      hasNotifications: false,
      isVerified: true,
    },
  },
  withTradeHistory: {
    email: "e2e.trading.history@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E Trader with History",
    tier: "phd" as UserTier,
    description: "User with trade history in paper trading",
    features: {
      hasTradingSession: true,
      hasNotifications: false,
      isVerified: true,
    },
  },
};

/**
 * Test users for notification scenarios
 */
export const NOTIFICATION_TEST_USERS = {
  withSubscription: {
    email: "e2e.notif.subscribed@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E Subscribed User",
    tier: "master" as UserTier,
    description: "User with push notification subscription",
    features: {
      hasTradingSession: true,
      hasNotifications: true,
      isVerified: true,
    },
  },
  withoutSubscription: {
    email: "e2e.notif.unsubscribed@klarpakke.test",
    password: "TestPassword123!",
    displayName: "E2E Unsubscribed User",
    tier: "bachelor" as UserTier,
    description: "User without push notification subscription",
    features: {
      hasTradingSession: true,
      hasNotifications: false,
      isVerified: true,
    },
  },
};

/**
 * Legacy test users (for backward compatibility)
 */
export const LEGACY_TEST_USERS = [
  {
    email: "klarpakke.test+playwright@gmail.com",
    password: "bilglass123",
    displayName: "Test User A",
  },
  {
    email: "klarpakke.test+b@gmail.com",
    password: "bilglass123",
    displayName: "Test User B",
  },
];

/**
 * Get test user by type and identifier
 */
/* eslint-disable no-redeclare */
export function getTestUser(type: "primary", identifier?: never): TestUser;
export function getTestUser(type: "tier", tier: UserTier): TestUser;
export function getTestUser(
  type: "trading",
  variant: "withSession" | "withoutSession" | "withTradeHistory"
): TestUser;
export function getTestUser(
  type: "notifications",
  variant: "withSubscription" | "withoutSubscription"
): TestUser;
export function getTestUser(
  type: UserType,
  identifier?: string
): TestUser | undefined {
  switch (type) {
    case "primary":
      return PRIMARY_TEST_USER;
    case "tier":
      return identifier ? TIER_TEST_USERS[identifier as UserTier] : undefined;
    case "trading":
      return identifier
        ? TRADING_TEST_USERS[identifier as keyof typeof TRADING_TEST_USERS]
        : undefined;
    case "notifications":
      return identifier
        ? NOTIFICATION_TEST_USERS[identifier as keyof typeof NOTIFICATION_TEST_USERS]
        : undefined;
    default:
      return undefined;
  }
}

/**
 * All test users for provisioning
 */
export const ALL_TEST_USERS: TestUser[] = [
  PRIMARY_TEST_USER,
  ...Object.values(TIER_TEST_USERS),
  ...Object.values(TRADING_TEST_USERS),
  ...Object.values(NOTIFICATION_TEST_USERS),
];

/**
 * Get credentials from environment variables
 */
export function getEnvCredentials(): { email: string; password: string } | null {
  const email =
    process.env.E2E_USER_EMAIL || process.env.TEST_USER_EMAIL;
  const password =
    process.env.E2E_USER_PASSWORD || process.env.TEST_USER_PASSWORD;

  if (email && password) {
    return { email, password };
  }

  return null;
}

/**
 * Get primary test user (fallback to env credentials)
 */
export function getPrimaryTestUser(): TestUser {
  const envCreds = getEnvCredentials();
  
  if (envCreds) {
    return {
      ...PRIMARY_TEST_USER,
      email: envCreds.email,
      password: envCreds.password,
    };
  }

  return PRIMARY_TEST_USER;
}
