# Dutch Railway OLAP Analysis & Data Warehouse

> **Course / Project:** STADVDB - Advanced Database Systems (MCO1)  
> **Group Number:** Group `2`

---

## Group Members

| Name | Role / Contribution |
| :--- | :--- |
| `Angelo Joaquin Barras` | `OLAP Query#1 and Query#5` |
| `Gaibril Kyle Gregorio` | `Frontend & UI, OLAP Overview Query and Query#3` |
| `Jeremy Leano` | `ETL Script and OLAP Query#2` |
| `Paul Martin Ryan Crisologo` | `Data Warehouse Modeling and OLAP Query#4` |

---

## Project Overview

This project implements an end-to-end **On-Line Analytical Processing (OLAP)** system for Dutch railway service performance and delay analysis. It consists of:

- **Data Warehouse (PostgreSQL 17 in Docker):** Star schema containing dimension tables (`dim_date`, `dim_station`, `dim_service`) and a granular fact table (`fact_station_stop`).
- **ETL Pipeline (Python):** Ingests, cleans, and stages raw service logs into the star schema using high-throughput streaming COPY.
- **Backend API (Fastify + TypeScript):** High-performance OLAP query engine providing roll-up, drill-down, slice, dice, and pivot operations.
- **Frontend Dashboard (React 19 + Vite + Tailwind CSS):** Interactive OLAP explorer, trend visualizations, and KPI scorecards.

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Recharts, Lucide Icons
- **Backend:** Fastify 5, TypeScript, Node.js (>=24), `pg` (node-postgres)
- **Database:** PostgreSQL 17 (Docker containerized)
- **ETL:** Python 3.10+, `psycopg 3`, `python-dotenv`

---

## Prerequisites

Ensure you have the following installed before running the project:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (must be running)
- [Node.js](https://nodejs.org/) (version 20 LTS or Node 24 recommended) & `npm`
- [Python](https://www.python.org/) (version 3.10 or newer)

---

## Step-by-Step Setup & Execution

### 1. Environment Configuration

Create a `.env` file in the **project root** directory (copy from the example below or ensure values match):

```dotenv
POSTGRES_USER=stadvdb_mco1
POSTGRES_PASSWORD=local_dev_password
POSTGRES_DB=dutch-railway
POSTGRES_PORT=5432
```

> [!NOTE]
> The backend automatically reads this root `.env` file when starting. You can optionally create `backend/.env` if you want to override specific server variables (e.g., `PORT=3000`, `HOST=127.0.0.1`).

---

### 2. Start the Database (Docker)

From the project root directory, launch the PostgreSQL container:

```powershell
docker compose up -d --wait postgres
```

Verify that the container is healthy:

```powershell
docker compose ps
```

Expected output:
```text
NAME          SERVICE    STATUS                   PORTS
postgres_db   postgres   Up ... (healthy)          127.0.0.1:5432->5432/tcp
```

---

### 3. Run the ETL Pipeline (One-Time Data Ingestion)

The ETL script creates the star schema and populates the data warehouse with service logs from `data/services-2025.csv`.

From the project root:

```powershell
# Create and activate Python virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install ETL dependencies
pip install -r etl/requirements.txt

# Run the data loader
python etl/load_services.py
```

> [!TIP]
> The loader will stream the CSV into staging and populate `dim_date`, `dim_station`, `dim_service`, and `fact_station_stop`. Wait for the confirmation message indicating the warehouse load is complete.

---

### 4. Start the Backend API

Open a new terminal window:

```powershell
cd backend
npm install
npm run dev
```

- The API server will start at `http://127.0.0.1:3000`.
- Fastify provides live reload with local timestamps and colored request logs.

---

### 5. Start the Frontend Dashboard

Open another terminal window:

```powershell
cd frontend
npm install
npm run dev
```

- The frontend development server will start at `http://localhost:5173`.
- Open `http://localhost:5173` in your web browser to interact with the OLAP dashboard.

---

## Public Sharing via ngrok (Remote Demo)

Because the Vite dev server forwards all `/api/*` calls directly to the local Fastify backend, **you only need to expose the frontend port via ngrok**.

### Option A: Development Mode (with Live Reload)

1. Make sure backend (`npm run dev`) and frontend (`npm run dev`) are running locally.
2. In a separate terminal, expose the Vite dev server (port `5173`):
   ```powershell
   ngrok http 5173 --region ap
   ```
3. Share the generated `https://<unique-id>.ngrok-free.app` URL.

### Option B: Production Preview Mode (Recommended for Demos)

For external viewers, serving the bundled production build is much faster through ngrok than dev mode:

```powershell
# 1. Build and preview frontend (port 4173)
cd frontend
npm run build
npm run preview

# 2. In another terminal, tunnel port 4173
ngrok http 4173 --region ap
```

> [!IMPORTANT]
> Your local machine must remain **powered on, awake, and connected to the internet** with the backend, frontend, and Docker running while anyone is accessing the ngrok link.

---

## Database Management & Useful Commands

### Interactive SQL Shell (`psql`)
Open an interactive `psql` session inside the running container:

```powershell
docker compose exec postgres psql -U stadvdb_mco1 -d dutch-railway
```

Quick verification queries:
```sql
-- Set search path to the warehouse schema
SET search_path TO dutch_railway_dw, public;

-- Check record counts
SELECT 'fact_station_stop' AS table_name, count(*) FROM fact_station_stop
UNION ALL
SELECT 'dim_service', count(*) FROM dim_service
UNION ALL
SELECT 'dim_station', count(*) FROM dim_station
UNION ALL
SELECT 'dim_date', count(*) FROM dim_date;
```
*(Type `\q` to exit psql)*

### Container Lifecycle
```powershell
# Stop the database (preserves data)
docker compose stop postgres

# Restart the database
docker compose start postgres

# View database logs
docker compose logs --tail 100 postgres

# Stop and remove containers (data preserved in postgres_data volume)
docker compose down

# WARNING: Completely remove database including saved data
docker compose down -v
```

### Port 5432 Conflict Troubleshooting
If port `5432` is already in use by a local PostgreSQL service:
1. Check conflicting process:
   ```powershell
   Get-NetTCPConnection -LocalPort 5432 -State Listen | Select-Object LocalAddress, LocalPort, OwningProcess
   ```
2. Or change the port mapping in `docker-compose.yml` to `"127.0.0.1:5433:5432"` and connect on port `5433`.

---

## Project Structure

```text
dutch-railway-olap/
├── backend/                  # Fastify REST API & OLAP query endpoints
│   ├── src/
│   │   ├── app.ts            # Fastify server entry point
│   │   └── endpoints.ts      # OLAP analytical endpoints (slice, dice, pivot, etc.)
│   └── package.json
├── frontend/                 # React 19 + Tailwind CSS + Vite application
│   ├── src/
│   │   ├── components/       # UI charts, tables, filter bars, and controls
│   │   ├── services/         # API fetchers for OLAP analytics
│   │   └── App.tsx           # Main application view
│   ├── vite.config.ts        # Proxy configuration & allowed ngrok hosts
│   └── package.json
├── etl/                      # Data pipeline & ingestion scripts
│   ├── load_services.py      # Staging & star schema loader
│   └── requirements.txt      # Python dependencies (psycopg, python-dotenv)
├── sql/
│   └── dutch_railway_dw.sql  # DDL script for star schema & dimensions
├── data/                     # Raw dataset (services-2025.csv)
├── docker-compose.yml        # PostgreSQL 17 service configuration
└── README.md
```

---

## Scripts Reference Cheatsheet

| Location | Command | Description |
| :--- | :--- | :--- |
| **Root** | `docker compose up -d --wait postgres` | Start database container |
| **Root** | `python etl/load_services.py` | Run ETL data ingestion |
| **`backend/`** | `npm run dev` | Run backend in development watch mode |
| **`backend/`** | `npm run build` | Compile TypeScript backend to `dist/` |
| **`backend/`** | `npm start` | Run compiled backend |
| **`backend/`** | `npm run typecheck` | Run TypeScript type checks |
| **`frontend/`** | `npm run dev` | Run frontend in development mode (`:5173`) |
| **`frontend/`** | `npm run build` | Build optimized production bundle |
| **`frontend/`** | `npm run preview` | Serve production build locally (`:4173`) |
