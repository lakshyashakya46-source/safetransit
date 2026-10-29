# SafeTransit — Enterprise Public Transport Safety & Operations Command

> **Tagline:** *"Right Person + Right Bus + Right Route + Right Time + Safe Working Hours."*

A full-stack, end-to-end, public transport crew safety and operational management platform. Built to eliminate fragmented paperwork, prevent driver fatigue accidents, provide auditable duty allocation, streamline conductor fare reconciliation, and track emergency response.

---

## 🚀 Key Features & Enterprise Modules

### 1. 🛡️ Advanced Rule-Based Fatigue & Safety Engine
- **Statutory Compliance:** Built strictly on Motor Transport Workers Act guidelines and department safety policies (no AI hallucinations for life-critical safety decisions).
- **Multi-Factor Risk Scoring:** Evaluates daily duty hours (max 10h), continuous steering hours (max 8h), minimum rest between shifts (min 10h), weekly cumulative working limits (max 48h), consecutive working days (max 6 days), and night shift circadian disruption factors (1.25x multiplier).
- **Visual Compliance Signals:** 🟢 Eligible, 🟡 Review Required, 🔴 Not Eligible.

### 2. ⚡ Smart Duty Allocation & Journey Segmentation
- **Intelligent Long-Route Splitting:** Automatically divides journeys exceeding 6 hours (e.g. Jaipur → Ahmedabad → Mumbai) into crew-safe legs with designated transit handover points.
- **Heuristic Ranking:** Evaluates available verified drivers and conductors in real-time, ranking candidates by rest hours, fatigue scores, and zero timetable conflicts.
- **Mandatory Manual Override Ledger:** Officers can override safety locks only with a mandatory, non-empty justification reason that permanently logs the officer ID, timestamp, and rationale to an immutable audit trail.

### 3. 👥 Dedicated Role-Based Personas (5 Primary Personas)
- **🏛️ Transport Authority (`authority@demo.com`):** Apex Executive Command Center with Recharts analytics (Fatigue Risk Distribution, Fleet Availability, Weekly Load Trends), Policy Engine configuration, state-level governance, and system-wide audit trails.
- **🏢 Depot Officer (`officer@demo.com`):** Smart Duty Allocation workbench, Leave & Crew Replacement approvals, Overtime authorization, and vehicle maintenance clearance.
- **🚍 Driver Cockpit (`driver@demo.com`):** Today's assigned bus and route stops, Pre-Trip Vehicle Health Checklist (8-point walkaround inspection), digital duty handover, overtime claims, and 1-tap SOS emergency alert.
- **🎫 Conductor Workbench (`conductor@demo.com`):** Digital Passenger Waybill with passenger count categorization (Standard, Student/Senior Concession, Monthly Pass, Luggage), Cash vs UPI QR payment splits, real-time discrepancy calculator, and dispute explanation filing.
- **💼 Accounts Officer (`accounts@demo.com`):** Overtime payout authorization with automatic rate calculation (₹350/hr), Treasury voucher generation (`PAY-OT-XXXX`), and fare shortfall audit settlement.

### 4. 🔄 Leave & 1-Click Smart Replacement Finder
- When crew members apply for leave, the system scans scheduled duties and instantly queries available backup crew with matching qualifications and compliant rest hours.
- Depot officers can review and confirm replacement assignment in one click.

### 5. 🚨 Real-Time Emergency Incident Command
- Pulsing red incident ticker on all dashboards.
- Lifecycle tracking: `Reported` → `Acknowledged` → `Responding` → `Resolved` → `Closed` with workshop dispatch notes.

### 6. 🔧 Pre-Trip Vehicle Health & Auto-Grounding
- 8-point digital inspection before departure (Brakes, Steering, Tyres, Lights, Horn, Emergency Exits, Fire Extinguisher, Engine Fluids).
- Critical defects (brakes, steering, tyres) automatically switch the vehicle to `Maintenance Required` and ground it from duty dispatch.

### 7. 🗺️ Geospatial Highway Telemetry Map
- Interactive Leaflet & OpenStreetMap operational map with multi-corridor routes across Jaipur, Delhi, Ajmer, Kota, Udaipur, and Mumbai.
- Live bus pins with telemetry badges, depots, crew change points, and emergency locations.

### 8. 🐘 Enterprise PostgreSQL & Docker Architecture
- **PostgreSQL Database:** Powered by `pg` (node-postgres) with automatic DDL table creation and GIN indexes on JSONB payloads.
- **Docker Ready:** Run PostgreSQL in Docker via `docker compose up -d postgres` or launch the full stack with `docker compose up --build`.
- **Resilient Fallback Engine:** If PostgreSQL container is offline during local testing, it automatically activates the built-in High-Performance Local JSON Engine (`server/data/safetransit.json`) with zero crashes and full data persistence across restarts.

---

## 🏃 Quick Start Guide

### Option A: Running with Docker (Recommended)

To start PostgreSQL in Docker and run frontend/backend locally:
```bash
# 1. Start PostgreSQL in background
docker compose up -d postgres

# 2. Run backend & frontend concurrently
npm run dev
```

Or run the entire multi-container stack in Docker:
```bash
docker compose up --build
```

---

### Option B: Running without Docker (Local Fallback)

SafeTransit runs out-of-the-box even without Docker/PostgreSQL running:
```bash
# 1. Install dependencies
npm run install:all

# 2. Start development servers
npm run dev
```

- **Frontend Application:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## 🔑 Demo Login Accounts

All accounts share the default password: **`Demo@12345`**

| Persona | Email | Purpose & Key Demonstration View |
|---|---|---|
| **Transport Authority** | `authority@demo.com` | State-level Governance, Safety Policy Engine & System Audit |
| **Depot Officer** | `officer@demo.com` | Smart Duty Allocation, Overtime & Leave Replacement |
| **Driver** | `driver@demo.com` | Today's Duty, Pre-Trip Checklist, Handover & SOS Alert |
| **Conductor** | `conductor@demo.com` | Passenger Waybill, UPI/Cash Reconciliation & Disputes |
| **Accounts Officer** | `accounts@demo.com` | Overtime Payout Authorization & Fare Discrepancy Audits |

*(Tip: In the top navigation bar, use the **Role View** dropdown to switch between all 5 personas in 1 click without logging out!)*

---

## 📁 Technical Architecture

```
SafeTransit/
├── client/                     # Vite + React 18 + Tailwind CSS frontend
│   ├── src/
│   │   ├── components/         # Topbar (5 roles), Sidebar, MetricCard, StatusBadge, DataTable
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx            # Executive Analytics with Recharts
│   │   │   ├── SmartDutyAssignment.jsx  # Smart allocation & segmentation
│   │   │   ├── DriverCockpit.jsx        # Driver cockpit & pre-trip inspections
│   │   │   ├── ConductorWorkbench.jsx   # Passenger waybill & fare settlement
│   │   │   ├── AccountsPortal.jsx       # Overtime payouts & discrepancy audits
│   │   │   ├── LeaveReplacementPage.jsx # Leave & 1-click backup crew finder
│   │   │   ├── EmergencyCommandPage.jsx # Live incident command & dispatch
│   │   │   ├── VehicleHealthPage.jsx    # Vehicle health logs & grounding
│   │   │   ├── HandoverPage.jsx         # Intercity crew relay handovers
│   │   │   ├── MapPage.jsx              # Leaflet highway telemetry map
│   │   │   ├── PolicyPage.jsx           # Department safety threshold policies
│   │   │   ├── AuditLogPage.jsx         # Searchable immutable audit trail
│   │   │   ├── DataSourcesPage.jsx      # GTFS standards & data provenance
│   │   │   ├── ResourcePage.jsx         # General fleet & crew management
│   │   │   └── Login.jsx                # GovTech login with 5 1-click accounts
│   │   └── services/api.js     # Centralized REST client with JWT handling
│   ├── Dockerfile              # Production multi-stage Nginx container
│   └── nginx.conf              # Nginx reverse proxy configuration
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── config/env.js       # Environment configuration (PostgreSQL URL)
│   │   ├── db/
│   │   │   ├── postgres.js     # Native PostgreSQL connection pool & GIN indexes
│   │   │   ├── connection.js   # Fast fallback connection manager
│   │   │   ├── localStore.js   # Zero-config high-performance JSON store
│   │   │   └── seedData.js     # Comprehensive synthetic Indian transport dataset (5 roles)
│   │   ├── models/index.js     # Unified proxy models (PostgreSQL + LocalStore)
│   │   ├── services/safety.js  # Rule-based fatigue engine & segmentation heuristics
│   │   ├── controllers/        # Auth (5 roles) and Analytics controllers
│   │   ├── middleware/         # JWT auth & error handling
│   │   └── routes/             # REST APIs (/api/auth, /api/smart-assignment, etc.)
│   ├── Dockerfile              # Node.js 18 Alpine Docker image
│   ├── init.sql                # PostgreSQL DDL table initialization script
│   └── data/safetransit.json   # Local persistent database
├── docker-compose.yml          # Multi-container orchestration (Postgres, Server, Client)
└── package.json                # Root concurrent & docker runner scripts
```
