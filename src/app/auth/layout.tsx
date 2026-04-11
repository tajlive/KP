import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Autentisering | Klarpakke",
  description: "Logg inn eller registrer deg på Klarpakke",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="no">
      <body className="antialiased bg-slate-950">
        {children}
      </body>
    </html>
  );
}
