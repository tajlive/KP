#!/bin/bash
# =============================================================================
# KLARPAKKE + KIMI + ANTIGRAVITY - SNARVEIER
# =============================================================================
# Legg til i ~/.zshrc eller ~/.bashrc:
#   source /Users/taj/klarpakke/scripts/klarpakke-aliases.sh
# =============================================================================

# --- PROSJEKT-STIER ---
export KLARPAKKE_HOME="/Users/taj/klarpakke"
export KLARPAKKE_API_PORT="3456"
export KLARPAKKE_API_TOKEN="klarpakke-dev-token"

# --- ANTIGRAVITY API HELPER ---
_kp_api() {
  local method=$1
  local endpoint=$2
  local data=$3
  
  if [ -n "$data" ]; then
    curl -s -X "$method" \
      -H "Authorization: Bearer $KLARPAKKE_API_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "http://localhost:$KLARPAKKE_API_PORT$endpoint"
  else
    curl -s -X "$method" \
      -H "Authorization: Bearer $KLARPAKKE_API_TOKEN" \
      "http://localhost:$KLARPAKKE_API_PORT$endpoint"
  fi
}

# --- GIT SNARVEIER ---
alias kp='cd $KLARPAKKE_HOME'
alias kps='_kp_api GET /git/status | jq'
alias kpl='_kp_api GET /git/log | jq .commits'
alias kpc='_kp_api POST /git/commit "{\"message\": \"quick update\"}" | jq'
alias kpp='_kp_api POST /git/push | jq'
alias kpd='_kp_api POST /git/pull | jq'

# Quick commit with message
kpcm() {
  if [ -z "$1" ]; then
    echo "Bruk: kpcm 'din commit melding'"
    return 1
  fi
  _kp_api POST /git/commit "{\"message\": \"$1\"}" | jq
}

# --- BYGG & UTVIKLING ---
alias kpb='_kp_api GET /build | jq'
alias kpdev='_kp_api GET /dev/start | jq'
alias kplint='_kp_api GET /lint | jq'
alias kptype='_kp_api GET /typecheck | jq'

# --- FILOPERASJONER ---
alias kpls='_kp_api GET "/file/list?path=." | jq .items'
kpcat() {
  if [ -z "$1" ]; then
    echo "Bruk: kpcat <filbane>"
    return 1
  fi
  _kp_api GET "/file/read?path=$1" | jq -r .content
}

# --- SUPABASE ---
alias kpsb='_kp_api GET /supabase/migration/list | jq'
alias kpsbpush='_kp_api POST /supabase/migration/push | jq'
kpsbdev() {
  local func=$1
  if [ -z "$func" ]; then
    echo "Bruk: kpsbdev <function-name>"
    return 1
  fi
  _kp_api POST "/supabase/function/deploy?name=$func" | jq
}

# --- SØK ---
alias kpsearch='_kp_api GET /search/code | jq'
kpsrc() {
  if [ -z "$1" ]; then
    echo "Bruk: kpsrc <søkeord> [pattern]"
    return 1
  fi
  local pattern=${2:-"*.ts"}
  _kp_api GET "/search/code?q=$1&pattern=$pattern" | jq
}

# --- PROSJEKT INFO ---
alias kpinfo='_kp_api GET /project/info | jq'
alias kpenv='_kp_api GET /env/check | jq'

# --- KIMI CLI SNARVEIER ---
alias kimic='kimi --context /Users/taj/klarpakke/.kimi/prompt.md'
alias kimif='kimi --no-stream'  # Fast mode (no streaming)
alias kimid='kimi --context /Users/taj/klarpakke/AGENTS.md'

# Quick kimi ask with project context
kima() {
  if [ -z "$1" ]; then
    echo "Bruk: kima 'ditt spørsmål'"
    return 1
  fi
  kimi --context /Users/taj/klarpakke/.kimi/prompt.md "$1"
}

# --- API SERVER ---
alias kpstart='cd $KLARPAKKE_HOME && node api-server.js &'
alias kpstop='pkill -f "api-server.js"'
alias kprestart='kpstop; sleep 1; kpstart'
alias kphealth='curl -s http://localhost:$KLARPAKKE_API_PORT/health | jq'

# --- KOMBINERTE WORKFLOWS ---

# Full sjekk før commit
kpcheck() {
  echo "🔍 Sjekker git status..."
  kps
  echo ""
  echo "🔨 Kjører lint..."
  kplint
  echo ""
  echo "📘 Kjører typecheck..."
  kptype
  echo ""
  echo "✅ Sjekk fullført!"
}

# Rask deploy
kpdeploy() {
  local msg=${1:-"deploy: $(date '+%Y-%m-%d %H:%M')"}
  echo "📦 Deploy starter..."
  kpcm "$msg" && kpp
}

# Søk og erstatt i prosjektet
kpreplace() {
  if [ -z "$2" ]; then
    echo "Bruk: kpreplace <gammel> <ny> [pattern]"
    echo "Eks: kpreplace 'foo' 'bar' '*.ts'"
    return 1
  fi
  local old=$1
  local new=$2
  local pattern=${3:-"*.ts"}
  
  echo "🔍 Søker etter '$old' i $pattern filer..."
  kpsrc "$old" "$pattern"
  echo ""
  read -p "Erstatt alle? (y/n) " confirm
  if [ "$confirm" = "y" ]; then
    find $KLARPAKKE_HOME -name "$pattern" -type f -exec sed -i '' "s/$old/$new/g" {} +
    echo "✅ Erstattet '$old' med '$new'"
  fi
}

# --- HJELP ---
khelp() {
  cat << 'EOF'
╔══════════════════════════════════════════════════════════════╗
║           KLARPAKKE SNARVEIER - HJELP                        ║
╠══════════════════════════════════════════════════════════════╣
║ GIT                                                          ║
║   kps          - Git status                                  ║
║   kpl          - Git log (siste 10)                          ║
║   kpcm 'msg'   - Commit med melding                          ║
║   kpp          - Push til origin/main                        ║
║   kpd          - Pull fra origin/main                        ║
║                                                              ║
║ BYGG                                                         ║
║   kpb          - npm run build                               ║
║   kplint       - TypeScript lint                             ║
║   kptype       - TypeScript typecheck                        ║
║   kpdev        - Start dev server                            ║
║                                                              ║
║ SUPABASE                                                     ║
║   kpsb         - List migrasjoner                            ║
║   kpsbpush     - Push migrasjoner                            ║
║   kpsbdev fn   - Deploy Edge Function                        ║
║                                                              ║
║ SØK                                                          ║
║   kpsrc term   - Søk i koden                                 ║
║                                                              ║
║ KIMI AI                                                      ║
║   kima 'q'     - Spør KIMI med kontekst                      ║
║   kimif        - KIMI uten streaming (raskere)               ║
║                                                              ║
║ WORKFLOWS                                                    ║
║   kpcheck      - Full sjekk før commit                       ║
║   kpdeploy     - Rask deploy                                 ║
║   kphealth     - Sjekk API server                            ║
╚══════════════════════════════════════════════════════════════╝
EOF
}

echo "✅ Klarpakke snarveier lastet!"
echo "   Skriv 'khelp' for hjelp"
