/**
 * Stable selectors for E2E testing
 * All selectors use data-testid or semantic roles where labels are stable
 */

export const Selectors = {
  // Navigation
  nav: {
    dashboardLink: '[data-testid="nav-dashboard"]',
    portfolioLink: '[data-testid="nav-portfolio"]',
    tradingLink: '[data-testid="nav-trading"]',
    leaderboardLink: '[data-testid="nav-leaderboard"]',
    logoutButton: '[data-testid="logout-button"]',
  },
  
  // Auth
  auth: {
    googleButton: '[data-provider="google"], button:has([alt*="Google"])',
    microsoftButton: '[data-provider="azure"], button:has([alt*="Microsoft"])',
    loginForm: '[data-testid="login-form"]',
    userMenu: '[data-testid="user-menu"]',
  },
  
  // Dashboard
  dashboard: {
    root: '[data-testid="dashboard-root"]',
    portfolioCard: '[data-testid="portfolio-card"]',
    pulseWidget: '[data-testid="pulse-widget"]',
    botStatusWidget: '[data-testid="bot-status-widget"]',
    balanceDisplay: '[data-testid="balance-display"]',
  },
  
  // Paper Trading
  paperTrading: {
    startButton: '[data-testid="start-paper-trading"]',
    balanceWidget: '[data-testid="paper-balance"]',
    tradeForm: '[data-testid="trade-form"]',
    amountInput: '[data-testid="trade-amount"]',
    placeOrderButton: '[data-testid="place-order-btn"]',
    tradeHistory: '[data-testid="trade-history"]',
  },
  
  // Leaderboard
  leaderboard: {
    table: '[data-testid="leaderboard-table"]',
    entry: '[data-testid="leaderboard-entry"]',
    filterPeriod: '[data-testid="leaderboard-filter-period"]',
  },
  
  // Common
  common: {
    loadingSpinner: '[data-testid="loading-spinner"]',
    errorMessage: '[data-testid="error-message"]',
    toastNotification: '[role="status"], [role="alert"]',
    submitButton: 'button[type="submit"]',
  }
} as const;

export default Selectors;
