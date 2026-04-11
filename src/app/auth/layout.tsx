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
  // Auth layout skal IKKE ha <html> eller <body> - det er root layout sitt ansvar
  return <>{children}</>;
}
