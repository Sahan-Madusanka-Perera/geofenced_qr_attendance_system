# QR Attend

Attendance for university lectures, built so that being marked present requires
actually being in the room.

Paper sign-in sheets get passed down a row. Static QR codes get screenshotted
and WhatsApp'd to the friend who slept in. This system closes both by refusing
to trust any single signal: the code on the projector re-encrypts every ten
seconds, the room is a polygon evaluated inside PostgreSQL, and a student's
browser is bound to their record on first use. A check-in has to clear all
three at once, in that order, server-side.

---

## The three ways students beat QR attendance

| The move | What stops it |
|---|---|
| Screenshot the projector, send it to a friend | The token is AES-256-CBC encrypted with a fresh IV and an 8-byte nonce, and dies 15 seconds after it is minted. The projector mints a new one every 10. |
| Check in from the cafeteria | `ST_Contains(classroom.geofence, ST_Point(lng, lat))` runs in Postgres against a polygon the phone never receives. |
| Check in on a friend's behalf from your own phone | A FingerprintJS visitor id is written to `students.device_fingerprint` on first check-in. A second device is refused, not silently accepted. |

None of the three is clever on its own. Requiring them simultaneously — and
putting the spatial test in the database rather than in a JavaScript distance
check the client could influence — is the part worth looking at.

## What happens when a phone scans the code

`server/src/routes/attendance.routes.js` runs four gates and stops at the first
refusal, returning which one it was:

1. **Token** — decrypt, look up the session, reject if it is inactive or if
   `token_expires` has passed.
2. **Enrolment** — reject if the student is not enrolled in that course.
3. **Device** — compare the submitted fingerprint against the bound one.
4. **Position** — `ST_Contains` against the classroom polygon.

The client shows that ladder as it resolves, with the value each gate actually
saw: the coordinates the phone reported and their accuracy, the first bytes of
the bound device id, the seconds the token had left. A rejection at *Position*
is therefore also proof that the token and the device were fine, and the UI
says so rather than colouring everything red.

The token's life (15s) is deliberately longer than the rotation interval (10s).
A student who starts scanning half a second before the board turns still
clears; without the overlap they would be refused for the crime of having slow
hands.

## Running it

The database is the only containerised piece. It publishes on host port
**5433** so it does not collide with a local Postgres.

```bash
docker compose up -d
./scripts/healthcheck.sh --skip-api          # wait for green, ~10s

export PGPASSWORD=attendance_secret_2024
for m in db/migrations/*.sql; do
  psql -h localhost -p 5433 -U admin -d attendance_db -v ON_ERROR_STOP=1 -f "$m"
done

(cd server && npm ci && npm run dev)          # :3001
(cd client && npm ci && npm run dev)          # :5173
```

Seed accounts, all with the password `password123`:

| | |
|---|---|
| Lecturer | `LEC001` · `LEC002` |
| Student | `2021CS001` … `2021CS003`, `2021EE001`, `2021EE002` |

Sign in as the lecturer, start a session, open `/projector`, and scan the code
with a phone. GPS has to land inside the seeded polygon around the University
of Colombo, so on a laptop you will want to override the location before the
geofence check will pass.

`docs/RUNBOOK.md` covers migrations, CI, health checks and the failure modes
that actually come up.

## Decisions worth defending

**PostGIS instead of a Haversine check in Node.** A radius comparison in
application code means shipping the classroom's centre and radius to the
client, or trusting a distance the client computed. `ST_Contains` against a
GIST-indexed polygon keeps the boundary server-side, handles rooms that are not
circles, and stays fast as classrooms are added. The cost is a hard dependency
on the PostGIS extension, which is why `db/docker-init/` creates it and
`schema.test.js` asserts it.

**Server-Sent Events instead of WebSockets.** QR rotation is one-directional
and low-frequency. SSE gives it reconnection for free and needs no protocol
upgrade. The wrinkle: `EventSource` cannot set an `Authorization` header, so
`/api/qr/stream/:id` accepts the JWT as a query parameter and verifies it in
its own middleware. That is a real trade — the token lands in server logs — and
it is the reason that route is lecturer-only and carries nothing but images.

**One device per student, enforced rudely.** Losing a phone should be
inconvenient here; if re-binding were self-service the whole control would be
theatre. Release is a deliberate `UPDATE students SET device_fingerprint =
NULL`, documented in the runbook.

**The 80% figure is not decoration.** `analytics.service.js` inverts it into
the numbers students actually want: how many more classes they can miss and
still clear the line, or how many consecutive classes it now takes to get back
above it. Every progress bar in the interface prints that cutoff as a fixed
mark, so standing is read positionally before it is read as a number.

## What it doesn't do

- No password reset, no email verification, no refresh tokens. JWTs live 24h
  and that is the whole session story.
- Device binding is browser-scoped. Clearing site data changes the
  fingerprint; a lecturer has to release the old one.
- FingerprintJS's open-source build is defeatable by a determined student. It
  raises the cost of proxy attendance, it does not eliminate it.
- Lecturers can edit geofences for any classroom. There is no separate admin
  role.
- Nothing stops two sessions being open for the same course at once. The
  lecturer view simply shows the first active one it finds.

## Layout

```
client/    React 19 + Vite. Tailwind, Radix primitives, Leaflet for geofences.
server/    Express. Routes → services → pg. No ORM.
db/        Migrations, idempotent and applied in filename order.
docs/      RUNBOOK.md — operations, troubleshooting, config reference.
scripts/   healthcheck.sh — exit code 0/1, composes with cron.
```

## Tests

```bash
cd server
npm run test:unit                            # JWT issuing, expiry, tampering — no database
DB_HOST=localhost DB_PORT=5433 npm test      # + schema, geofence, fingerprint rules
```

Node's built-in test runner; no framework. The integration tests create and
drop their own fixtures, so they are safe against a development database.

CI (`.github/workflows/ci.yml`) runs four jobs: unit, integration against a
real PostGIS service, a client lint-and-build, and a compose run that applies
the migrations twice to prove they are idempotent. Lint is advisory while a
`react-hooks` backlog is worked down.

## Configuration

Defaults live in `.env.example`. Two of them must not survive contact with a
real deployment: `JWT_SECRET` and `QR_ENCRYPTION_KEY` are committed development
values, and anyone with the latter can mint valid check-in tokens.
