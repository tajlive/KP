



import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'

export const runtime = 'edge';

export const dynamic = 'force-static'

async function VerifyContent({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const t = await getTranslations("auth.verify");
  const params = await searchParams
  const token = params.token

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">{t("title")}</h1>
        {token ? (
          <p>{t("tokenLabel", { token })}</p>
        ) : (
          <p className="text-red-600">{t("noToken")}</p>
        )}
      </div>
    </div>
  )
}

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const t = await getTranslations("common");
  return (
    <Suspense fallback={<div>{t("loading")}</div>}>
      <VerifyContent searchParams={searchParams} />
    </Suspense>
  )
}
