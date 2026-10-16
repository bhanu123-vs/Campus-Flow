from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class HealthResponse(BaseModel):
    service: str = "datathonapi"
    status: str
    model_loaded: bool
    model_ready: bool
    version: str = "1.0.0"

class DateRange(BaseModel):
    start: str
    end: str
    count: int

class ModelMetadataResponse(BaseModel):
    model_name: str
    training_status: str
    training_timestamp: Optional[str] = None
    dataset_name: str
    dataset_limitations: str
    train_date_range: Optional[DateRange] = None
    test_date_range: Optional[DateRange] = None
    baseline_mae: Optional[float] = None
    model_mae: Optional[float] = None
    model_rmse: Optional[float] = None
    beat_baseline: Optional[bool] = None
    improvement_pct: Optional[float] = None
    features: Optional[List[str]] = None
    feature_importances: Optional[Dict[str, float]] = None

class ForecastRequest(BaseModel):
    start_date: Optional[str] = Field(None, description="Start date YYYY-MM-DD (defaults to day after last observed date)")
    days: Optional[int] = Field(7, ge=1, le=60, description="Forecast horizon in days")

class ForecastItem(BaseModel):
    date: str
    predicted_requests: float
    confidence_interval: Dict[str, float]
    day_name: str
    is_weekend: bool
    expected_peak_hours: List[int]

class ForecastResponse(BaseModel):
    model_name: str
    forecast_horizon_days: int
    start_date: str
    end_date: str
    predictions: List[ForecastItem]
    synthetic_data_warning: str
    baseline_comparison: Dict[str, Any]

class RetrainResponse(BaseModel):
    success: bool
    message: str
    training_metadata: Optional[Dict[str, Any]] = None
