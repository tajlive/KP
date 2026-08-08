/**
 * impact.com API-klient — affiliate/partner-data for Klarpakke.
 *
 * Autentisering: HTTP Basic med (Account SID, Auth Token).
 * Nøkler i .env.local: IMPACT_ACCOUNT_SID, IMPACT_AUTH_TOKEN.
 *
 * Verifiserte endepunkter (Mediapartner-konto, 2026-08-08):
 *   GET /Mediapartners/{SID}/Campaigns   — programmer (børsenes affiliate-programmer)
 *   GET /Mediapartners/{SID}/Actions     — klikk/konverteringer/kommisjoner
 */

const API_BASE = process.env.IMPACT_API_BASE ?? "https://api.impact.com";

function getCredentials(): { sid: string; token: string } | null {
  const sid = process.env.IMPACT_ACCOUNT_SID;
  const token = process.env.IMPACT_AUTH_TOKEN;
  if (!sid || !token) return null;
  return { sid, token };
}

export interface ImpactCampaign {
  Id?: string;
  Name?: string;
  Uri?: string;
  ContractStatus?: string;
  ContractUri?: string;
  CampaignLogoUri?: string;
  PublicTermsUri?: string;
  Countries?: string[];
  CurrencyCode?: string;
  [key: string]: unknown;
}

export interface ImpactAction {
  Id?: string;
  ActionType?: string;
  Status?: string;
  EventDate?: string;
  PendingDate?: string;
  ProcessDate?: string;
  CustomerId?: string;
  ClickId?: string;
  CampaignId?: string;
  MediaPartnerId?: string;
  Amount?: string;
  Payout?: string;
  Currency?: string;
  [key: string]: unknown;
}

interface ImpactPage<T> {
  "@page"?: string;
  "@numpages"?: string;
  "@total"?: string;
  [key: string]: unknown;
}

export class ImpactApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ImpactApiError";
  }
}

async function impactFetch<T>(path: string): Promise<T> {
  const creds = getCredentials();
  if (!creds) {
    throw new ImpactApiError("IMPACT_ACCOUNT_SID / IMPACT_AUTH_TOKEN mangler", 500);
  }

  const url = `${API_BASE}${path}`;
  const auth = btoa(`${creds.sid}:${creds.token}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ImpactApiError(
        `impact.com API error: HTTP ${response.status}`,
        response.status,
      );
    }
    return (await response.json()) as T;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof ImpactApiError) throw error;
    throw new ImpactApiError(
      error instanceof Error ? error.message : "Unknown impact.com error",
      502,
    );
  }
}

/** Henter programmer (børsenes affiliate-programmer) partneren har/søker på. */
export async function getImpactCampaigns(): Promise<ImpactCampaign[]> {
  const page = await impactFetch<ImpactPage<ImpactCampaign[]>>(
    `/Mediapartners/${getCredentials()?.sid}/Campaigns?PageSize=100`,
  );
  const campaigns = (page.Campaigns as ImpactCampaign[] | undefined) ?? [];
  return campaigns;
}

/** Henter siste aktivitet (klikk/konverteringer) med opsjonell statusfiltrering. */
export async function getImpactActions(
  opts: { limit?: number; status?: string } = {},
): Promise<ImpactAction[]> {
  const { limit = 50, status } = opts;
  const creds = getCredentials();
  if (!creds) return [];

  let path = `/Mediapartners/${creds.sid}/Actions?PageSize=${limit}`;
  if (status) {
    path += `&Status=${encodeURIComponent(status)}`;
  }

  const page = await impactFetch<ImpactPage<ImpactAction[]>>(path);
  return (page.Actions as ImpactAction[] | undefined) ?? [];
}
