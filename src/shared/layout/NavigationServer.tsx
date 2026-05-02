import { client } from '@/lib/sanity/client'
import { navigationQuery } from '@/lib/sanity/queries'
import { MarketingNavigation } from './MarketingNavigation'

export interface NavLink {
  label: string
  path: string
  order: number
}

export interface NavigationData {
  loggedOutLinks: NavLink[]
  loggedInLinks: NavLink[]
}

export async function NavigationServer() {
  let navData: NavigationData = {
    loggedOutLinks: [
      { label: 'Lær', path: '/kurs', order: 0 },
      { label: 'Trade', path: '/paper-trading', order: 1 },
      { label: 'Bots', path: '/auto-trading', order: 2 },
      { label: 'Priser', path: '/priser', order: 3 },
    ],
    loggedInLinks: [
      { label: 'Dashboard', path: '/dashboard', order: 0 },
      { label: 'Portefølje', path: '/dashboard/portfolio', order: 1 },
      { label: 'Trade', path: '/dashboard/trade', order: 2 },
      { label: 'Bots', path: '/dashboard/auto-trade', order: 3 },
      { label: 'Lær', path: '/kurs', order: 4 },
      { label: 'Priser', path: '/priser', order: 5 },
    ],
  }

  try {
    const result = await client.fetch(navigationQuery)
    if (result) {
      navData = {
        loggedOutLinks: result.loggedOutLinks || navData.loggedOutLinks,
        loggedInLinks: result.loggedInLinks || navData.loggedInLinks,
      }
    }
  } catch {
    // Fallback til hardkodede lenker hvis Sanity ikke er tilgjengelig
  }

  return <MarketingNavigation navData={navData} />
}
