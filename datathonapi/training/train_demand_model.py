"""
Demand Model Training Pipeline for CampusFlow AI / datathonapi.
Chronological split, calendar + lagged feature engineering, baseline comparison,
and model artifact serialization with evaluation metadata.
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import joblib

CSV_PATH = os.environ.get("ROOM_REQUESTS_CSV", "data/02_education_campus_space/room_requests.csv")
MODELS_DIR = os.environ.get("MODELS_DIR", "datathonapi/models")
os.makedirs(MODELS_DIR, exist_ok=True)

def load_and_aggregate_data(csv_path: str) -> pd.DataFrame:
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"room_requests.csv not found at: {csv_path}")

    df = pd.read_csv(csv_path)
    required_cols = {"request_id", "request_date", "start_hour", "duration_hours", "required_capacity", "status"}
    if not required_cols.issubset(set(df.columns)):
        raise ValueError(f"Missing required columns in CSV: {required_cols - set(df.columns)}")

    df["request_date"] = pd.to_datetime(df["request_date"])
    
    # Aggregate to daily total request demand
    daily = df.groupby("request_date").agg(
        total_requests=("request_id", "count"),
        avg_capacity=("required_capacity", "mean"),
        avg_duration=("duration_hours", "mean"),
    ).reset_index()

    daily = daily.sort_values("request_date").reset_index(drop=True)

    # Fill any missing dates within the min/max range with 0 requests
    all_dates = pd.date_range(start=daily["request_date"].min(), end=daily["request_date"].max(), freq="D")
    daily = daily.set_index("request_date").reindex(all_dates, fill_value=0).reset_index()
    daily.rename(columns={"index": "request_date"}, inplace=True)
    daily["total_requests"] = daily["total_requests"].fillna(0).astype(int)

    return daily

def build_features(daily: pd.DataFrame) -> pd.DataFrame:
    df = daily.copy()
    df["day_of_week"] = df["request_date"].dt.dayofweek
    df["is_weekend"] = df["day_of_week"].apply(lambda d: 1 if d in [5, 6] else 0)
    df["day_of_month"] = df["request_date"].dt.day
    df["month"] = df["request_date"].dt.month

    # Cyclical day of week encoding
    df["dow_sin"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["dow_cos"] = np.cos(2 * np.pi * df["day_of_week"] / 7)

    # Strictly backward-looking lag features (no future leakage)
    df["lag_1"] = df["total_requests"].shift(1)
    df["lag_7"] = df["total_requests"].shift(7)
    df["rolling_mean_7"] = df["total_requests"].shift(1).rolling(window=7, min_periods=1).mean()

    # Drop rows where lag_7 cannot be constructed to avoid ungrounded training
    df = df.dropna().reset_index(drop=True)
    return df

def train_and_evaluate():
    print(f"Loading data from {CSV_PATH}...")
    daily = load_and_aggregate_data(CSV_PATH)
    date_coverage = {
        "start_date": daily["request_date"].min().strftime("%Y-%m-%d"),
        "end_date": daily["request_date"].max().strftime("%Y-%m-%d"),
        "total_days": len(daily)
    }
    print(f"Date coverage: {date_coverage['start_date']} to {date_coverage['end_date']} ({date_coverage['total_days']} days)")

    featured = build_features(daily)
    feature_cols = ["day_of_week", "is_weekend", "day_of_month", "month", "dow_sin", "dow_cos", "lag_1", "lag_7", "rolling_mean_7"]
    
    # Chronological Split: 80% train, 20% test
    n = len(featured)
    train_size = int(n * 0.8)
    
    train_df = featured.iloc[:train_size].copy()
    test_df = featured.iloc[train_size:].copy()

    X_train = train_df[feature_cols]
    y_train = train_df["total_requests"]
    X_test = test_df[feature_cols]
    y_test = test_df["total_requests"]

    print(f"Train size: {len(X_train)} days ({train_df['request_date'].min().strftime('%Y-%m-%d')} to {train_df['request_date'].max().strftime('%Y-%m-%d')})")
    print(f"Test size: {len(X_test)} days ({test_df['request_date'].min().strftime('%Y-%m-%d')} to {test_df['request_date'].max().strftime('%Y-%m-%d')})")

    # Baseline 1: Day of week historical average from training set
    dow_means = train_df.groupby("day_of_week")["total_requests"].mean().to_dict()
    baseline_pred = test_df["day_of_week"].map(dow_means).fillna(train_df["total_requests"].mean())
    baseline_mae = float(mean_absolute_error(y_test, baseline_pred))

    # Train Random Forest Regressor
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=6,
        min_samples_split=3,
        random_state=42
    )
    model.fit(X_train, y_train)

    # Evaluate Model on Held-out Test Set
    test_pred = model.predict(X_test)
    model_mae = float(mean_absolute_error(y_test, test_pred))
    model_rmse = float(np.sqrt(mean_squared_error(y_test, test_pred)))

    beat_baseline = bool(model_mae < baseline_mae)
    improvement_pct = float(((baseline_mae - model_mae) / baseline_mae) * 100) if baseline_mae > 0 else 0.0

    print("--- EVALUATION RESULTS ---")
    print(f"Baseline MAE (Day-of-Week historical mean): {baseline_mae:.3f}")
    print(f"RandomForestRegressor MAE: {model_mae:.3f}")
    print(f"RandomForestRegressor RMSE: {model_rmse:.3f}")
    print(f"Beat baseline: {beat_baseline} ({improvement_pct:.1f}% improvement)")

    # Save Model Artifact
    model_path = os.path.join(MODELS_DIR, "demand_model.joblib")
    joblib.dump(model, model_path)
    print(f"Model saved to {model_path}")

    # Build test comparison dataset for UI plotting
    test_eval_series = []
    for idx, row in test_df.reset_index().iterrows():
        test_eval_series.append({
            "date": row["request_date"].strftime("%Y-%m-%d"),
            "actual": int(row["total_requests"]),
            "predicted": round(float(test_pred[idx]), 1),
            "baseline": round(float(baseline_pred.iloc[idx]), 1),
            "day_of_week": int(row["day_of_week"])
        })

    # Save Feature Importances
    importances = {col: round(float(imp), 4) for col, imp in zip(feature_cols, model.feature_importances_)}

    # Save Evaluation Metadata
    metadata = {
        "model_name": "RandomForestRegressor (CampusFlow Demand)",
        "training_status": "Trained",
        "training_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "dataset_name": "02_education_campus_space/room_requests.csv",
        "dataset_limitations": "Synthetic campus space data generated for university datathon. Patterns do not reflect actual live sensor telemetry.",
        "date_coverage": date_coverage,
        "train_date_range": {
            "start": train_df["request_date"].min().strftime("%Y-%m-%d"),
            "end": train_df["request_date"].max().strftime("%Y-%m-%d"),
            "count": len(train_df)
        },
        "test_date_range": {
            "start": test_df["request_date"].min().strftime("%Y-%m-%d"),
            "end": test_df["request_date"].max().strftime("%Y-%m-%d"),
            "count": len(test_df)
        },
        "features": feature_cols,
        "feature_importances": importances,
        "baseline_mae": round(baseline_mae, 3),
        "model_mae": round(model_mae, 3),
        "model_rmse": round(model_rmse, 3),
        "beat_baseline": beat_baseline,
        "improvement_pct": round(improvement_pct, 2),
        "test_eval_series": test_eval_series,
        "last_observed_date": daily["request_date"].max().strftime("%Y-%m-%d"),
        "recent_history": daily.tail(14)[["request_date", "total_requests"]].to_dict(orient="records")
    }

    # Format datetime strings in recent_history
    for item in metadata["recent_history"]:
        if isinstance(item["request_date"], pd.Timestamp):
            item["request_date"] = item["request_date"].strftime("%Y-%m-%d")

    metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved to {metadata_path}")

    return metadata

if __name__ == "__main__":
    train_and_evaluate()
