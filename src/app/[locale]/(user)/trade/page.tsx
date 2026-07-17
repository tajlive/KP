import { Metadata } from "next";
import { UnifiedTradeTerminal } from "@/features/trading/UnifiedTradeTerminal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trade | Klarpakke",
  description: "Kjøp og selg krypto — manuelt, automatisk eller med AI.",
};

export default function TradePage() {
  return <UnifiedTradeTerminal />;
}
