import { redirect } from "next/navigation";

// next-intl serves default locale (no) at / via rewrite,
// but sometimes this root page IS hit (cache invalidation, etc.)
export default function RootPage() {
  redirect("/no");
}
