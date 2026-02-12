#!/usr/bin/env bash
#
# Reset all user data in the remote Supabase database.
# Reads credentials from apps/api/.env
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${SCRIPT_DIR}/../apps/api/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

SB_URL=$(grep '^SUPABASE_URL=' "$ENV_FILE" | cut -d= -f2-)
SB_KEY=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' "$ENV_FILE" | cut -d= -f2-)

if [ -z "$SB_URL" ] || [ -z "$SB_KEY" ]; then
  echo "Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in $ENV_FILE"
  exit 1
fi

# Tables to clear, in order (respecting foreign key dependencies)
TABLES=(
  agent_timeline
  agent_positions
  agent_configs
  transactions
  sip_configs
  portfolio_snapshots
  token_price_snapshots
  news_articles
  messages
  conversations
  user_profiles
)

echo "Clearing all data from remote Supabase..."
echo ""

for table in "${TABLES[@]}"; do
  # DELETE all rows (neq filter on id that always matches)
  status=$(curl -s -o /dev/null -w "%{http_code}" \
    -X DELETE "${SB_URL}/rest/v1/${table}?id=neq.00000000-0000-0000-0000-000000000000" \
    -H "apikey: ${SB_KEY}" \
    -H "Authorization: Bearer ${SB_KEY}" \
    -H "Prefer: return=minimal")

  if [ "$status" = "204" ] || [ "$status" = "200" ]; then
    echo "  [ok] ${table}"
  else
    echo "  [${status}] ${table} (may be empty or have no id column)"
  fi
done

echo ""
echo "Done. All user data cleared."
