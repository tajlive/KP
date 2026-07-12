// Root — redirect til /no via inline script (server component, 0 bundle-effekt)
// Middleware støttes ikke fullt ut av OpenNext Cloudflare uten ekstra ruting.
export default function RootPage() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: "location.href='/no'",
      }}
    />
  );
}
