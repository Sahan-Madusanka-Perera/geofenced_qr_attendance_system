#!/usr/bin/env bash
#
# healthcheck.sh — probe every tier of the QR Attendance stack and report a
# single, machine-readable verdict.
#
# Checks, in dependency order:
#   1. the database container is running
#   2. Docker reports it healthy
#   3. Postgres is accepting connections
#   4. the PostGIS extension is loaded
#   5. every application table exists
#   6. the API answers on its health route
#
# Exit codes:  0 = all checks passed   1 = at least one check failed
#              2 = usage error
#
# Usage:
#   ./scripts/healthcheck.sh                 human-readable report
#   ./scripts/healthcheck.sh --json          one JSON object, for monitoring
#   ./scripts/healthcheck.sh --watch 30      re-run every 30 seconds
#   ./scripts/healthcheck.sh --quiet         no output, exit code only
#   ./scripts/healthcheck.sh --skip-api      database tier only (used in CI)
#
set -euo pipefail

CONTAINER="${CONTAINER:-qr_attendance_db}"
DB_USER="${DB_USER:-admin}"
DB_NAME="${DB_NAME:-attendance_db}"
API_URL="${API_URL:-http://localhost:3001/api/health}"

EXPECTED_TABLES="attendance classrooms courses enrollments lecturers sessions students"

MODE="text"
WATCH_INTERVAL=""
SKIP_API=0

usage() {
  sed -n '2,26p' "$0" | sed 's|^# \{0,1\}||'
  exit "${1:-0}"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --json)  MODE="json" ;;
    --quiet) MODE="quiet" ;;
    --skip-api) SKIP_API=1 ;;
    --watch)
      shift
      WATCH_INTERVAL="${1:-15}"
      case "$WATCH_INTERVAL" in
        ''|*[!0-9]*) echo "error: --watch needs a number of seconds" >&2; exit 2 ;;
      esac
      ;;
    -h|--help) usage 0 ;;
    *) echo "error: unknown option '$1'" >&2; usage 2 ;;
  esac
  shift
done

if [ -t 1 ] && [ "$MODE" = "text" ]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; DIM=$'\033[2m'; RESET=$'\033[0m'
else
  GREEN=""; RED=""; DIM=""; RESET=""
fi

FAILURES=0
RESULTS=""

record() {
  local name="$1" ok="$2" detail="${3:-}"

  if [ "$ok" -eq 0 ]; then
    [ "$MODE" = "text" ] && printf '  %sPASS%s  %-34s %s%s%s\n' \
      "$GREEN" "$RESET" "$name" "$DIM" "$detail" "$RESET"
  else
    FAILURES=$((FAILURES + 1))
    [ "$MODE" = "text" ] && printf '  %sFAIL%s  %-34s %s\n' \
      "$RED" "$RESET" "$name" "$detail"
  fi

  # Build JSON incrementally so --json emits one object per run.
  local status="pass"; [ "$ok" -eq 0 ] || status="fail"
  local escaped; escaped=$(printf '%s' "$detail" | sed 's/"/\\"/g')
  RESULTS="${RESULTS}{\"check\":\"${name}\",\"status\":\"${status}\",\"detail\":\"${escaped}\"},"
}

psql_in_container() {
  docker exec "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1" 2>/dev/null
}

run_checks() {
  FAILURES=0
  RESULTS=""

  [ "$MODE" = "text" ] && printf '\nQR Attendance — stack health  %s(%s)%s\n\n' \
    "$DIM" "$(date '+%Y-%m-%d %H:%M:%S')" "$RESET"

  # 1. container running
  if docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    record "container running" 0 "$CONTAINER"
  else
    record "container running" 1 "$CONTAINER is not up"
    finish; return
  fi

  # 2. docker healthcheck
  local health
  health=$(docker inspect --format '{{.State.Health.Status}}' "$CONTAINER" 2>/dev/null || echo unknown)
  [ "$health" = "healthy" ] && record "docker healthcheck" 0 "$health" \
                            || record "docker healthcheck" 1 "reported '$health'"

  # 3. postgres accepting connections
  if docker exec "$CONTAINER" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
    record "postgres accepting connections" 0 "$DB_NAME as $DB_USER"
  else
    record "postgres accepting connections" 1 "pg_isready refused"
    finish; return
  fi

  # 4. postgis loaded
  local postgis
  postgis=$(psql_in_container "SELECT extversion FROM pg_extension WHERE extname='postgis'" || true)
  [ -n "$postgis" ] && record "postgis extension" 0 "v${postgis}" \
                    || record "postgis extension" 1 "not installed"

  # 5. schema present
  local missing=""
  for table in $EXPECTED_TABLES; do
    local found
    found=$(psql_in_container \
      "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${table}'" || true)
    [ -z "$found" ] && missing="${missing}${table} "
  done
  [ -z "$missing" ] && record "schema tables present" 0 "all 7 tables" \
                    || record "schema tables present" 1 "missing: ${missing%% }"

  # 6. api liveness — skipped entirely when only the data tier is deployed
  if [ "$SKIP_API" -eq 1 ]; then
    finish; return
  fi

  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$API_URL" 2>/dev/null || echo 000)
  case "$code" in
    2??) record "api responding" 0 "HTTP $code at $API_URL" ;;
    000) record "api responding" 1 "no response from $API_URL" ;;
    *)   record "api responding" 1 "HTTP $code from $API_URL" ;;
  esac

  finish
}

finish() {
  if [ "$MODE" = "json" ]; then
    printf '{"timestamp":"%s","healthy":%s,"failures":%d,"checks":[%s]}\n' \
      "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" \
      "$([ "$FAILURES" -eq 0 ] && echo true || echo false)" \
      "$FAILURES" \
      "${RESULTS%,}"
  elif [ "$MODE" = "text" ]; then
    if [ "$FAILURES" -eq 0 ]; then
      printf '\n  %sStack healthy — all checks passed.%s\n\n' "$GREEN" "$RESET"
    else
      printf '\n  %s%d check(s) failed.%s\n\n' "$RED" "$FAILURES" "$RESET"
    fi
  fi
}

if [ -n "$WATCH_INTERVAL" ]; then
  trap 'echo; echo "stopped."; exit 0' INT
  while true; do
    run_checks
    sleep "$WATCH_INTERVAL"
  done
else
  run_checks
  [ "$FAILURES" -eq 0 ] && exit 0 || exit 1
fi
