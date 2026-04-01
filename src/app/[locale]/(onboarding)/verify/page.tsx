



import { Suspense } from 'react'

export const dynamic = 'force-static'

async function VerifyContent({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams
  const token = params.token

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">Verifiserer e-post...</h1>
        {token ? (
          <p>Token: {token}</p>
        ) : (
          <p className="text-red-600">Ingen verifikasjonstoken funnet</p>
        )}
      </div>
    </div>
  )
}

export default function VerifyPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  return (
    <Suspense fallback={<div>Laster...</div>}>
      <VerifyContent searchParams={searchParams} />
    </Suspense>
  )
}
