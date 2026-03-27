# 🤖 MCP (Model Context Protocol) Guide

## Overview

Klarpakke uses MCP to integrate with various services through AI assistants like Cursor and Claude.

## Configured MCP Servers

| Server | Purpose | Status |
|--------|---------|--------|
| **GitHub** | Repository management | ✅ Active |
| **Linear** | Issue tracking | ✅ Active |
| **Supabase** | Database operations | ✅ Active |
| **Vercel** | Deployment | ✅ Active |
| **Stripe** | Payment handling | ✅ Active |
| **Sentry** | Error monitoring | ✅ Active |
| **Playwright** | E2E testing | ✅ Active |

## Configuration Files

- `.cursor/mcp.json` - Master (Cursor IDE)
- `.mcp/mcp_config.json` - Synced copy (CI/tools)
- `.kimi/mcp-config.json` - Synced copy (Kimi CLI); use `npm run mcp:sync`

## Usage

### In Cursor

1. Open Command Palette (Cmd+Shift+P)
2. Type "MCP"
3. Select available tools

### Available Tools

- Create Linear issues from code comments
- Query Supabase database
- Deploy to Vercel
- Check Stripe payments
- Monitor Sentry errors
- Run Playwright tests

## Security

All sensitive tokens are stored as environment variables. Never commit tokens directly to the repository.

