"use client";

import { isEmailInAdminFallbackList } from "@/lib/admin/admin-allowlist.shared";
import { BRAND } from "@/lib/design/tokens";
import { createClient } from "@/lib/utils";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientAdminV2() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "no";
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/${locale}/innlogging?redirect=/${locale}/admin/v2`);
        return;
      }

      if (isEmailInAdminFallbackList(user.email)) {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      // Sjekk profiles
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role === "admin") {
        setIsAdmin(true);
        setLoading(false);
        return;
      }

      setError("Du har ikke admin-tilgang");
      setLoading(false);
    } catch (_err) {
      setError("Kunne ikke verifisere admin-tilgang");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#0052FF] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Ingen tilgang</h1>
          <p className="text-slate-400 mb-6">{error}</p>
          <Link
            href={`/${locale}/innlogging?redirect=/${locale}/admin/v2`}
            className={`inline-block ${BRAND.primary} px-6 py-3 rounded-lg font-semibold`}
          >
            Logg inn på nytt
          </Link>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <iframe
      src="/admin-dashboard.html"
      className="w-full h-screen border-0"
      title="Admin Dashboard"
    />
  );
}
