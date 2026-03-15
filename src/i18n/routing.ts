import { defineRouting } from 'next-intl/routing'
import { createNavigation } from 'next-intl/navigation'

export const routing = defineRouting({
  locales: ['no', 'en'],
  defaultLocale: 'no',
  // Slik at klarpakke.no alltid lander på /no (ikke /en fra Accept-Language/cookie)
  localeDetection: false,
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
