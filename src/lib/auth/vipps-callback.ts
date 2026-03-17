/**
 * Vipps Login callback: exchange code for tokens, fetch userinfo, create or link Supabase user, return magic link.
 */

import { createClient } from "@/lib/supabase/server";
import { getCallbackUrl } from "./config";

const VIPPS_PKCE_COOKIE = "vipps_pkce_verifier";
const VIPPS_STATE_PREFIX = "vipps_";

export interface VippsCallbackParams {
  code: string;
  state: string;
  codeVerifier: string | null;
  locale: string;
}

export interface VippsCallbackResult {
  redirectUrl: string;
  error?: string;
}

export async function handleVippsCallback(
  params: VippsCallbackParams
): Promise<VippsCallbackResult> {
  const { code, state, codeVerifier, locale } = params;

  if (!state.startsWith(VIPPS_STATE_PREFIX)) {
    return { redirectUrl: `/${locale}/innlogging?error=invalid_state` };
  }

  let nextPath = `/${locale}/dashboard`;
  try {
    let b64 = state.slice(VIPPS_STATE_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const statePayload = JSON.parse(
      Buffer.from(b64, "base64").toString("utf8")
    ) as { next?: string };
    if (statePayload.next && typeof statePayload.next === "string") {
      nextPath = statePayload.next.startsWith("/")
        ? statePayload.next
        : `/${locale}${statePayload.next}`;
    }
  } catch {
    /* use default nextPath */
  }

  if (!codeVerifier) {
    return {
      redirectUrl: `/${locale}/innlogging?error=vipps_missing_verifier`,
    };
  }

  const clientId = process.env.VIPPS_CLIENT_ID;
  const clientSecret = process.env.VIPPS_CLIENT_SECRET;
  const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
  const msn = process.env.VIPPS_MERCHANT_SERIAL_NUMBER;
  const baseUrl = process.env.VIPPS_BASE_URL || "https://api.vipps.no";
  const redirectUri = getCallbackUrl(locale);

  if (!clientId || !clientSecret) {
    return {
      redirectUrl: `/${locale}/innlogging?error=vipps_config`,
    };
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString("base64");
  const tokenRes = await fetch(`${baseUrl}/access-management-1.0/access/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth}`,
      ...(msn && { "Merchant-Serial-Number": msn }),
      ...(subscriptionKey && { "Ocp-Apim-Subscription-Key": subscriptionKey }),
      "Vipps-System-Name": "klarpakke",
      "Vipps-System-Version": "1.0",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[Vipps] Token exchange failed:", tokenRes.status, errText);
    return {
      redirectUrl: `/${locale}/innlogging?error=exchange_failed&detail=${encodeURIComponent(errText.slice(0, 100))}`,
    };
  }

  const tokens = (await tokenRes.json()) as {
    access_token?: string;
    id_token?: string;
  };

  if (!tokens.access_token) {
    return {
      redirectUrl: `/${locale}/innlogging?error=exchange_failed`,
    };
  }

  const userinfoRes = await fetch(`${baseUrl}/vipps-userinfo-api/userinfo/`, {
    headers: {
      Authorization: `Bearer ${tokens.access_token}`,
      ...(msn && { "Merchant-Serial-Number": msn }),
      ...(subscriptionKey && { "Ocp-Apim-Subscription-Key": subscriptionKey }),
      "Vipps-System-Name": "klarpakke",
      "Vipps-System-Version": "1.0",
    },
  });

  if (!userinfoRes.ok) {
    const errText = await userinfoRes.text();
    console.error("[Vipps] Userinfo failed:", userinfoRes.status, errText);
    return {
      redirectUrl: `/${locale}/innlogging?error=vipps_userinfo`,
    };
  }

  const userinfo = (await userinfoRes.json()) as {
    sub?: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    phone_number?: string;
    email?: string;
  };

  const vippsSub = userinfo.sub ?? "";
  const email =
    userinfo.email && userinfo.email.trim()
      ? userinfo.email.trim()
      : `vipps_${vippsSub.replace(/[^a-zA-Z0-9-]/g, "_")}@vipps.klarpakke.no`;
  const fullName =
    userinfo.name ||
    [userinfo.given_name, userinfo.family_name].filter(Boolean).join(" ") ||
    "Vipps-bruker";

  const supabase = createClient();

  let magicLink: string;

  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        vipps_sub: vippsSub,
        phone_number: userinfo.phone_number ?? null,
      },
    });

  if (createError) {
    const isExisting = /already registered|already exists|duplicate/i.test(createError.message);
    if (isExisting) {
      const { data: linkData, error: linkError } =
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
      if (linkError || !linkData?.properties?.action_link) {
        console.error("[Vipps] generateLink error:", linkError);
        return { redirectUrl: `/${locale}/innlogging?error=auth_failed` };
      }
      magicLink = linkData.properties.action_link;
    } else {
      console.error("[Vipps] createUser error:", createError);
      return {
        redirectUrl: `/${locale}/innlogging?error=auth_failed&detail=${encodeURIComponent(createError.message)}`,
      };
    }
  } else {
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: createData!.user.email!,
      });
    if (linkError || !linkData?.properties?.action_link) {
      console.error("[Vipps] generateLink after create error:", linkError);
      return { redirectUrl: `/${locale}/innlogging?error=auth_failed` };
    }
    magicLink = linkData.properties.action_link;
  }

  return {
    redirectUrl: magicLink.includes("next=")
      ? magicLink
      : `${magicLink}${magicLink.includes("?") ? "&" : "?"}next=${encodeURIComponent(nextPath)}`,
  };
}
