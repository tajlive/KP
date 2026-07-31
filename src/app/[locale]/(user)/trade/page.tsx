import { Metadata } from "next";
import { UnifiedTradeTerminal } from "@/features/trading/UnifiedTradeTerminal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Handel",
  description: "Kjøp og selg krypto — manuelt, med AI-strategi, eller la Pilot styre. 100 000 kr i lekepenger, null risiko.",
};

export default function TradePage() {
  return <UnifiedTradeTerminal />;
}
