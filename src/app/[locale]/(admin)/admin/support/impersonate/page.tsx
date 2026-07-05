import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import ImpersonationForm from "@/components/admin/support/ImpersonationForm";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "Se som bruker — Admin",
};

export default async function ImpersonatePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { locale } = await params;
  const { email } = await searchParams;
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <ImpersonatePageClient initialEmail={email} />
    </NextIntlClientProvider>
  );
}

function ImpersonatePageClient({ initialEmail }: { initialEmail?: string }) {
  const t = useTranslations("admin.impersonation");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">{t("title")}</h1>
        <p className="text-slate-400">{t("description")}</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium text-amber-400">{t("warningTitle")}</p>
          <p className="text-sm text-amber-300/80">{t("warningText")}</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <ImpersonationForm
          initialEmail={initialEmail}
          redirectPath="/no/handel"
        />
      </div>
    </div>
  );
}
