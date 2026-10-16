# CampusFlow AI - Main Backend

## Overview
FastAPI backend service powering room search, conflict detection, utilization analytics, room request intake, and datathonapi proxying.

## Endpoints
- `GET /api/health` - Health check verifying database and ML service connections
- `GET /api/rooms` - Room inventory with building, type, and facility filtering
- `GET /api/rooms/{room_id}` - Detailed room schedule and event agenda
- `POST /api/recommendations` - Recommendation engine with interval overlap conflict detection
- `GET /api/dashboard/summary` - Aggregate campus space metrics
- `GET /api/analytics/utilization` - Rigorous room utilization rates and attendance comparison
- `POST /api/requests` - Persist new room requests
- `GET /api/requests` - Retrieve submitted room requests
- `GET /api/forecast` - Proxies to datathonapi ML service
- `GET /api/model/metrics` - Proxies ML evaluation metrics
- `GET /api/system/status` - Detailed health of all system components
- `POST /api/dataset/import` - Repeatable CSV import

## Database
Uses SQLAlchemy ORM. Configured for PostgreSQL (`DATABASE_URL`), with an explicitly labeled SQLite local evaluation fallback (`campusflow.db`) when PostgreSQL is not running.
