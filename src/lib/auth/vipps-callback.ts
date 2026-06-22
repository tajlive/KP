/**
 * Vipps Login callback: exchange code for tokens, fetch userinfo,
 * create or link Supabase user, return sign-in redirect.
 */

import { createClient } from "@/lib/supabase/server";
import { getCanonicalAppOrigin } from "./config";
import { sanitizePostAuthRedirect } from "./sanitize-redirect";

export interface VippsCallbackParams {
  code: string;
  state: string;
  codeVerifier: string;
  locale: string;
  next?: string;
}

export interface VippsCallbackResult {
  redirectUrl: string;
  error?: string;
}

function appendNext(magicLink: string, nextPath: string): string {
  return magicLink.includes("next=")
    ? magicLink
    : `${magicLink}${magicLink.includes("?") ? "&" : "?"}next=${encodeURIComponent(nextPath)}`;
}

export async function handleVippsCallback(
  params: VippsCallbackParams,
): Promise<VippsCallbackResult> {
  const { code, codeVerifier, locale, next } = params;

  const nextPath = sanitizePostAuthRedirect(next, locale);

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
  // Must match the redirect_uri sent to Vipps in /api/auth/vipps-url exactly.
  const redirectUri = `${getCanonicalAppOrigin()}/api/auth/vipps-callback`;

  if (!clientId || !clientSecret) {
    return {
      redirectUrl: `/${locale}/innlogging?error=vipps_config`,
    };
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`, "utf8").toString(
    "base64",
  );
  const tokenRes = await fetch(
    `${baseUrl}/access-management-1.0/access/oauth2/token`,
    {
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
    },
  );

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

  const userinfoRes = await fetch(
    `${baseUrl}/vipps-userinfo-api/userinfo/`,
    {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        ...(msn && { "Merchant-Serial-Number": msn }),
        ...(subscriptionKey && { "Ocp-Apim-Subscription-Key": subscriptionKey }),
        "Vipps-System-Name": "klarpakke",
        "Vipps-System-Version": "1.0",
      },
    },
  );

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
    email_verified?: boolean;
  };

  const vippsSub = userinfo.sub ?? "";
  const email = userinfo.email?.trim() ?? "";
  const fullName =
    userinfo.name ||
    [userinfo.given_name, userinfo.family_name].filter(Boolean).join(" ") ||
    "Vipps-bruker";

  if (!vippsSub) {
    return {
      redirectUrl: `/${locale}/innlogging?error=vipps_userinfo`,
    };
  }

  if (userinfo.email_verified !== true || !email) {
    return {
      redirectUrl: `/${locale}/innlogging?error=vipps_email_not_verified`,
    };
  }

  const supabase = createClient();

  const { data: identity, error: identityError } = await supabase
    .from("external_auth_identities")
    .select("user_id, provider_email")
    .eq("provider", "vipps")
    .eq("provider_subject", vippsSub)
    .maybeSingle();

  if (identityError) {
    console.error("[Vipps] identity lookup error:", identityError);
    return { redirectUrl: `/${locale}/innlogging?error=auth_failed` };
  }

  // Existing user linked to this Vipps account.
  if (identity) {
    const { data: linkedUserData, error: linkedUserError } =
      await supabase.auth.admin.getUserById(identity.user_id);
    const targetEmail = linkedUserData?.user?.email;
    if (linkedUserError) {
      console.error("[Vipps] linked user lookup error:", linkedUserError);
    }
    if (!targetEmail) {
      return { redirectUrl: `/${locale}/innlogging?error=auth_failed` };
    }
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: targetEmail,
      });
    if (linkError || !linkData?.properties?.action_link) {
      console.error("[Vipps] generateLink error for linked user:", linkError);
      return { redirectUrl: `/${locale}/innlogging?error=auth_failed` };
    }
    return { redirectUrl: appendNext(linkData.properties.action_link, nextPath) };
  }

  // Brand-new user: create account and fall back to magic-link bridge.
  console.warn(
    "[Vipps] Magic-link bridge used for new Vipps user. This fallback is deprecated.",
  );

  const { data: createData, error: createError } =
    await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        phone_number: userinfo.phone_number ?? null,
      },
    });

  if (createError) {
    if (/already registered|already exists|duplicate/i.test(createError.message)) {
      return {
        redirectUrl: `/${locale}/innlogging?error=vipps_email_exists`,
      };
    }
    console.error("[Vipps] createUser error:", createError);
    return {
      redirectUrl: `/${locale}/innlogging?error=auth_failed&detail=${encodeURIComponent(createError.message)}`,
    };
  }

  const newEmail = createData?.user?.email;
  if (!newEmail) {
    return { redirectUrl: `/${locale}/innlogging?error=auth_failed` };
  }

  const { error: identityInsertError } = await supabase
    .from("external_auth_identities")
    .insert({
      provider: "vipps",
      provider_subject: vippsSub,
      user_id: createData.user.id,
      provider_email: email,
    });

  if (identityInsertError) {
    console.error("[Vipps] identity insert error:", identityInsertError);
    await supabase.auth.admin.deleteUser(createData.user.id);
    return {
      redirectUrl: `/${locale}/innlogging?error=vipps_sub_linked_other`,
    };
  }

  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: newEmail,
    });
  if (linkError || !linkData?.properties?.action_link) {
    console.error("[Vipps] generateLink after create error:", linkError);
    return { redirectUrl: `/${locale}/innlogging?error=auth_failed` };
  }

  return { redirectUrl: appendNext(linkData.properties.action_link, nextPath) };
}
