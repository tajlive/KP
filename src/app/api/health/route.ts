import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      version: process.env.npm_package_version ?? '1.0.0',
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    },
    {
      status: 200,
      headers: { 'Cache-Control': 'no-store, no-cache' },
    }
  )
}
// Deploy trigger
