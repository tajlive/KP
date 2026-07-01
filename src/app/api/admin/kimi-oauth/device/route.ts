import {
  initiateDeviceFlow,
  type KimiDeviceSession,
} from "@/lib/ai/kimi-oauth";
import { verifyAdminAccess } from "@/lib/admin/verify-admin-access";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const auth = await verifyAdminAccess();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const session: KimiDeviceSession = await initiateDeviceFlow();
    return NextResponse.json({
      deviceCode: session.deviceCode,
      userCode: session.userCode,
      verificationUri: session.verificationUri,
      expiresIn: session.expiresIn,
      interval: session.interval,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Device flow failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
