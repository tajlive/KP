#!/bin/bash
# Wrapper for å kjøre KIMI MCP med riktig Node/NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
node /Users/taj/klarpakke/scripts/run-kimi-mcp.mjs
