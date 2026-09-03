# Runbook — QR Attendance System

Operational reference for running, deploying and troubleshooting the stack.
Written for whoever is on call, including a future version of me who has
forgotten how this works.

---

## 1. Architecture at a glance

| Tier | Technology | Port | Owned by |
|---|---|---|---|
| Client | React 19 + Vite, React Router, Leaflet | 5173 (dev) | `client/` |
| API | Node.js 20 + Express | 3001 | `server/` |
| Database | PostgreSQL 16 + PostGIS 3.4 | 5433 → 5432 | `docker-compose.yml` |

The database is the only containerised tier. The API and client run on the
host during development.

**Why PostGIS:** geofence containment is a spatial question
(`ST_Contains(polygon, point)`). Doing it in the database keeps the check
server-side where a student cannot tamper with it, and the GIST index on
`classrooms.geofence` keeps it fast as classrooms are added.

---

## 2. Standard operating procedures

### 2.1 First-time setup

```bash
# 1. Bring up the database
docker compose up -d

# 2. Wait for it to report healthy (usually <10s)
./scripts/healthcheck.sh --skip-api

# 3. Apply schema and seed data
export PGPASSWORD=attendance_secret_2024
for m in db/migrations/*.sql; do
  psql -h localhost -p 5433 -U admin -d attendance_db -v ON_ERROR_STOP=1 -f "$m"
done

# 4. Install dependencies
(cd server && npm ci)
(cd client && npm ci)

# 5. Start the API and client
(cd server && npm run dev)   # terminal 1
(cd client && npm run dev)   # terminal 2
```

### 2.2 Daily start / stop

```bash
docker compose up -d     # start
docker compose stop      # stop, keeping data
docker compose down      # stop and remove the container, keeping the volume
docker compose down -v   # DESTRUCTIVE: also deletes the data volume
```

> `down -v` drops all attendance records. Only use it when you intend to
> rebuild from migrations.

### 2.3 Running the tests

```bash
cd server
npm run test:unit                                   # no database required
DB_HOST=localhost DB_PORT=5433 npm test             # full suite
```

The integration tests create and delete their own fixtures (`CI Test Hall`,
students `CI-TEST-ALICE` / `CI-TEST-BOB`) and clean up in an `after` hook.
They are safe to run against a development database.

### 2.4 Health monitoring

```bash
./scripts/healthcheck.sh                # human-readable report
./scripts/healthcheck.sh --json         # one JSON object per run
./scripts/healthcheck.sh --watch 30     # continuous, every 30s
./scripts/healthcheck.sh --skip-api     # data tier only
```

Exit code is `0` when every check passes and `1` otherwise, so it composes
with cron, systemd timers, or any monitoring agent that reads exit codes:

```cron
*/5 * * * * /path/to/scripts/healthcheck.sh --quiet || logger -t qr-attendance "stack degraded"
```

---

## 3. Migrations

Migrations live in `db/migrations/` and are applied in filename order.

**All migrations are idempotent.** Re-applying the full set against a
populated database is a no-op:

- DDL uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`.
- Every seed insert carries an `ON CONFLICT (...) DO NOTHING` clause backed by
  a real unique constraint.

This is enforced in CI: the pipeline applies the migrations, then applies them
a second time, and fails if the second pass errors.

### Adding a migration

1. Create `db/migrations/00N_description.sql`.
2. Make every statement idempotent.
3. If you add a seeded table, add a matching unique index so `ON CONFLICT` has
   something to target.
4. Add or extend a test in `server/tests/schema.test.js`.
5. Verify locally against a clean volume:
   ```bash
   docker compose down -v && docker compose up -d
   # apply twice; the second pass must be silent
   ```

---

## 4. CI pipeline

`.github/workflows/ci.yml` runs on every push and pull request to `main`.

| Job | Depends on | What it proves |
|---|---|---|
| `unit` | — | JWT issuing, expiry and tamper rejection work without a database |
| `integration` | `unit` | Migrations apply to a real PostGIS instance, are idempotent, and the geofence + device-binding rules behave |
| `client` | — | The frontend lints (advisory) and produces a production build |
| `compose` | `integration` | The compose stack builds, reports healthy, and passes the same health probes used in production |

`unit` and `client` run in parallel. `integration` gates `compose` so an
expensive container run is not started behind a failing test suite.

**Lint is advisory** (`continue-on-error: true`) while a backlog of
`react-hooks` findings is worked down. It is reported on every run but does
not block a merge. Remove that flag once the backlog is clear.

---

## 5. Troubleshooting

### `docker compose up` succeeds but the healthcheck never goes green

```bash
docker compose logs db
docker inspect --format '{{json .State.Health}}' qr_attendance_db | python3 -m json.tool
```

A corrupt volume from an interrupted initdb is the usual cause. Rebuild:
`docker compose down -v && docker compose up -d`, then re-apply migrations.

### `ECONNREFUSED` from the API

The compose file publishes Postgres on host port **5433**, not 5432, so it can
coexist with a local Postgres install. Confirm the server's `DB_PORT=5433`.

### `relation "..." already exists` when migrating

A migration is not idempotent. Every `CREATE` needs its `IF NOT EXISTS`. See
section 3.

### `ERROR: type "geometry" does not exist`

PostGIS was not initialised. The extension is created by
`db/docker-init/00-create-extensions.sql`, which Postgres runs **only on an
empty data directory**. If the volume already existed, create it by hand:

```bash
docker exec qr_attendance_db psql -U admin -d attendance_db \
  -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### A student reports "Device mismatch"

By design: one device per student. The binding lives in
`students.device_fingerprint`. To release a device after a legitimate phone
change:

```sql
UPDATE students SET device_fingerprint = NULL WHERE reg_number = 'FC211033';
```

The next successful check-in re-binds the new device.

### Check-in rejected inside the classroom

Verify the geofence polygon actually covers the room:

```sql
SELECT ST_Contains(geofence, ST_SetSRID(ST_Point(<lng>, <lat>), 4326))
FROM classrooms WHERE id = <classroom_id>;
```

Note the argument order — `ST_Point` takes **(longitude, latitude)**. Swapping
them is the most common cause of a false rejection.

---

## 6. Configuration

| Variable | Default | Notes |
|---|---|---|
| `DB_HOST` | `localhost` | |
| `DB_PORT` | `5432` | Set to `5433` when using compose |
| `DB_NAME` | `attendance_db` | |
| `DB_USER` | `admin` | |
| `DB_PASSWORD` | `attendance_secret_2024` | Development default only |
| `DATABASE_URL` | — | If set, overrides the above and forces SSL |
| `JWT_SECRET` | `fallback-secret` | **Must** be overridden in production |
| `QR_TOKEN_TTL_SECONDS` | `10` | QR rotation window |
| `PORT` | `3001` | API port |

> The committed defaults are development credentials. Before any real
> deployment, replace `JWT_SECRET` and `DB_PASSWORD` with generated secrets
> supplied through the environment, never through a committed file.
