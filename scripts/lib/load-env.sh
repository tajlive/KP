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
    if [ -n "$_key" ]; then
      export "$_key=$_value"
    fi
  done < "$_file"
}

# Kjør bare når scriptet er sourced direkte som loader (ikke ved import)
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  _load_env_file "${1:-.env.local}"
fi
