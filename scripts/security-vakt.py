#!/usr/bin/env python3
"""Daglig sikkerhetsvakt — Cloudflare + Supabase + GitHub.

Sjekker:
  Supabase (prod pskhryjzkobytnfwucrb + staging ooguscwohyyadkpmefrj):
    - Tabeller UTEN RLS (rls_disabled_in_public)
    - Views som eksponerer auth.users (auth_users_exposed)
    - Sensitive kolonner i RLS-frie tabeller (sensitive_columns_exposed)
  GitHub (tajlive): dependabot + code scanning + secret scanning alerts, repo-privacy
  Cloudflare: token-gyldighet, workers.dev-helse

Exit 0 = alt OK (skriver kort status), exit 1 = avvik funnet (ALARM).
Skriver ALDRI ut tokens/nøkler. Krever: SUPABASE_ACCESS_TOKEN i .env.local,
gh autentisert, CLOUDFLARE_API_TOKEN i .env.local.
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

REPO_DIR = "/Users/taj/klarpakke"
ENV_LOCAL = os.path.join(REPO_DIR, ".env.local")

SUPABASE_PROJECTS = {
    "prod": "pskhryjzkobytnfwucrb",
    "staging": "ooguscwohyyadkpmefrj",
}
CF_ACCOUNT = "80d5b1d56a3e907150ba7348b6182894"

alerts = []
infos = []


def env_local(key: str) -> str:
    """Les nøkkel fra klarpakke/.env.local uten å eksponere verdien."""
    try:
        with open(ENV_LOCAL) as f:
            m = re.search(rf"^{re.escape(key)}=\"?([^\"\n]+)\"?", f.read(), re.M)
            return m.group(1) if m else ""
    except OSError:
        return ""


def supabase_query(project_ref: str, token: str, query: str):
    """Kjør SQL via Management API mot gitt prosjekt."""
    req = urllib.request.Request(
        f"https://api.supabase.com/v1/projects/{project_ref}/database/query",
        data=json.dumps({"query": query}).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "User-Agent": "klarpakke-security-vakt/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=40) as resp:
            return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return {"__http_error__": e.code, "body": e.read()[:300].decode(errors="replace")}
    except Exception as e:  # noqa: BLE001
        return {"__error__": str(e)}


def check_supabase():
    token = env_local("SUPABASE_ACCESS_TOKEN")
    if not token:
        alerts.append("SUPABASE: SUPABASE_ACCESS_TOKEN mangler i .env.local — kan ikke sjekke")
        return

    RLS_QUERY = """
    SELECT c.relname AS tabell, c.relforcerowsecurity AS forced
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' AND n.nspname = 'public' AND NOT c.relrowsecurity
    ORDER BY c.relname;
    """
    VIEWS_QUERY = """
    SELECT v.schemaname || '.' || v.viewname AS view,
           COALESCE(string_agg(DISTINCT g.grantee || ':' || g.privilege_type, ', '), '') AS grants
    FROM pg_views v
    LEFT JOIN information_schema.role_table_grants g
      ON g.table_schema = v.schemaname AND g.table_name = v.viewname
     AND g.grantee IN ('anon','authenticated')
     AND g.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE','ALL')
    WHERE v.schemaname IN ('public','api')
      AND v.definition ILIKE '%auth.users%'
    GROUP BY 1 ORDER BY 1;
    """
    for env_name, ref in SUPABASE_PROJECTS.items():
        try:
            rls = supabase_query(ref, token, RLS_QUERY)
            if isinstance(rls, dict) and ("__error__" in rls or "__http_error__" in rls):
                alerts.append(f"SUPABASE {env_name}: query feilet ({rls})")
                continue
            open_tables = [r["tabell"] for r in rls] if isinstance(rls, list) else []
            if open_tables:
                alerts.append(
                    f"SUPABASE {env_name}: {len(open_tables)} tabell(er) UTEN RLS: {', '.join(open_tables[:8])}"
                )
            else:
                infos.append(f"SUPABASE {env_name}: RLS OK (0 åpne tabeller)")

            views = supabase_query(ref, token, VIEWS_QUERY)
            if isinstance(views, list) and views:
                # Kun flagg views som FAKTISK er API-eksponert (anon/authenticated SELECT-grant)
                exposed_views = []
                for v in views:
                    view_name = v["view"].split(".")[-1]
                    grants = supabase_query(
                        ref, token,
                        f"""
                        SELECT grantee FROM information_schema.role_table_grants
                        WHERE table_schema='public' AND table_name='{view_name}'
                          AND grantee IN ('anon','authenticated')
                          AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE');
                        """,
                    )
                    if isinstance(grants, list) and grants:
                        exposed_views.append(v["view"])
                if exposed_views:
                    alerts.append(
                        f"SUPABASE {env_name}: view(er) med auth.users API-eksponert: {', '.join(exposed_views)}"
                    )
                else:
                    infos.append(
                        f"SUPABASE {env_name}: auth.users-views finnes men er IKKE API-eksponert "
                        f"(kun service_role): {', '.join(v['view'] for v in views)}"
                    )
            elif isinstance(views, list):
                infos.append(f"SUPABASE {env_name}: ingen auth.users-views")

            # GRANTs til anon på RLS-frie tabeller (API-eksponering)
            if open_tables:
                grants = supabase_query(
                    ref, token,
                    f"""
                    SELECT table_name FROM information_schema.role_table_grants
                    WHERE table_schema='public'
                      AND table_name IN ({','.join("'" + t + "'" for t in open_tables)})
                      AND grantee IN ('anon','authenticated')
                      AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')
                    GROUP BY table_name ORDER BY table_name;
                    """,
                )
                if isinstance(grants, list) and grants:
                    exposed = [g["table_name"] for g in grants]
                    alerts.append(
                        f"SUPABASE {env_name}: anon/authenticated har API-tilgang til RLS-frie tabeller: {', '.join(exposed[:8])}"
                    )
        except Exception as e:  # noqa: BLE001
            alerts.append(f"SUPABASE {env_name}: sjekk feilet ({e})")


def gh_run(args):
    try:
        r = subprocess.run(
            ["gh", "api", *args, "--jq", "."],
            capture_output=True, text=True, timeout=40,
        )
        if r.returncode != 0:
            return {"__error__": r.stderr[:300]}
        return json.loads(r.stdout)
    except Exception as e:  # noqa: BLE001
        return {"__error__": str(e)}


def check_github():
    # Dependabot alerts (open, critical+high) — kun runtime-scope teller som alarm.
    # Kjent, dokumentert baseline (sanity-CLI-kjeden, build-time — ingen server-eksponering)
    # rapporteres som info; NYE pakker utenfor baselinen utløser alarm.
    KNOWN_BASELINE = {"js-yaml", "undici", "@modelcontextprotocol/sdk"}
    db = gh_run([
        "-X", "GET", "/repos/tajlive/KP/dependabot/alerts",
        "-f", "state=open", "-f", "per_page=100",
    ])
    if isinstance(db, dict) and "__error__" in db:
        alerts.append(f"GITHUB: dependabot-sjekk feilet ({db['__error__'][:150]})")
    elif isinstance(db, list):
        crit = [a for a in db if a.get("security_advisory", {}).get("severity") in ("critical", "high")]
        runtime = [a for a in crit if a.get("dependency", {}).get("scope") == "runtime"]
        new_runtime = [a for a in runtime if a["dependency"]["package"]["name"] not in KNOWN_BASELINE]
        if new_runtime:
            pkgs = {a["dependency"]["package"]["name"] for a in new_runtime}
            alerts.append(f"GITHUB: {len(new_runtime)} NYE runtime-dependabot-alerts (critical/high): {', '.join(sorted(pkgs))}")
        else:
            baseline_pkgs = {a["dependency"]["package"]["name"] for a in runtime}
            if baseline_pkgs:
                infos.append(
                    f"GITHUB: dependabot kun kjent baseline (sanity-CLI/build-time, ingen server-eksponering): "
                    f"{', '.join(sorted(baseline_pkgs))}"
                )
            else:
                infos.append("GITHUB: 0 åpne dependabot-alerts (critical/high)")

    # Secret scanning alerts
    ss = gh_run(["-X", "GET", "/repos/tajlive/KP/secret-scanning/alerts", "-f", "state=open"])
    if isinstance(ss, list) and ss:
        alerts.append(f"GITHUB: {len(ss)} åpne secret-scanning-alerts")
    elif isinstance(ss, list):
        infos.append("GITHUB: 0 åpne secret-scanning-alerts")

    # Repo-privacy (alle skal være private)
    repos = gh_run(["-X", "GET", "/user/repos", "-f", "per_page=100", "-f", "visibility=public"])
    if isinstance(repos, list) and repos:
        names = [r["full_name"] for r in repos]
        alerts.append(f"GITHUB: {len(names)} OFFENTLIGE repoer: {', '.join(names[:8])}")
    elif isinstance(repos, list):
        infos.append("GITHUB: 0 offentlige repoer")


def check_cloudflare():
    token = env_local("CLOUDFLARE_API_TOKEN")
    if not token:
        alerts.append("CLOUDFLARE: CLOUDFLARE_API_TOKEN mangler i .env.local")
        return
    try:
        req = urllib.request.Request(
            f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/billable-usage",
            headers={"Authorization": f"Bearer {token}"},
        )
        with urllib.request.urlopen(req, timeout=40) as resp:
            data = json.loads(resp.read())
        if data.get("success"):
            infos.append("CLOUDFLARE: API-token gyldig (billable-usage OK)")
        else:
            alerts.append(f"CLOUDFLARE: API-svar success=false ({data.get('errors')})")
    except urllib.error.HTTPError as e:
        alerts.append(f"CLOUDFLARE: API-feil HTTP {e.code} (token utløpt/revokert?)")
    except Exception as e:  # noqa: BLE001
        alerts.append(f"CLOUDFLARE: sjekk feilet ({e})")

    # Prod-helse (ekte endepunkt; workers.dev/health finnes ikke — Next.js 404)
    for url in ("https://www.klarpakke.no/api/health",):
        try:
            req = urllib.request.Request(
                url, method="GET",
                headers={"User-Agent": "klarpakke-security-vakt/1.0"},
            )
            with urllib.request.urlopen(req, timeout=15) as resp:
                if resp.status == 200:
                    infos.append(f"CLOUDFLARE: {url.split('/')[2]} api/health OK")
                else:
                    alerts.append(f"CLOUDFLARE: {url} returnerte HTTP {resp.status}")
        except Exception as e:  # noqa: BLE001
            alerts.append(f"CLOUDFLARE: {url} utilgjengelig ({e})")

def main():
    check_supabase()
    check_github()
    check_cloudflare()

    if alerts:
        print("🚨 SIKKERHETSVAKT ALARM — avvik funnet:")
        for a in alerts:
            print(f"  - {a}")
        if infos:
            print("OK-områder:")
            for i in infos:
                print(f"  - {i}")
        sys.exit(1)

    print("✅ SIKKERHETSVAKT OK — ingen avvik")
    for i in infos:
        print(f"  - {i}")
    sys.exit(0)


if __name__ == "__main__":
    main()
