# datathonapi - Machine Learning Demand Forecasting Service

## Overview
`datathonapi` is an independent Python FastAPI microservice responsible for training, evaluating, and serving demand forecasting models for campus space management.

## Model Details
- **Architecture**: `RandomForestRegressor` (100 estimators, max depth 6)
- **Target**: Daily campus room-request demand
- **Features**: Day of week, weekend indicator, day of month, month, cyclical day-of-week sine/cosine encodings, lag-1 day demand, lag-7 day demand, and 7-day rolling mean demand.
- **Split Strategy**: Strictly chronological split (80% train, 20% test) to prevent future-data leakage.
- **Baseline**: Historical day-of-week mean demand.
- **Evaluation Metric**: Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE).

## Endpoints
- `GET /api/health` - Status and model readiness
- `GET /api/model/metadata` - Training dataset metadata, date coverage, features, and MAE
- `POST /api/forecast` - Recursive multi-day forecast generation with 95% confidence intervals
- `POST /api/model/retrain` - Retrains the model from `room_requests.csv` and updates artifacts
- `GET /api/model/metrics` - Detailed evaluation series and held-out test set comparisons

## Running
```bash
/venv/bin/uvicorn datathonapi.app.main:app --host 0.0.0.0 --port 8001
```

## Synthetic Data Disclosure
All models are trained on synthetic data provided for the university datathon. Predictions reflect synthetic request distributions and should not be used as guaranteed physical space reservations or life-safety HVAC decisions.
