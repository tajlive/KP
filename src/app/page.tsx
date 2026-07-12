// Root page — redirect til /no via inline script
// Server component (ingen "use client") = 0 byte bundle-effekt
export default function RootPage() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: "location.href='/no'",
      }}
    />
  );
}
