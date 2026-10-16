# CampusFlow AI
> *"Find the right space. Make every room count."*

Intelligent campus-space management and demand forecasting platform developed for university datathons. CampusFlow AI couples interval-overlap conflict detection against class schedules and campus events with an independently trained scikit-learn machine learning microservice (`datathonapi`) for room-request demand forecasting.

---

## 1. System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                      │
│             React 19 + TypeScript + Vite + Tailwind          │
│          Port: 3000 (proxies /api to 8002, /api/ml to 8001)   │
└──────────────┬───────────────────────────────┬───────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐   ┌───────────────────────────┐
│     Main Backend (FastAPI)   │   │  ML Service (datathonapi) │
│       Port: 8002             │   │        Port: 8001         │
│  - Conflict Matching Engine  │   │  - RandomForestRegressor  │
│  - Utilization Analytics     │   │  - Calendar + Lag Feats   │
│  - Room Requests Intake      │   │  - Multi-step Recursive   │
└──────────────┬───────────────┘   └───────────┬───────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐   ┌───────────────────────────┐
│     SQLAlchemy ORM / DB      │   │   Saved Model Artifacts   │
│  - PostgreSQL (Primary)      │   │  - demand_model.joblib    │
│  - SQLite (Local Fallback)   │   │  - model_metadata.json    │
└──────────────────────────────┘   └───────────────────────────┘
```

---

## 2. Dataset Overview (`02_education_campus_space`)

Preserved in `data/02_education_campus_space/`:

1. **`rooms.csv`** (45 records):
   - `room_id`, `building`, `floor`, `room_type`, `capacity`, `projector`, `computers`, `accessible`, `power_outlets`
2. **`class_schedule.csv`** (95 records):
   - `schedule_id`, `room_id`, `course_code`, `weekday`, `start_hour`, `duration_hours`, `expected_attendance`, `department`
3. **`events.csv`** (31 records):
   - `event_id`, `room_id`, `event_type`, `start_time`, `duration_hours`, `expected_attendance`, `actual_attendance`
4. **`room_requests.csv`** (868 records):
   - `request_id`, `request_date`, `start_hour`, `duration_hours`, `required_capacity`, `projector_required`, `computers_required`, `purpose`, `status`

*Synthetic Data Disclosure:* The dataset consists of synthetic benchmark observations provided for university datathon evaluation. Records do not reflect live IoT physical sensors.

---

## 3. Installation & Setup

### A. Python Environment
```bash
# Create and activate virtual environment
python3 -m venv /venv
/venv/bin/pip install --upgrade pip

# Install dependencies for both backend and datathonapi
/venv/bin/pip install fastapi uvicorn pandas numpy scikit-learn scipy joblib sqlalchemy pydantic python-dotenv requests
```

### B. Node.js Frontend Dependencies
```bash
npm install
```

---

## 4. Commands to Import Data & Train ML Model

### A. Repeatable Database Import
Imports all 4 CSVs into PostgreSQL (or SQLite fallback) without duplicating records:
```bash
PYTHONPATH=. /venv/bin/python3 backend/scripts/import_data.py
```

### B. Train the ML Demand Model
Trains `RandomForestRegressor` with chronological split, compares against historical baseline, and outputs serialized artifacts:
```bash
/venv/bin/python3 datathonapi/training/train_demand_model.py
```

### C. Evaluate Model Artifact
Inspect saved test performance metrics and feature importances:
```bash
/venv/bin/python3 datathonapi/training/evaluate_model.py
```

---

## 5. Starting All Services

Run each component in a dedicated process:

### 1. ML Forecasting Service (`datathonapi`)
```bash
PYTHONPATH=. /venv/bin/uvicorn datathonapi.app.main:app --host 0.0.0.0 --port 8001
```

### 2. Main Backend API
```bash
PYTHONPATH=. /venv/bin/uvicorn backend.app.main:app --host 0.0.0.0 --port 8002
```

### 3. Frontend Web Application
```bash
npm run dev --port 3000 --host 0.0.0.0
```

---

## 6. API Endpoints

### `datathonapi` (Port 8001)
- `GET /api/health` — Status and model readiness check
- `GET /api/model/metadata` — Training date range, baseline MAE, model MAE, and feature importances
- `POST /api/forecast` — Recursive multi-day forecast with 95% confidence intervals
- `POST /api/model/retrain` — Retrains model from CSV and reloads artifact in memory
- `GET /api/model/metrics` — Held-out test evaluation series

### Main Backend (Port 8002)
- `GET /api/health` — Subsystem connection test for database and ML service
- `GET /api/system/status` — Comprehensive status report for all layers and table counts
- `GET /api/rooms` — Room catalog with filtering (building, type, capacity, accessibility)
- `GET /api/rooms/{room_id}` — Single room schedule and agenda
- `POST /api/recommendations` — Interval overlap conflict resolution and qualified room ranking
- `POST /api/requests` — Persists student room requests into database
- `GET /api/requests` — Retrieves submitted room requests
- `GET /api/dashboard/summary` — Aggregate campus capacity and utilization summary
- `GET /api/analytics/utilization` — Deep scheduled utilization rates by building and hour
- `GET /api/forecast` — Proxies forecast requests to `datathonapi`
- `POST /api/dataset/import` — Re-runs idempotent CSV import

---

## 7. Interactive Demonstration Workflow

1. **Overview Dashboard**: View campus room inventory (45 rooms), total seating capacity, building distributions, and recent requests.
2. **Find a Room**:
   - Choose a date (e.g. `2026-10-20`), start hour (`14:00`), duration (`2 hours`), and capacity (`25`).
   - Toggle projector, computers, or wheelchair accessibility.
   - Click **Find Available Rooms**.
   - Review ranked results with transparent qualification reasons (e.g. "+10 seating buffer", "Zero schedule conflicts with recurring classes").
   - Click **Conflicts & Occupied** tab to view blocked rooms with their exact conflict details (e.g., `CS101 (Computer Science)` at 14:00 - 16:00).
   - Click **Request Space**, enter request notes, and submit.
3. **Space Utilization**: Inspect scheduled room-hours per building, hourly demand curves, and expected vs actual event turnout.
4. **Demand Forecast**: Select forecast horizon (7, 14, 21, 30 days) to inspect predictions generated by `datathonapi` with 95% confidence bounds.
5. **Model Insights**: Review chronological train/test split (54 train days vs 14 test days), feature importances, and held-out test actual vs predicted curve.
6. **Data & System Status**: Verify real-time health checks of Frontend, Backend, Database (with SQLite fallback clearly documented), and ML service.

---

## 8. Known Limitations & Disclosures

- **Synthetic Benchmark**: All observations originate from the provided datathon benchmark dataset.
- **Request Status**: Room requests represent student intake demand and are labeled "Pending Review" rather than confirmed physical room allocations.
- **Database Fallback**: When PostgreSQL is not running locally, the system automatically and explicitly operates on a local SQLite fallback (`campusflow.db`) with full transactional persistence.
