#!/bin/bash
# KIMI Diary - LEGACY WRAPPER
# Redirects to mempalace-diary-v2.sh for backward compatibility
# All new code should use mempalace-diary-v2.sh directly

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$SCRIPT_DIR/mempalace-diary-v2.sh" "$@"
