#!/bin/bash
# 🤖 Klarpakke MCP Server - Quick Start

cd "$(dirname "$0")/klarpakke-mcp-server"

echo "🚀 Starting Klarpakke MCP Server..."
echo "📚 Available tools: 121+"
echo "☁️  Services: Vercel, Cloudflare, Supabase, GitHub, Stripe, Resend"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found!"
    echo "Copy from .env.example and fill in your credentials:"
    echo "  cp .env.example .env"
    echo ""
fi

# Run the MCP server
echo "🟢 MCP Server starting..."
deno run --allow-all src/index.ts
