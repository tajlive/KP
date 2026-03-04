#!/bin/bash
# MCP Server Wrapper - Loads env vars from .env.local

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load .env.local if it exists
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  export $(grep -v '^#' "$PROJECT_ROOT/.env.local" | xargs)
fi

# Run the MCP server
exec node "$SCRIPT_DIR/dist/index.js"
