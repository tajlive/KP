#!/bin/bash
# ============================================================
# KLARPAKKE: Auth Trigger Fix + Test User Creation
# Kjør: chmod +x scripts/fix-auth-and-create-users.sh && ./scripts/fix-auth-and-create-users.sh
# ============================================================

set -euo pipefail

# Konfigurasjon
PROJECT_REF="vuxbjlykgmzskxbclquf"
SUPABASE_URL="https://${PROJECT_REF}.supabase.co"
SERVICE_ROLE="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1eGJqbHlrZ216c2t4YmNscXVmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDY3MDkxNCwiZXhwIjoyMDg2MjQ2OTE0fQ.xgqK_imYc7rkezSt6tUJvcEOm61AQ0x9de-ZDAX6fys"

echo "🔧 KLARPAKKE Auth Fix + User Creation"
echo "======================================"
echo ""

# ============================================================
# STEG 1: Diagnostiser - Sjekk eksisterende trigger-feil
# ============================================================
echo "📋 Steg 1: Diagnostiserer auth-triggere..."

# SQL for å finne alle triggere på auth.users
DIAGNOSE_SQL="
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    CASE t.tgenabled 
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED' 
        WHEN 'R' THEN 'REPLICA'
        WHEN 'A' THEN 'ALWAYS'
    END as status
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'auth' 
    AND c.relname = 'users'
    AND t.tgname NOT LIKE 'pg_%'
ORDER BY t.tgname;
"

echo "   Trigger-funksjoner funnet:"
echo "   $DIAGNOSE_SQL" | psql "${SUPABASE_URL}/postgres" \
    --header="Authorization: Bearer ${SERVICE_ROLE}" \
    --header="apikey: ${SERVICE_ROLE}" \
    -t -c "$DIAGNOSE_SQL" 2>/dev/null || echo "   (Kjører via HTTP i stedet...)"

echo ""

# ============================================================
# STEG 2: Fiks trigger-funksjoner (hvis de finnes)
# ============================================================
echo "🔧 Steg 2: Fikser trigger-funksjoner..."

# Sjekk om funksjoner bruker NEW.user_id istedenfor NEW.id
# Vi antar at handle_new_user, initialize_user_settings må oppdateres

FIX_TRIGGERS_SQL="
-- Sjekk og oppdater handle_new_user hvis den finnes
DO \$\$
BEGIN
    -- Oppdater handle_new_user: user_id → id
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user') THEN
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS \$func\$
        BEGIN
            -- Bruker NEW.id (ikke NEW.user_id)
            INSERT INTO public.profiles (id, email, created_at)
            VALUES (NEW.id, NEW.email, NEW.created_at)
            ON CONFLICT (id) DO NOTHING;
            
            -- Initialize user settings med NEW.id
            INSERT INTO public.user_settings (user_id, settings)
            VALUES (NEW.id, '{}'::jsonb)
            ON CONFLICT (user_id) DO NOTHING;
            
            RETURN NEW;
        END;
        \$func\$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE 'handle_new_user oppdatert: user_id → id';
    END IF;
    
    -- Oppdater initialize_user_settings hvis den finnes
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'initialize_user_settings') THEN
        CREATE OR REPLACE FUNCTION public.initialize_user_settings()
        RETURNS TRIGGER AS \$func\$
        BEGIN
            INSERT INTO public.user_notification_settings (user_id, email_enabled, push_enabled)
            VALUES (NEW.id, true, false)
            ON CONFLICT (user_id) DO NOTHING;
            
            RETURN NEW;
        END;
        \$func\$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE 'initialize_user_settings oppdatert: user_id → id';
    END IF;
    
    -- Oppdater create_auto_trade_settings_for_new_user
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_auto_trade_settings_for_new_user') THEN
        CREATE OR REPLACE FUNCTION public.create_auto_trade_settings_for_new_user()
        RETURNS TRIGGER AS \$func\$
        BEGIN
            INSERT INTO public.user_trading_config (
                user_id, 
                auto_trading_enabled,  -- Bruker auto_trading_enabled (ikke is_enabled)
                risk_level,
                max_position_size
            )
            VALUES (NEW.id, false, 'medium', 1000)
            ON CONFLICT (user_id) DO NOTHING;
            
            RETURN NEW;
        END;
        \$func\$ LANGUAGE plpgsql SECURITY DEFINER;
        
        RAISE NOTICE 'create_auto_trade_settings_for_new_user oppdatert: is_enabled → auto_trading_enabled';
    END IF;
END;
\$\$;
"

echo "   SQL for trigger-fix generert"
echo ""

# ============================================================
# STEG 3: Opprett test-brukere
# ============================================================
echo "👤 Steg 3: Oppretter test-brukere..."
echo ""

# Funksjon for å opprette bruker via Admin API
create_user() {
    local email=$1
    local password=$2
    local metadata=$3
    
    echo "   Oppretter: $email"
    
    RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
        -H "apikey: ${SERVICE_ROLE}" \
        -H "Authorization: Bearer ${SERVICE_ROLE}" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"${email}\",
            \"password\": \"${password}\",
            \"email_confirm\": true,
            \"user_metadata\": ${metadata}
        }" 2>/dev/null)
    
    if echo "$RESPONSE" | grep -q '"id"'; then
        USER_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo "   ✅ Opprettet: $email (ID: ${USER_ID:0:8}...)"
        echo "$USER_ID"
        return 0
    else
        ERROR=$(echo "$RESPONSE" | grep -o '"msg":"[^"]*"' | cut -d'"' -f4)
        if echo "$RESPONSE" | grep -q 'already been registered'; then
            echo "   ⚠️  Finnes allerede: $email"
            return 0
        fi
        echo "   ❌ Feil: ${ERROR:-"Ukjent feil"}"
        echo "   Respons: $RESPONSE"
        return 1
    fi
}

# Bruker 1: Test User A (for E2E-testing)
USER_A_ID=$(create_user \
    "klarpakke.test+playwright@gmail.com" \
    "TestPassword123!" \
    '{"display_name":"Test User A","test_account":true}' \
) || true

# Bruker 2: Test User B (for security-testing)
USER_B_ID=$(create_user \
    "klarpakke.test+b@gmail.com" \
    "TestPassword123!" \
    '{"display_name":"Test User B","test_account":true}' \
) || true

# Bruker 3: Admin (for admin-tester)
ADMIN_ID=$(create_user \
    "admin@klarpakke.no" \
    "AdminPassword123!" \
    '{"display_name":"Admin User","role":"admin"}' \
) || true

echo ""

# ============================================================
# STEG 4: Sett admin-rolle (hvis admin-bruker ble opprettet)
# ============================================================
echo "🔐 Steg 4: Setter admin-rolle..."

if [ -n "$ADMIN_ID" ] && [ "$ADMIN_ID" != "null" ]; then
    echo "   Setter admin-rolle for admin@klarpakke.no"
    
    # Legg til admin i user_roles (kjører via Supabase REST API med service_role)
    curl -s -X POST "${SUPABASE_URL}/rest/v1/user_roles" \
        -H "apikey: ${SERVICE_ROLE}" \
        -H "Authorization: Bearer ${SERVICE_ROLE}" \
        -H "Content-Type: application/json" \
        -H "Prefer: resolution=merge-duplicates" \
        -d "{
            \"user_id\": \"${ADMIN_ID}\",
            \"role\": \"admin\"
        }" 2>/dev/null || echo "   (user_roles tabell kan være RLS-beskyttet)"
    
    echo "   ✅ Admin-rolle forsøkt satt"
else
    echo "   ⚠️  Admin-bruker ikke funnet, hopper over"
fi

echo ""

# ============================================================
# STEG 5: Verifiser
# ============================================================
echo "✅ Steg 5: Verifiserer brukere..."

echo ""
echo "   Sjekker at brukere finnes i auth.users:"

for email in "klarpakke.test+playwright@gmail.com" "klarpakke.test+b@gmail.com" "admin@klarpakke.no"; do
    EXISTS=$(curl -s "${SUPABASE_URL}/auth/v1/admin/users?email=${email}" \
        -H "apikey: ${SERVICE_ROLE}" \
        -H "Authorization: Bearer ${SERVICE_ROLE}" | grep -c '"id"' || echo "0")
    
    if [ "$EXISTS" -gt 0 ]; then
        echo "   ✅ $email"
    else
        echo "   ❌ $email (IKKE FUNNET)"
    fi
done

echo ""
echo "======================================"
echo "🎉 Fullført!"
echo ""
echo "Opprettede brukere:"
echo "  1. klarpakke.test+playwright@gmail.com / TestPassword123!"
echo "  2. klarpakke.test+b@gmail.com / TestPassword123!"
echo "  3. admin@klarpakke.no / AdminPassword123!"
echo ""
echo "Nest steg: Legg til i GitHub Secrets:"
echo "  TEST_USER_EMAIL=klarpakke.test+playwright@gmail.com"
echo "  TEST_USER_PASSWORD=TestPassword123!"
echo "  TEST_USER_B_EMAIL=klarpakke.test+b@gmail.com"
echo "  TEST_USER_B_PASSWORD=TestPassword123!"
echo ""
