"""
Model evaluation script for datathonapi.
Loads the saved model artifact and model_metadata.json, reporting test performance.
"""

import os
import json
import joblib
import pandas as pd

MODELS_DIR = os.environ.get("MODELS_DIR", "datathonapi/models")
metadata_path = os.path.join(MODELS_DIR, "model_metadata.json")
model_path = os.path.join(MODELS_DIR, "demand_model.joblib")

def evaluate():
    if not os.path.exists(model_path) or not os.path.exists(metadata_path):
        print("Model or metadata not found. Please run train_demand_model.py first.")
        return

    with open(metadata_path, "r") as f:
        meta = json.load(f)

    print("=== MODEL EVALUATION REPORT ===")
    print(f"Model Name: {meta.get('model_name')}")
    print(f"Training Status: {meta.get('training_status')}")
    print(f"Training Date Range: {meta['train_date_range']['start']} to {meta['train_date_range']['end']} ({meta['train_date_range']['count']} days)")
    print(f"Test Date Range: {meta['test_date_range']['start']} to {meta['test_date_range']['end']} ({meta['test_date_range']['count']} days)")
    print(f"Baseline MAE: {meta.get('baseline_mae')}")
    print(f"Model MAE: {meta.get('model_mae')}")
    print(f"Model RMSE: {meta.get('model_rmse')}")
    print(f"Beat Baseline: {meta.get('beat_baseline')}")
    print(f"Synthetic Data Limitation: {meta.get('dataset_limitations')}")
    print("\nFeature Importances:")
    for feat, imp in meta.get("feature_importances", {}).items():
        print(f"  - {feat:15s}: {imp:.4f}")

if __name__ == "__main__":
    evaluate()
