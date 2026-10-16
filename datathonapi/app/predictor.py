import os
import json
import datetime
import numpy as np
import pandas as pd
import joblib
from typing import List, Dict, Any, Optional

MODELS_DIR = os.environ.get("MODELS_DIR", "datathonapi/models")
MODEL_PATH = os.path.join(MODELS_DIR, "demand_model.joblib")
METADATA_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

class DemandPredictor:
    def __init__(self):
        self.model = None
        self.metadata = {}
        self.is_loaded = False
        self.load_model()

    def load_model(self):
        try:
            if os.path.exists(MODEL_PATH) and os.path.exists(METADATA_PATH):
                self.model = joblib.load(MODEL_PATH)
                with open(METADATA_PATH, "r") as f:
                    self.metadata = json.load(f)
                self.is_loaded = True
                print("Predictor successfully loaded model and metadata.")
            else:
                self.is_loaded = False
                print(f"Model or metadata missing at {MODEL_PATH}")
        except Exception as e:
            self.is_loaded = False
            print(f"Error loading model: {e}")

    def get_metadata(self) -> Dict[str, Any]:
        return self.metadata

    def predict_horizon(self, start_date_str: Optional[str] = None, days: int = 7) -> Dict[str, Any]:
        if not self.is_loaded or self.model is None:
            raise RuntimeError("ML Model artifact is not loaded. Train the model first.")

        # Determine start date
        if start_date_str:
            try:
                start_dt = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
            except ValueError:
                raise ValueError("start_date must be in YYYY-MM-DD format")
        else:
            last_date_str = self.metadata.get("last_observed_date")
            if last_date_str:
                last_dt = datetime.datetime.strptime(last_date_str, "%Y-%m-%d").date()
                start_dt = last_dt + datetime.timedelta(days=1)
            else:
                start_dt = datetime.date.today()

        # Retrieve recent history for seed lags
        recent_history = self.metadata.get("recent_history", [])
        # Fallback series if none
        if not recent_history:
            history_series = [12.0] * 14
        else:
            history_series = [float(item["total_requests"]) for item in recent_history]

        feature_cols = self.metadata.get("features", [
            "day_of_week", "is_weekend", "day_of_month", "month", "dow_sin", "dow_cos", "lag_1", "lag_7", "rolling_mean_7"
        ])
        rmse = self.metadata.get("model_rmse", 3.0)

        predictions = []
        simulated_history = list(history_series)

        for step in range(days):
            current_date = start_dt + datetime.timedelta(days=step)
            dow = current_date.weekday()
            is_wknd = 1 if dow in [5, 6] else 0
            dom = current_date.day
            mon = current_date.month
            dow_sin = np.sin(2 * np.pi * dow / 7)
            dow_cos = np.cos(2 * np.pi * dow / 7)

            lag_1 = simulated_history[-1]
            lag_7 = simulated_history[-7] if len(simulated_history) >= 7 else simulated_history[0]
            rolling_7 = float(np.mean(simulated_history[-7:]))

            row_features = {
                "day_of_week": dow,
                "is_weekend": is_wknd,
                "day_of_month": dom,
                "month": mon,
                "dow_sin": dow_sin,
                "dow_cos": dow_cos,
                "lag_1": lag_1,
                "lag_7": lag_7,
                "rolling_mean_7": rolling_7
            }

            X_input = pd.DataFrame([[row_features[col] for col in feature_cols]], columns=feature_cols)
            y_pred = float(self.model.predict(X_input)[0])
            # Demand cannot be negative
            y_pred = max(0.0, y_pred)
            simulated_history.append(y_pred)

            lower_bound = max(0.0, round(y_pred - 1.96 * rmse, 1))
            upper_bound = round(y_pred + 1.96 * rmse, 1)

            # Peak demand hours on campus typically 10:00 - 16:00 on weekdays, 13:00 - 17:00 on weekends
            peak_hours = [10, 11, 14, 15] if is_wknd == 0 else [13, 14, 16]

            predictions.append({
                "date": current_date.strftime("%Y-%m-%d"),
                "predicted_requests": round(y_pred, 1),
                "confidence_interval": {
                    "lower_95": lower_bound,
                    "upper_95": upper_bound
                },
                "day_name": current_date.strftime("%A"),
                "is_weekend": bool(is_wknd == 1),
                "expected_peak_hours": peak_hours
            })

        end_date = (start_dt + datetime.timedelta(days=days - 1)).strftime("%Y-%m-%d")

        return {
            "model_name": self.metadata.get("model_name", "RandomForestRegressor"),
            "forecast_horizon_days": days,
            "start_date": start_dt.strftime("%Y-%m-%d"),
            "end_date": end_date,
            "predictions": predictions,
            "synthetic_data_warning": "Warning: Forecasts are generated by a model trained on synthetic campus-space data for a university datathon. Not intended for operational building HVAC or physical security decisions.",
            "baseline_comparison": {
                "baseline_mae": self.metadata.get("baseline_mae"),
                "model_mae": self.metadata.get("model_mae"),
                "beat_baseline": self.metadata.get("beat_baseline")
            }
        }

predictor = DemandPredictor()
