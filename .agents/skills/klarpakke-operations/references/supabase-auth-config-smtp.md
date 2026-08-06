# Supabase auth-config via Management API (SMTP + mailer_autoconfirm)

Prod-auth-konfig leses/skrives via Management API — ikke manuelt i dashboard.

## Lese config

```bash
TOKEN=$(grep SUPABASE_ACCESS_TOKEN ~/.zshrc | sed 's/.*=//' | tr -d '"'"'"' ')
curl -s "https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/config/auth" \
  -H "Authorization: Bearer $TOKEN" -o /tmp/authconf.json
```

Nokkel-felter: `mailer_autoconfirm` (true = innlogging uten e-postbekreftelse —
sikkerhetsavvik i prod), `smtp_host`, `smtp_port`, `smtp_user`, `smtp_admin_email`,
`smtp_sender_name`.

## Skrive config (SMTP via Resend + autoconfirm AV)

```bash
KEY=$(grep "^RESEND_API_KEY" .env.local | sed 's/.*=//' | tr -d '"'"'"' ')
python3 -c "import json; print(json.dumps({
  'smtp_host': 'smtp.resend.com', 'smtp_port': '465',   # STRENGER, ikke tall!
  'smtp_user': 'resend', 'smtp_pass': '$KEY',
  'smtp_admin_email': 'noreply@klarpakke.no', 'smtp_sender_name': 'Klarpakke',
  'mailer_autoconfirm': False}))" > /tmp/auth-patch.json
curl -s -X PATCH "https://api.supabase.com/v1/projects/pskhryjzkobytnfwucrb/config/auth" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d @/tmp/auth-patch.json
```

## FALLGRUVER

1. **`smtp_port` MA vaere streng** (`"465"`, ikke `465`). Med tall svarer API-et
   HTTP 400 `smtp_port: Invalid input: expected string, received number` — og INGENTING
   i payloaden applyes (hele PATCH-en avvises atomisk). Verifiser ALLTID med GET etter PATCH;
   en PATCH som ikke slo igjennom ser fin ut hvis du ikke leser hele respons-bodyen.
2. **Aldri skru av `mailer_autoconfirm` uten fungerende SMTP** — nye brukere far da
   aldri bekreftelses-e-post og er last ute. Supabase default e-posttjeneste er
   rate-limitet (fa per time) og IKKE produksjonsdyktig. Rekkefolge: SMTP forst,
   autoconfirm av etterpa.
3. Resend SMTP krever verifisert domene (`GET api.resend.com/domains` → status
   "verified"). Nokkelen i `.env.local` (`RESEND_API_KEY`) var gyldig; en eldre nokkel
   dokumentert i .hermes.md var utlopt — sjekk mot `/domains` for bruk.

## Verifisering ende-til-ende

1. GET config → `mailer_autoconfirm: False`, `smtp_host: smtp.resend.com`.
2. Test-signup: `POST /auth/v1/signup` (anon key) → `confirmed_at: null` +
   `confirmation_sent_at` satt.
3. Levering: `GET https://api.resend.com/emails` → siste rad `last_event: delivered`.
4. Rydd opp: slett test-bruker via GoTrue admin
   `DELETE /auth/v1/admin/users/<id>` (service_role key).

## Bivirkning

E2E/test-flyter som lager brukere via offentlig signup far nå ubekreftede kontoer —
testbrukere ma lages via admin-API med `email_confirm: true`. Brukere opprettet FOR
endringen er allerede bekreftet og pavirkes ikke.
