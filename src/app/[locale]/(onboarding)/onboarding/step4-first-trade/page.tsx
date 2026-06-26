export const dynamic = "force-dynamic";

interface OnboardingStep4FirstTradeProps {
  params: Promise<{ locale: string }>;
}

export default async function OnboardingStep4FirstTrade({
  params,
}: OnboardingStep4FirstTradeProps) {
  const { locale } = await params;
  const title = locale === "no" ? "Første trade" : "First trade";

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div
        className="h-8 w-8 animate-spin rounded-full border-b-2"
        style={{ borderColor: "var(--kp-ai)" }}
      />
      <h1
        className="text-xl font-semibold"
        style={{ color: "var(--kp-text-primary)" }}
      >
        {title}
      </h1>
    </div>
  );
}
