import { permanentRedirect } from "next/navigation";

// Root page — permanent redirect (308) til default locale (no)
export default function RootPage() {
  permanentRedirect("/no");
}
