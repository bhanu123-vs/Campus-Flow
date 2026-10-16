import os
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from datathonapi.app.schemas import (
    HealthResponse, ModelMetadataResponse, ForecastRequest,
    ForecastResponse, RetrainResponse
)
from datathonapi.app.predictor import predictor
from datathonapi.training.train_demand_model import train_and_evaluate

app = FastAPI(
    title="CampusFlow datathonapi",
    description="Dedicated Machine Learning Service for Campus Space Demand Forecasting",
    version="1.0.0"
)

# CORS configuration
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(
        service="datathonapi",
        status="healthy" if predictor.is_loaded else "degraded",
        model_loaded=predictor.is_loaded,
        model_ready=predictor.is_loaded and predictor.model is not None,
        version="1.0.0"
    )

@app.get("/api/model/metadata")
def get_model_metadata():
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not yet trained or loaded."
        )
    return predictor.get_metadata()

@app.post("/api/forecast", response_model=ForecastResponse)
def generate_forecast(req: ForecastRequest):
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demand forecasting model is not trained or loaded. Retrain model first."
        )
    try:
        result = predictor.predict_horizon(start_date_str=req.start_date, days=req.days)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Prediction error: {str(e)}")

@app.post("/api/model/retrain", response_model=RetrainResponse)
def retrain_model():
    try:
        print("Starting model retraining...")
        metadata = train_and_evaluate()
        predictor.load_model()
        return RetrainResponse(
            success=True,
            message=f"Model retrained successfully. Model MAE: {metadata.get('model_mae')}, Baseline MAE: {metadata.get('baseline_mae')}.",
            training_metadata=metadata
        )
    except Exception as e:
        return RetrainResponse(
            success=False,
            message=f"Retraining failed: {str(e)}",
            training_metadata=None
        )

@app.get("/api/model/metrics")
def get_model_metrics():
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded."
        )
    meta = predictor.get_metadata()
    return {
        "model_name": meta.get("model_name"),
        "training_status": meta.get("training_status"),
        "training_timestamp": meta.get("training_timestamp"),
        "baseline_mae": meta.get("baseline_mae"),
        "model_mae": meta.get("model_mae"),
        "model_rmse": meta.get("model_rmse"),
        "beat_baseline": meta.get("beat_baseline"),
        "improvement_pct": meta.get("improvement_pct"),
        "test_observations": meta.get("test_date_range", {}).get("count"),
        "test_eval_series": meta.get("test_eval_series", []),
        "features": meta.get("features", []),
        "feature_importances": meta.get("feature_importances", {}),
        "synthetic_data_warning": meta.get("dataset_limitations")
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("datathonapi.app.main:app", host="0.0.0.0", port=8001, reload=False)
