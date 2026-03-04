#!/bin/bash
# SQL Runner for Klarpakke
# Usage: ./sql.sh [command] [args]

set -e

# Load environment
if [ -f .env.local ]; then
    export $(cat .env.local | grep DATABASE_URL | xargs)
elif [ -f klarpakke-mcp-server/.env ]; then
    export $(cat klarpakke-mcp-server/.env | grep DATABASE_URL | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found in .env.local or klarpakke-mcp-server/.env"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

command="${1:-help}"

case "$command" in
    "check"|"test")
        echo -e "${YELLOW}Testing database connection...${NC}"
        if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Database connection OK${NC}"
            psql "$DATABASE_URL" -c "SELECT version();" | head -1
        else
            echo -e "${RED}❌ Database connection failed${NC}"
            exit 1
        fi
        ;;

    "tables"|"list")
        echo -e "${YELLOW}Listing all tables...${NC}"
        psql "$DATABASE_URL" -c "\dt" | grep -E "^ public"
        ;;

    "check-table")
        table="${2:-}"
        if [ -z "$table" ]; then
            echo "Usage: ./sql.sh check-table <table_name>"
            exit 1
        fi
        echo -e "${YELLOW}Checking table: $table${NC}"
        if psql "$DATABASE_URL" -c "\dt $table" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Table '$table' exists${NC}"
            psql "$DATABASE_URL" -c "\d $table"
        else
            echo -e "${RED}❌ Table '$table' not found${NC}"
            exit 1
        fi
        ;;

    "file"|"run")
        file="${2:-}"
        if [ -z "$file" ] || [ ! -f "$file" ]; then
            echo "Usage: ./sql.sh file <path_to_sql_file>"
            echo "File not found: $file"
            exit 1
        fi
        echo -e "${YELLOW}Running SQL file: $file${NC}"
        if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"; then
            echo -e "${GREEN}✅ SQL file executed successfully${NC}"
        else
            echo -e "${RED}❌ SQL file execution failed${NC}"
            exit 1
        fi
        ;;

    "query"|"q")
        query="${2:-}"
        if [ -z "$query" ]; then
            echo "Usage: ./sql.sh query \"SELECT * FROM table\""
            exit 1
        fi
        echo -e "${YELLOW}Running query...${NC}"
        psql "$DATABASE_URL" -c "$query"
        ;;

    "columns")
        table="${2:-}"
        if [ -z "$table" ]; then
            echo "Usage: ./sql.sh columns <table_name>"
            exit 1
        fi
        echo -e "${YELLOW}Columns in table '$table':${NC}"
        psql "$DATABASE_URL" -c "\d $table"
        ;;

    "migrate"|"m")
        echo -e "${YELLOW}Running pending migrations...${NC}"
        for file in supabase/migrations/*.sql; do
            echo "Processing: $(basename $file)"
            psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file" || echo "⚠️  Skipped (may already be applied)"
        done
        echo -e "${GREEN}✅ Migrations complete${NC}"
        ;;

    "backup")
        backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
        echo -e "${YELLOW}Creating backup: $backup_file${NC}"
        pg_dump "$DATABASE_URL" > "$backup_file"
        echo -e "${GREEN}✅ Backup saved to: $backup_file${NC}"
        ;;

    "help"|*)
        cat << 'EOF'
╔════════════════════════════════════════════════════════════╗
║                  KLARPAKKE SQL TOOL                        ║
╚════════════════════════════════════════════════════════════╝

USAGE:
  ./sql.sh [command] [args]

COMMANDS:
  check                 Test database connection
  tables                List all tables
  check-table <name>    Check if table exists
  columns <name>        Show table columns
  file <path>           Run SQL file
  query <sql>           Run SQL query
  migrate               Run all migration files
  backup                Create database backup

EXAMPLES:
  ./sql.sh check
  ./sql.sh tables
  ./sql.sh check-table live_trades
  ./sql.sh columns profiles
  ./sql.sh file supabase/migrations/my_migration.sql
  ./sql.sh query "SELECT * FROM profiles LIMIT 5"
  ./sql.sh migrate
  ./sql.sh backup

EOF
        ;;
esac
