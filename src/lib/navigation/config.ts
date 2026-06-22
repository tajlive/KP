/**
 * Sentral navigasjonskonfigurasjon for Klarpakke
 * 
 * Brukes av:
 * - BottomTabs.tsx (mobil)
 * - TopNav.tsx (desktop)
 * - DashboardSidebar.tsx (dashboard)
 */

export type NavRole = 'guest' | 'auth' | 'admin';

export interface NavItem {
  key: string;
  href: string;
  labelKey: string;
  icon?: string;
  roles: NavRole[];
  children?: NavItem[];
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

// Hovednavigasjon for autentiserte brukere — fire kjerneflyter
export const AUTH_NAV_CONFIG: NavItem[] = [
  { 
    key: 'portfolio', 
    href: '/dashboard/portfolio', 
    labelKey: 'dashboard.sidebar.portfolio', 
    icon: 'PieChart',
    roles: ['auth'] 
  },
  { 
    key: 'market', 
    href: '/marked', 
    labelKey: 'navigation.market', 
    icon: 'Globe',
    roles: ['auth'] 
  },
  { 
    key: 'trade', 
    href: '/handel', 
    labelKey: 'dashboard.sidebar.trade', 
    icon: 'TrendingUp',
    roles: ['auth'] 
  },
  { 
    key: 'account', 
    href: '/profile', 
    labelKey: 'navigation.account', 
    icon: 'User',
    roles: ['auth'] 
  },
  // Sekundære flyter beholdes i side-/top-navigasjon
  { 
    key: 'home', 
    href: '/dashboard', 
    labelKey: 'dashboard.sidebar.home', 
    icon: 'Home',
    roles: ['auth'] 
  },
  { 
    key: 'autoTrade', 
    href: '/dashboard/auto-handel', 
    labelKey: 'dashboard.sidebar.autoTrade', 
    icon: 'Bot',
    roles: ['auth'] 
  },
  { 
    key: 'history', 
    href: '/dashboard/historikk', 
    labelKey: 'dashboard.sidebar.history', 
    icon: 'History',
    roles: ['auth'] 
  },
  { 
    key: 'courses', 
    href: '/kurs', 
    labelKey: 'navigation.courses', 
    icon: 'BookOpen',
    roles: ['auth'] 
  },
];

// Navigasjon for gjester (ikke innlogget)
export const GUEST_NAV_CONFIG: NavItem[] = [
  { 
    key: 'home', 
    href: '/', 
    labelKey: 'navigation.home', 
    roles: ['guest'] 
  },
  { 
    key: 'courses', 
    href: '/kurs', 
    labelKey: 'navigation.courses', 
    icon: 'BookOpen',
    roles: ['guest'] 
  },
  { 
    key: 'pricing', 
    href: '/priser', 
    labelKey: 'navigation.pricing', 
    roles: ['guest'] 
  },
  { 
    key: 'login', 
    href: '/login', 
    labelKey: 'navigation.login', 
    roles: ['guest'] 
  },
];

// Mobil-bottom-tabs — fire kjerneflyter
// Layout: portfolio | market | trade | account
export const MOBILE_BOTTOM_TABS: NavItem[] = [
  {
    key: 'portfolio',
    href: '/dashboard/portfolio',
    labelKey: 'navigation.portfolio',
    icon: 'PieChart',
    roles: ['auth'],
    mobileOnly: true,
  },
  {
    key: 'market',
    href: '/marked',
    labelKey: 'navigation.market',
    icon: 'Globe',
    roles: ['auth'],
    mobileOnly: true,
  },
  {
    key: 'trade',
    href: '/handel',
    labelKey: 'navigation.trade',
    icon: 'TrendingUp',
    roles: ['auth'],
    mobileOnly: true,
  },
  { 
    key: 'account', 
    href: '/profile', 
    labelKey: 'navigation.account', 
    icon: 'User',
    roles: ['auth'],
    mobileOnly: true,
  },
];

// Admin-navigasjon
export const ADMIN_NAV_CONFIG: NavItem[] = [
  { 
    key: 'adminDashboard', 
    href: '/admin', 
    labelKey: 'admin.nav.dashboard', 
    icon: 'Shield',
    roles: ['admin'] 
  },
  { 
    key: 'adminUsers', 
    href: '/admin/users', 
    labelKey: 'admin.nav.users', 
    icon: 'Users',
    roles: ['admin'] 
  },
  { 
    key: 'adminCampaign', 
    href: '/admin/campaign', 
    labelKey: 'admin.nav.campaign', 
    icon: 'Megaphone',
    roles: ['admin'] 
  },
];

// Hjelpefunksjon for å filtrere nav etter rolle
export function getNavByRole(role: NavRole): NavItem[] {
  switch (role) {
    case 'admin':
      return [...AUTH_NAV_CONFIG, ...ADMIN_NAV_CONFIG];
    case 'auth':
      return AUTH_NAV_CONFIG;
    case 'guest':
    default:
      return GUEST_NAV_CONFIG;
  }
}

// Hjelpefunksjon for å hente mobil-tabs
export function getMobileTabs(role: NavRole): NavItem[] {
  if (role === 'guest') return [];
  return MOBILE_BOTTOM_TABS.filter(item => item.roles.includes(role));
}
