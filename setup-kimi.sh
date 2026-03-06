#!/bin/bash
echo "🦞 Starter Kimi Claw..."
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 22 > /dev/null 2>&1
pkill -f "openclaw node" 2>/dev/null || true
sleep 2
export OPENCLAW_NODE_GATEWAY_URL="ws://10.184.212.156:18789"
export OPENCLAW_NODE_GATEWAY_TOKEN="1effd1dfde29226f11a7f94a6e75e77c25c64ef48e59d3f7"
export OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1
mkdir -p ~/.openclaw
openclaw node run --host 10.184.212.156 --port 18789 > ~/.openclaw/node.log 2>&1 &
sleep 3
if pgrep -f "openclaw node" > /dev/null; then
  echo "✅ Kimi Claw er tilkoblet!"
else
  echo "⚠️  Sjekk log: tail ~/.openclaw/node.log"
fi
