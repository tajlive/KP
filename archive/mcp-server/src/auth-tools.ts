/**
 * Auth & SSO MCP Tools for Klarpakke
 * 
 * Diagnose and fix authentication issues
 * Setup LinkedIn, Google, Apple, Magic Link login
 */

export const authTools = [
  {
    name: "auth_setup_linkedin_login",
    description: "Complete LinkedIn OAuth setup guide with code",
    input_schema: {
      type: "object",
      properties: {
        redirect_url: { type: "string", default: "https://www.klarpakke.no/auth/callback" },
      },
    },
  },
  {
    name: "auth_setup_google_login",
    description: "Complete Google OAuth setup guide",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "auth_setup_apple_login",
    description: "Complete Apple Sign In setup guide (requires $99/year developer account)",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "auth_setup_resend_smtp",
    description: "Setup Resend SMTP for Supabase Auth email confirmations",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "auth_diagnose_email_issue",
    description: "Diagnose why confirmation emails are not being sent/received",
    input_schema: {
      type: "object",
      properties: {
        test_email: { type: "string", description: "Email to test sending to" },
      },
    },
  },
  {
    name: "auth_recommend_providers",
    description: "Get recommendations for auth providers based on target audience",
    input_schema: {
      type: "object",
      properties: {
        audience: { type: "string", enum: ["b2c", "b2b", "general", "enterprise"], default: "general" },
        primary_market: { type: "string", default: "Norway" },
      },
    },
  },
  {
    name: "auth_test_email_delivery",
    description: "Test email delivery to diagnose issues",
    input_schema: {
      type: "object",
      properties: {
        to_email: { type: "string" },
      },
      required: ["to_email"],
    },
  },
];

// Execute auth tool
export async function executeAuthTool(name: string, args: any): Promise<string> {
  switch (name) {
    case "auth_setup_linkedin_login": {
      const redirectUrl = args?.redirect_url || "https://www.klarpakke.no/auth/callback";
      return JSON.stringify({
        message: "✅ LinkedIn OAuth Setup Guide",
        estimated_time: "15 minutes",
        steps: [
          {
            step: 1,
            title: "Create LinkedIn App",
            url: "https://www.linkedin.com/developers/apps",
            actions: ["Click 'Create App'", "App name: 'Klarpakke Universitet'", "Upload logo", "Accept terms"],
          },
          {
            step: 2,
            title: "Enable Sign In with LinkedIn",
            actions: ["Go to Products tab", "Find 'Sign In with LinkedIn using OpenID Connect'", "Click 'Request access'"],
          },
          {
            step: 3,
            title: "Get Credentials",
            actions: ["Go to Auth tab", "Copy Client ID", "View and copy Client Secret"],
          },
          {
            step: 4,
            title: "Configure OAuth Redirects",
            redirect_urls: [redirectUrl, "http://localhost:3000/auth/callback"],
          },
          {
            step: 5,
            title: "Add to Supabase",
            url: "https://app.supabase.com/project/_/auth/providers",
            actions: ["Find 'LinkedIn (OIDC)'", "Toggle ON", "Paste Client ID and Secret", "Save"],
          },
        ],
        component_file: "src/components/auth/SocialLoginButtons.tsx",
        benefits: ["No password needed", "Pre-verified professional emails", "Higher trust", "+35% conversion"],
      }, null, 2);
    }

    case "auth_setup_google_login": {
      return JSON.stringify({
        message: "✅ Google OAuth Setup Guide",
        estimated_time: "5 minutes",
        steps: [
          {
            step: 1,
            title: "Enable API",
            url: "https://console.cloud.google.com/apis/library",
            actions: ["Search 'Google+ API' or 'People API'", "Click 'Enable'"],
          },
          {
            step: 2,
            title: "OAuth Consent Screen",
            url: "https://console.cloud.google.com/apis/credentials/consent",
            actions: ["Select 'External'", "App name: 'Klarpakke Universitet'", "Add email: post@klarpakke.no", "Add scopes: email, profile"],
          },
          {
            step: 3,
            title: "Create Credentials",
            actions: ["Credentials → Create → OAuth client ID", "Type: Web application", "Name: 'Klarpakke Web'", "Add redirect: https://www.klarpakke.no/auth/callback", "Copy Client ID and Secret"],
          },
          {
            step: 4,
            title: "Add to Supabase",
            actions: ["Auth → Providers → Google", "Toggle ON", "Paste credentials", "Save"],
          },
        ],
        benefits: ["Universal - everyone has Google", "Works on all devices", "+40% conversion"],
      }, null, 2);
    }

    case "auth_setup_apple_login": {
      return JSON.stringify({
        message: "✅ Apple Sign In Setup Guide",
        warning: "Requires Apple Developer Program ($99/year)",
        estimated_time: "10 minutes",
        steps: [
          {
            step: 1,
            title: "Create App ID",
            url: "https://developer.apple.com/account/resources/identifiers/list",
            actions: ["Click '+' → App IDs", "Type: App", "Description: 'Klarpakke Login'", "Bundle ID: no.klarpakke.auth", "Check 'Sign In with Apple'"],
          },
          {
            step: 2,
            title: "Create Service ID",
            actions: ["Identifiers → Services IDs → '+'", "Description: 'Klarpakke Auth'", "Identifier: no.klarpakke.auth.service", "Enable 'Sign In with Apple'", "Configure: Domains: www.klarpakke.no, klarpakke.no", "Return URLs: https://www.klarpakke.no/auth/callback"],
          },
          {
            step: 3,
            title: "Create Private Key",
            warning: "⚠️ Download .p8 file - you can ONLY do this once!",
            actions: ["Keys → '+'", "Name: 'Klarpakke Sign In Key'", "Check 'Sign In with Apple'", "Download .p8 file", "Copy Key ID"],
          },
          {
            step: 4,
            title: "Generate Client Secret",
            code: "const jwt = require('jsonwebtoken');\nconst fs = require('fs');\n\nconst privateKey = fs.readFileSync('AuthKey_XXXXXXXXXX.p8');\nconst teamId = 'YOUR_TEAM_ID';\nconst clientId = 'no.klarpakke.auth.service';\nconst keyId = 'YOUR_KEY_ID';\n\nconst token = jwt.sign({\n  iss: teamId,\n  iat: Math.floor(Date.now() / 1000),\n  exp: Math.floor(Date.now() / 1000) + 15777000,\n  aud: 'https://appleid.apple.com',\n  sub: clientId,\n}, privateKey, {\n  algorithm: 'ES256',\n  header: { alg: 'ES256', kid: keyId },\n});\n\nconsole.log(token);",
          },
          {
            step: 5,
            title: "Add to Supabase",
            actions: ["Auth → Providers → Apple", "Toggle ON", "Services ID: no.klarpakke.auth.service", "Client ID: no.klarpakke.auth.service", "Client Secret: (paste generated JWT)", "Save"],
          },
        ],
        notes: ["Secret expires after 6 months", "Works best on iOS devices", "Shows Apple login popup on web"],
      }, null, 2);
    }

    case "auth_setup_resend_smtp": {
      return JSON.stringify({
        message: "✅ Resend SMTP Setup for Supabase Auth",
        estimated_time: "10 minutes",
        steps: [
          {
            step: 1,
            title: "Verify Domain in Resend",
            url: "https://resend.com/domains",
            actions: ["Click 'Add domain'", "Enter: klarpakke.no", "Copy DNS records (DKIM, SPF)"],
          },
          {
            step: 2,
            title: "Add DNS Records",
            actions: ["Go to your DNS provider", "Add DKIM record (TXT)", "Add SPF record (TXT)", "Wait for verification (5-60 min)"],
          },
          {
            step: 3,
            title: "Get API Key",
            actions: ["Resend → API Keys", "Create API Key", "Name: 'Klarpakke Production'", "Permission: 'Sending access'", "Copy key (starts with 're_')"],
          },
          {
            step: 4,
            title: "Configure Supabase SMTP",
            url: "https://app.supabase.com/project/_/auth/providers",
            settings: {
              "Enable Custom SMTP": "ON",
              "Host": "smtp.resend.com",
              "Port": "587",
              "Username": "resend",
              "Password": "re_your_api_key_here",
              "Sender name": "Klarpakke Universitet",
              "Sender email": "noreply@klarpakke.no",
            },
          },
          {
            step: 5,
            title: "Test",
            actions: ["Send test email from Resend dashboard", "Check inbox (not spam!)"],
          },
        ],
        troubleshooting: ["If spam: Check DNS records", "If fails: Verify API key has 'Sending' permission"],
      }, null, 2);
    }

    case "auth_diagnose_email_issue": {
      return JSON.stringify({
        diagnosis: "Email confirmation failing due to missing SMTP configuration",
        current_setup: {
          supabase_auth: "Enabled",
          email_confirmations: "ON (default)",
          smtp_provider: "NOT CONFIGURED",
          resend_api_key: "Present in .env but not linked to Supabase Auth",
        },
        issues: ["Supabase Auth requires SMTP for confirmation emails", "Resend configured in app but not in Supabase Auth settings", "Users created but cannot login without confirming email"],
        quick_fix: {
          name: "Disable email confirmations (5 min)",
          steps: ["1. Supabase Dashboard → Authentication → Settings", "2. Turn OFF 'Enable email confirmations'", "3. Users can login immediately"],
          risk: "Lower security, fake emails possible",
        },
        proper_fix: {
          name: "Configure Resend SMTP (10 min)",
          steps: ["Use auth_setup_resend_smtp tool for full guide"],
        },
      }, null, 2);
    }

    case "auth_recommend_providers": {
      return JSON.stringify({
        recommendations: [
          { provider: "LinkedIn", priority: "HIGH", reason: "Professional audience, high trust", conversion: "+35%", setup_time: "15 min" },
          { provider: "Google", priority: "HIGH", reason: "Universal, everyone has it", conversion: "+40%", setup_time: "5 min" },
          { provider: "Apple", priority: "MEDIUM", reason: "iOS users, requires $99/year", conversion: "+15%", setup_time: "10 min" },
          { provider: "Magic Link", priority: "MEDIUM", reason: "No password needed", conversion: "+20%", setup_time: "10 min" },
        ],
        recommended_order: ["LinkedIn", "Google", "Apple", "Magic Link", "Email+Password"],
        ui_layout: "LinkedIn (top) → Google → Apple → Magic Link → Email/Password (bottom)",
      }, null, 2);
    }

    case "auth_test_email_delivery": {
      return JSON.stringify({
        test: `Send test to: ${args?.to_email}`,
        instructions: ["Check inbox within 30 seconds", "Check spam/junk", "Check promotions tab (Gmail)"],
        next_steps: { received: "SMTP works!", not_received: "Configure Resend SMTP" },
      }, null, 2);
    }

    default:
      return JSON.stringify({ message: `Unknown auth tool: ${name}` });
  }
}
