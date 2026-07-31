#!/bin/bash
# Delte env-loader for Klarpakke-scripts.
#
# PROBLEM: `.env.local` inneholder verdier med '&' (f.eks. POSTGRES_URL med
# Supabase pooler-query-parametre). `source .env.local` gir da:
#   .env.local:11: parse error near `&'
#
# BRUK:  . "$(dirname "${BASH_SOURCE[0]}")/../lib/load-env.sh"
# (fra scripts/*.sh). Leser .env.local linje for linje og exporter verdiene
# uten re-parsing, så '&', '=', '#', mellomrom osv. i verdier er trygt.

_load_env_file() {
  local _file="${1:-.env.local}"
  if [ ! -f "$_file" ]; then
    return 0
  fi
  local _line _key _value
  while IFS= read -r _line; do
    case "$_line" in
      '' | \#*) continue ;;
    esac
    _key="${_line%%=*}"
    _value="${_line#*=}"
    # Strip matchende anførselstegn rundt verdien ("..." eller '...')
    # NB: .env.local har bl.a. CLOUDFLARE_API_TOKEN="cfat_..." — uten stripping
    # får wrangler token-en inkl. quotes og auth feiler (kode 6111).
    if [[ "$_value" == \"*\" ]]; then
      _value="${_value#\"}"
      _value="${_value%\"}"
    elif [[ "$_value" == \'*\' ]]; then
      _value="${_value#\'}"
      _value="${_value%\'}"
    fi
    if [ -n "$_key" ]; then
      export "$_key=$_value"
    fi
  done < "$_file"
}

# Last alltid .env.local — både når sourced og når kjørt direkte.
_load_env_file "${1:-.env.local}"
