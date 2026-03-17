// With localePrefix: 'as-needed', next-intl serves default locale (no) at /;
// this root page is not hit for / — [locale]/page.tsx handles it via rewrite.
export default function RootPage() {
  return null
}
