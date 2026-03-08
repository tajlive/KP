import { createClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/lib/utils/error";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  try {
    const supabase = (await createClient()) as any;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ADMIN_EMAILS = ["tomarnejensen@gmail.com", "admin@klarpakke.no"];
    const isWhitelisted = ADMIN_EMAILS.includes(user.email || "");

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!isWhitelisted && profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { to, subject, html } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const { data, error } = await resend.emails.send({
      from: "Klarpakke <post@klarpakke.no>",
      to: [to],
      subject: subject,
      html: html,
    });

    if (error) {
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Send email error:", getErrorMessage(error));
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
