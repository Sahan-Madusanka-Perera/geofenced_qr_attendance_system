# 🎓 QR Attendance System

A secure, anti-cheat university attendance system using dynamic QR codes, GPS geofencing, device fingerprinting, and real-time analytics.

## Architecture

```
[ Projector Screen ] → Displays Dynamic QR Code (refreshes every 10s)
         |
[ Student Phone ] → Scans QR → Browser opens → Submits GPS + Device ID
         |
[ Backend API ] → Validates: Token Expiry + Geofence Match + Device Lock
         |
[ PostgreSQL + PostGIS ] → Records Attendance & Calculates Progress
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | PostgreSQL 16 + PostGIS 3.4 |
| Auth | JWT + bcrypt |
| QR | `qrcode` npm + AES-256-CBC encryption |
| Geofencing | PostGIS `ST_Contains` |
| Device Lock | FingerprintJS (open-source) |
| Real-time | Server-Sent Events (SSE) |

## Quick Start

### 1. Start Database
```bash
docker compose up -d
```

### 2. Run Migrations
```bash
# Wait for DB to be healthy, then run the migrations inside the container:
docker exec -i qr_attendance_db psql -U admin -d attendance_db < db/migrations/001_init.sql
docker exec -i qr_attendance_db psql -U admin -d attendance_db < db/migrations/002_seed.sql
```
*(Note: The database is mapped to port **5433** on the host to prevent conflicts with any local Postgres installations)*

### 3. Start Backend
```bash
cd server
npm install
npm run dev
```

### 4. Start Frontend
```bash
cd client
npm install
npm run dev
```

### 5. Open in Browser
- **Student/Lecturer Portal**: http://localhost:5173
- **API Health Check**: http://localhost:3001/api/health

## Test Accounts (Seed Data)

| Role | ID | Password |
|------|-----|----------|
| Lecturer | LEC001 | password123 |
| Student | 2021CS001 | password123 |
| Student | 2021CS002 | password123 |

## Features

- 🔄 **Dynamic QR Codes** — Rotate every 10 seconds to prevent screenshot sharing
- 📍 **GPS Geofencing** — PostGIS polygon check ensures students are physically in the classroom
- 🔒 **Device Locking** — One device per student via browser fingerprinting
- 📊 **80% Analytics** — Visual progress rings with "can miss X more" calculations
- 📥 **CSV/Excel Export** — Lecturer reports with color-coded attendance percentages
- 🗺️ **Geofence Editor** — Interactive Leaflet map for drawing classroom boundaries
- 📽️ **Projector Mode** — Full-screen QR display optimized for classroom projectors
