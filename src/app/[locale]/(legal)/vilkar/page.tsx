import { getTranslations } from "next-intl/server";
import { LegalPageShell, generateLegalMetadata } from "@/shared/ui/marketing";

const SUPPORT_EMAIL = "post@klarpakke.no";

export const runtime = "nodejs";

export const revalidate = 86400; // 24 hours

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return generateLegalMetadata({
    locale,
    namespace: "legal.terms",
    titleKey: "title",
    descriptionKey: "description",
    pathname: "/vilkar",
  });
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal.terms" });

  return (
    <LegalPageShell>
      <TermsContent t={t} />
    </LegalPageShell>
  );
}

type TermsTranslations = Awaited<ReturnType<typeof getTranslations>>;

function TermsContent({ t }: { t: TermsTranslations }) {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold mb-8">{t("title")}</h1>

      <div className="prose prose-blue max-w-none">
        <p className="text-gray-500 mb-6">{t("lastUpdated")}</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t("sections.1.title")}
          </h2>
          <p className="text-gray-600">{t("sections.1.content")}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t("sections.2.title")}
          </h2>
          <p className="text-gray-600">
            {t("sections.2.content")}
            <strong className="text-gray-900 ml-1">
              {t("sections.2.bold")}
            </strong>
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t("sections.3.title")}
          </h2>
          <p className="text-gray-600 mb-4">{t("sections.3.content")}</p>
          <ul className="list-disc pl-6 text-gray-600 space-y-2">
            {(t.raw("sections.3.list") as string[]).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t("sections.4.title")}
          </h2>
          <p className="text-gray-600">{t("sections.4.content")}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t("sections.5.title")}
          </h2>
          <p className="text-gray-600">{t("sections.5.content")}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t("sections.6.title")}
          </h2>
          <p className="text-gray-600">{t("sections.6.content")}</p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            {t("sections.7.title")}
          </h2>
          <p className="text-gray-600">
            {t("sections.7.content")}{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-blue-600 hover:text-blue-500"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}
