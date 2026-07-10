import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Introduksjon til krypto",
  description:
    "Lær det grunnleggende om kryptovaluta og blockchain i Klarpakkes nybegynnerkurs. Perfekt for deg som vil forstå bitcoin, kryptohandel og hvordan markedet fungerer.",
  openGraph: {
    title: "Introduksjon til krypto | Klarpakke — Norges krypto-skole",
    description:
      "Lær det grunnleggende om kryptovaluta og blockchain i Klarpakkes nybegynnerkurs.",
  },
};

export default function LeksjonPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Introduksjon til krypto</h1>
      <p className="text-muted-foreground">Dette innholdet er under utvikling. Kom tilbake senere!</p>
    </div>
  );
}
