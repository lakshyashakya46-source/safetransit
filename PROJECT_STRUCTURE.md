# SafeTransit Project Structure & Architecture

A modular, enterprise-grade architecture split cleanly across concerns:

## Client Layer (`client/src/`)
- `components/`
  - `Topbar.jsx` — Header with live incident ticker, 1-click role switcher (5 personas), unread notifications drawer, and demo reset.
  - `Sidebar.jsx` — Dynamic role-tailored navigation panel.
  - `StatusBadge.jsx` — Color-coded operational status chips with live pulse indicators.
  - `MetricCard.jsx` — High-density KPI indicator cards.
  - `DataTable.jsx` — Reusable responsive operational tables.
- `pages/`
  - `Dashboard.jsx` — Executive Control Center with Recharts (Fatigue donut, fleet readiness bar chart, weekly duty area chart).
  - `SmartDutyAssignment.jsx` — Journey segmentation, candidate driver/conductor heuristic ranking, and mandatory manual override modal.
  - `DriverCockpit.jsx` — Driver's today duty, 8-point pre-trip checklist, handover, overtime and emergency SOS.
  - `ConductorWorkbench.jsx` — Passenger ticket categories (Adult, Student, Pass, Luggage), UPI/Cash reconciliation, shortfall dispute explanations.
  - `AccountsPortal.jsx` — Overtime payout authorization (₹350/hr), treasury vouchers, and fare shortfall audit settlement.
  - `LeaveReplacementPage.jsx` — Leave management and 1-click smart replacement finder.
  - `EmergencyCommandPage.jsx` — Real-time incident command board with response action log.
  - `VehicleHealthPage.jsx` — Pre-trip inspection records with automatic defect grounding.
  - `HandoverPage.jsx` — Long-distance transit relay handovers with mismatch alerts.
  - `MapPage.jsx` — Leaflet & OpenStreetMap highway map with live telemetry pins.
  - `PolicyPage.jsx` — Department safety thresholds editor with auditable reasons.
  - `AuditLogPage.jsx` — Searchable, immutable operational audit ledger.
  - `DataSourcesPage.jsx` — GTFS specifications, OpenStreetMap attribution, and privacy disclaimer.
  - `Login.jsx` — Government operations sign-in with 1-click role presets.
- `services/`
  - `api.js` — Centralized API service with JWT authorization and automated logout on expiration.

## Server Layer (`server/src/`)
- `db/`
  - `postgres.js` — Native PostgreSQL client with connection pooling, automatic table creation, GIN indexes, and query builders.
  - `connection.js` — Resilient database manager (PostgreSQL + LocalStore fallback).
  - `localStore.js` — In-memory/disk JSON database with identical API and zero-crash guarantee.
  - `seedData.js` — Comprehensive synthetic dataset across 15 models.
- `models/index.js` — Universal proxy models providing transparent CRUD across PostgreSQL and fallback backends.
- `services/safety.js` — Rule-based fatigue calculation, route segmentation, and crew ranking heuristics.
- `controllers/`
  - `authController.js` — JWT issuance, password hashing, session recovery, user registration, and 1-click demo role switching.
  - `analyticsController.js` — Operational KPIs and chart aggregation for Recharts.
- `routes/`
  - `auth.js` — Authentication endpoints (`/login`, `/register`, `/switch-role`, `/me`, `/users`).
  - `api.js` — Complete REST API suite with smart assignment and inspection endpoints.

## Docker & Containerization
- `docker-compose.yml` — Multi-container orchestration for PostgreSQL 16 Alpine, Express backend, and React/Vite/Nginx frontend.
- `server/Dockerfile` — Production Node.js 18 Alpine image for SafeTransit backend.
- `server/init.sql` — PostgreSQL DDL initialization script for automatic table creation upon container startup.
- `client/Dockerfile` & `client/nginx.conf` — Multi-stage build and Nginx reverse proxy.
