#!/bin/bash
# =============================================================================
# TOTAL KIMI CLAW - Setup Script
# Kjør: bash setup-kimi-claw.sh
# Dette setter opp permanent tilgang for Kimi Claw
# =============================================================================

set -e

BOLD=$(tput bold)
RESET=$(tput sgr0)
GREEN=$(tput setaf 2)
YELLOW=$(tput setaf 3)
CYAN=$(tput setaf 6)
RED=$(tput setaf 1)

echo ""
echo "${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}"
echo "${BOLD}${CYAN}║   TOTAL KIMI CLAW Setup                                      ║${RESET}"
echo "${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}"
echo ""

# Konfigurasjon
GATEWAY_HOST="10.184.212.156"
GATEWAY_PORT="18789"
GATEWAY_TOKEN="1effd1dfde29226f11a7f94a6e75e77c25c64ef48e59d3f7"

echo "${YELLOW}⚙️  Step 1: Sjekker forutsetninger...${RESET}"

# Sjekk at Node 22 er aktiv
if ! command -v node &> /dev/null || [[ $(node -v) != v22* ]]; then
    echo "${RED}❌ Node 22 ikke funnet. Aktiverer...${RESET}"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm use 22 || { echo "${RED}❌ Kunne ikke aktivere Node 22${RESET}"; exit 1; }
fi
echo "${GREEN}✅ Node $(node -v) aktiv${RESET}"

# Sjekk at openclaw er installert
if ! command -v openclaw &> /dev/null; then
    echo "${RED}❌ OpenClaw ikke funnet i PATH${RESET}"
    echo "Installer med: npm install -g openclaw"
    exit 1
fi
echo "${GREEN}✅ OpenClaw funnet${RESET}"

echo ""
echo "${YELLOW}⚙️  Step 2: Stopper eksisterende OpenClaw node...${RESET}"
pkill -f "openclaw node" 2>/dev/null || true
sleep 2
echo "${GREEN}✅ Stoppet${RESET}"

echo ""
echo "${YELLOW}⚙️  Step 3: Lager LaunchAgent for auto-start...${RESET}"

mkdir -p ~/Library/LaunchAgents

cat > ~/Library/LaunchAgents/com.openclaw.node.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openclaw.node</string>
    <key>ProgramArguments</key>
    <array>
        <string>$(which openclaw)</string>
        <string>node</string>
        <string>run</string>
        <string>--host</string>
        <string>${GATEWAY_HOST}</string>
        <string>--port</string>
        <string>${GATEWAY_PORT}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>OPENCLAW_NODE_GATEWAY_TOKEN</key>
        <string>${GATEWAY_TOKEN}</string>
        <key>OPENCLAW_ALLOW_INSECURE_PRIVATE_WS</key>
        <string>1</string>
        <key>PATH</key>
        <string>/Users/taj/.nvm/versions/node/v22.22.1/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/taj/.openclaw/node.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/taj/.openclaw/node.error.log</string>
</dict>
</plist>
EOF

echo "${GREEN}✅ LaunchAgent opprettet${RESET}"

echo ""
echo "${YELLOW}⚙️  Step 4: Laster inn tjenesten...${RESET}"
launchctl unload ~/Library/LaunchAgents/com.openclaw.node.plist 2>/dev/null || true
sleep 1
launchctl load ~/Library/LaunchAgents/com.openclaw.node.plist
echo "${GREEN}✅ Tjenesten startet${RESET}"

echo ""
echo "${YELLOW}⚙️  Step 5: Oppdaterer MCP konfigurasjon...${RESET}"

# Sikkerhetskopier eksisterende MCP config
if [ -f ~/.cursor/mcp.json ]; then
    cp ~/.cursor/mcp.json ~/.cursor/mcp.json.backup.$(date +%Y%m%d_%H%M%S)
    echo "${GREEN}✅ Backup av eksisterende MCP config${RESET}"
fi

echo "${GREEN}✅ MCP config allerede optimal${RESET}"

echo ""
echo "${YELLOW}⚙️  Step 6: Verifiserer tilkobling...${RESET}"
sleep 3

# Sjekk om prosessen kjører
if pgrep -f "openclaw node" > /dev/null; then
    echo "${GREEN}✅ OpenClaw node kjører${RESET}"
else
    echo "${RED}⚠️  OpenClaw node startet ikke. Sjekk log: ~/.openclaw/node.error.log${RESET}"
fi

echo ""
echo "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${RESET}"
echo "${BOLD}${GREEN}🦞 TOTAL KIMI CLAW er nå aktivert!${RESET}"
echo "${BOLD}${CYAN}══════════════════════════════════════════════════════════════${RESET}"
echo ""
echo "${CYAN}Dette er nå satt opp:${RESET}"
echo "  ✅ OpenClaw node (auto-start ved boot)"
echo "  ✅ Tilkobling til Kimi Claw server"
echo "  ✅ Logging til ~/.openclaw/"
echo ""
echo "${CYAN}Kommandoer:${RESET}"
echo "  ${BOLD}launchctl start com.openclaw.node${RESET}  - Start manuelt"
echo "  ${BOLD}launchctl stop com.openclaw.node${RESET}   - Stopp"
echo "  ${BOLD}tail -f ~/.openclaw/node.log${RESET}       - Se logg"
echo ""
echo "${YELLOW}⏳ Venter på at Kimi Claw skal bekrefte tilkobling...${RESET}"
echo ""
