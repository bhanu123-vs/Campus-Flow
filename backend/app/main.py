import os
import datetime
import requests
from fastapi import FastAPI, Depends, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

from backend.app.database import get_db, db_status
from backend.app.models import Room, ClassSchedule, Event, RoomRequest
from backend.app.recommendation import find_room_recommendations
from backend.scripts.import_data import import_all
raw_ml_url = os.environ.get("ML_API_BASE_URL", "").strip()
if raw_ml_url.startswith("http://") or raw_ml_url.startswith("https://"):
    ML_API_BASE_URL = raw_ml_url.rstrip("/")
else:
    ML_API_BASE_URL = "http://127.0.0.1:8001"

app = FastAPI(
    title="CampusFlow AI Main Backend",
    description="Intelligent Campus Space Management API",
    version="1.0.0"
)

# CORS Middleware
allowed_origins = os.environ.get("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schemas
class RecommendationQuery(BaseModel):
    date: str = Field(..., description="Target date YYYY-MM-DD")
    start_hour: int = Field(..., ge=7, le=22, description="Start hour (24-hour, e.g. 14 for 2 PM)")
    duration_hours: int = Field(..., ge=1, le=8, description="Duration in hours")
    required_capacity: int = Field(..., ge=1, le=500, description="Minimum seating capacity")
    purpose: str = Field("Study Group", description="Meeting or study purpose")
    projector_required: bool = False
    computers_required: bool = False
    accessible_required: bool = False
    preferred_building: Optional[str] = None

class CreateRequestInput(BaseModel):
    request_date: str
    start_hour: int
    duration_hours: int
    required_capacity: int
    purpose: str
    requested_room_id: Optional[str] = None
    projector_required: bool = False
    computers_required: bool = False

@app.get("/api/health")
def health_check(db: Session = Depends(get_db)):
    # Test DB
    db_ok = False
    room_count = 0
    try:
        room_count = db.query(Room).count()
        db_ok = True
    except Exception:
        db_ok = False

    # Test ML service
    ml_healthy = False
    try:
        r = requests.get(f"{ML_API_BASE_URL}/api/health", timeout=2.0)
        ml_healthy = (r.status_code == 200 and r.json().get("model_ready", False))
    except Exception:
        ml_healthy = False

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": {
            "type": db_status["active_db"],
            "is_connected": db_ok,
            "is_fallback": db_status["is_fallback"],
            "configured_url": db_status["configured_url"],
            "connection_error": db_status["connection_error"]
        },
        "ml_service": {
            "url": ML_API_BASE_URL,
            "connected": ml_healthy
        },
        "inventory": {
            "total_rooms": room_count
        },
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
    }

@app.get("/api/system/status")
def system_status(db: Session = Depends(get_db)):
    # 1. Database check
    rooms_cnt = 0
    schedules_cnt = 0
    events_cnt = 0
    requests_cnt = 0
    db_connected = False
    try:
        rooms_cnt = db.query(Room).count()
        schedules_cnt = db.query(ClassSchedule).count()
        events_cnt = db.query(Event).count()
        requests_cnt = db.query(RoomRequest).count()
        db_connected = True
    except Exception as e:
        db_connected = False

    # 2. ML Service check
    ml_data = {
        "connected": False,
        "service": "datathonapi",
        "url": ML_API_BASE_URL,
        "model_loaded": False,
        "model_name": None,
        "error": None
    }
    try:
        r = requests.get(f"{ML_API_BASE_URL}/api/health", timeout=2.0)
        if r.status_code == 200:
            ml_json = r.json()
            ml_data["connected"] = True
            ml_data["model_loaded"] = ml_json.get("model_loaded", False)
            # Try to fetch metadata
            try:
                m = requests.get(f"{ML_API_BASE_URL}/api/model/metadata", timeout=2.0)
                if m.status_code == 200:
                    ml_data["model_name"] = m.json().get("model_name")
                    ml_data["baseline_mae"] = m.json().get("baseline_mae")
                    ml_data["model_mae"] = m.json().get("model_mae")
                    ml_data["beat_baseline"] = m.json().get("beat_baseline")
            except Exception:
                pass
    except Exception as e:
        ml_data["error"] = f"Unable to reach ML service at {ML_API_BASE_URL}: {str(e)}"

    return {
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "components": {
            "frontend": {
                "name": "CampusFlow AI React SPA",
                "status": "Online",
                "framework": "React 19 + TypeScript + Vite"
            },
            "backend": {
                "name": "CampusFlow Core API",
                "status": "Online",
                "framework": "FastAPI (Python 3.11)"
            },
            "database": {
                "name": db_status["intended_db"],
                "active_driver": db_status["active_db"],
                "is_fallback": db_status["is_fallback"],
                "status": "Operational" if db_connected else "Error",
                "connection_notes": db_status["connection_error"] or "Connected cleanly",
                "tables": {
                    "rooms": rooms_cnt,
                    "class_schedules": schedules_cnt,
                    "events": events_cnt,
                    "room_requests": requests_cnt
                }
            },
            "datathonapi": {
                "name": "datathonapi (ML Demand Forecasting Service)",
                "status": "Operational" if ml_data["connected"] and ml_data["model_loaded"] else "Degraded",
                "details": ml_data
            }
        },
        "synthetic_disclosure": "Notice: The platform runs against university datathon synthetic benchmark data. Space reservations represent study requests rather than confirmed building locks."
    }

@app.get("/api/rooms")
def get_rooms(
    building: Optional[str] = None,
    room_type: Optional[str] = None,
    min_capacity: Optional[int] = None,
    accessible_only: bool = False,
    db: Session = Depends(get_db)
):
    query = db.query(Room)
    if building:
        query = query.filter(Room.building == building)
    if room_type:
        query = query.filter(Room.room_type == room_type)
    if min_capacity:
        query = query.filter(Room.capacity >= min_capacity)
    if accessible_only:
        query = query.filter(Room.accessible == 1)

    rooms = query.order_by(Room.building, Room.floor, Room.room_id).all()
    return [
        {
            "room_id": r.room_id,
            "building": r.building,
            "floor": r.floor,
            "room_type": r.room_type,
            "capacity": r.capacity,
            "projector": bool(r.projector == 1),
            "computers": bool(r.computers == 1),
            "accessible": bool(r.accessible == 1),
            "power_outlets": bool(r.power_outlets == 1),
            "weekly_classes": len(r.schedules)
        }
        for r in rooms
    ]

@app.get("/api/rooms/{room_id}")
def get_room_details(room_id: str, db: Session = Depends(get_db)):
    r = db.query(Room).filter(Room.room_id == room_id).first()
    if not r:
        raise HTTPException(status_code=404, detail=f"Room {room_id} not found.")

    schedules = db.query(ClassSchedule).filter(ClassSchedule.room_id == room_id).order_by(ClassSchedule.start_hour).all()
    events = db.query(Event).filter(Event.room_id == room_id).all()

    return {
        "room_id": r.room_id,
        "building": r.building,
        "floor": r.floor,
        "room_type": r.room_type,
        "capacity": r.capacity,
        "projector": bool(r.projector == 1),
        "computers": bool(r.computers == 1),
        "accessible": bool(r.accessible == 1),
        "power_outlets": bool(r.power_outlets == 1),
        "schedules": [
            {
                "schedule_id": s.schedule_id,
                "course_code": s.course_code,
                "weekday": s.weekday,
                "start_hour": s.start_hour,
                "duration_hours": s.duration_hours,
                "end_hour": s.start_hour + s.duration_hours,
                "department": s.department,
                "expected_attendance": s.expected_attendance
            }
            for s in schedules
        ],
        "events": [
            {
                "event_id": ev.event_id,
                "event_type": ev.event_type,
                "start_time": ev.start_time,
                "duration_hours": ev.duration_hours,
                "expected_attendance": ev.expected_attendance,
                "actual_attendance": ev.actual_attendance
            }
            for ev in events
        ]
    }

@app.post("/api/recommendations")
def recommend_rooms(req: RecommendationQuery, db: Session = Depends(get_db)):
    try:
        results = find_room_recommendations(
            db=db,
            target_date_str=req.date,
            start_hour=req.start_hour,
            duration_hours=req.duration_hours,
            required_capacity=req.required_capacity,
            projector_required=req.projector_required,
            computers_required=req.computers_required,
            accessible_required=req.accessible_required,
            preferred_building=req.preferred_building
        )
        return results
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Recommendation engine error: {str(e)}")

@app.post("/api/requests")
def submit_request(req_in: CreateRequestInput, db: Session = Depends(get_db)):
    # Validate date
    try:
        datetime.datetime.strptime(req_in.request_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid request_date format. Use YYYY-MM-DD.")

    # Prevent representation as confirmed reservation
    status_label = "Pending Review"
    
    # Check if target room exists if provided
    if req_in.requested_room_id:
        room = db.query(Room).filter(Room.room_id == req_in.requested_room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail=f"Room {req_in.requested_room_id} does not exist.")

    new_req = RoomRequest(
        request_date=req_in.request_date,
        start_hour=req_in.start_hour,
        duration_hours=req_in.duration_hours,
        required_capacity=req_in.required_capacity,
        projector_required=1 if req_in.projector_required else 0,
        computers_required=1 if req_in.computers_required else 0,
        purpose=req_in.purpose,
        status=status_label,
        requested_room_id=req_in.requested_room_id,
        created_at=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)

    return {
        "success": True,
        "request_id": new_req.request_id,
        "status": new_req.status,
        "message": f"Room request #{new_req.request_id} recorded in database. Note: This is an intake request for space allocation, not a guaranteed physical room lock.",
        "request": {
            "request_id": new_req.request_id,
            "request_date": new_req.request_date,
            "start_hour": new_req.start_hour,
            "duration_hours": new_req.duration_hours,
            "required_capacity": new_req.required_capacity,
            "purpose": new_req.purpose,
            "requested_room_id": new_req.requested_room_id,
            "created_at": new_req.created_at,
            "status": new_req.status
        }
    }

@app.get("/api/requests")
def list_requests(limit: int = 50, db: Session = Depends(get_db)):
    reqs = db.query(RoomRequest).order_by(RoomRequest.request_id.desc()).limit(limit).all()
    return [
        {
            "request_id": r.request_id,
            "request_date": r.request_date,
            "start_hour": r.start_hour,
            "duration_hours": r.duration_hours,
            "required_capacity": r.required_capacity,
            "projector_required": bool(r.projector_required == 1),
            "computers_required": bool(r.computers_required == 1),
            "purpose": r.purpose,
            "status": r.status,
            "requested_room_id": r.requested_room_id,
            "created_at": r.created_at
        }
        for r in reqs
    ]

@app.get("/api/dashboard/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_rooms = db.query(Room).count()
    total_buildings = db.query(func.count(func.distinct(Room.building))).scalar()
    total_classes = db.query(ClassSchedule).count()
    total_events = db.query(Event).count()
    total_requests = db.query(RoomRequest).count()

    # Room capacity distribution
    rooms = db.query(Room).all()
    total_campus_capacity = sum(r.capacity for r in rooms) if rooms else 0
    accessible_count = sum(1 for r in rooms if r.accessible == 1)
    projector_count = sum(1 for r in rooms if r.projector == 1)
    computers_count = sum(1 for r in rooms if r.computers == 1)

    # Building breakdown
    buildings_data = {}
    for r in rooms:
        buildings_data[r.building] = buildings_data.get(r.building, 0) + 1

    return {
        "total_rooms": total_rooms,
        "total_buildings": total_buildings,
        "total_campus_capacity": total_campus_capacity,
        "accessible_rooms": accessible_count,
        "projector_equipped": projector_count,
        "computer_labs": computers_count,
        "total_scheduled_classes": total_classes,
        "total_recorded_events": total_events,
        "total_room_requests": total_requests,
        "buildings_breakdown": [{"building": k, "count": v} for k, v in buildings_data.items()],
        "synthetic_notice": "Platform operates on synthetic campus space data for university datathon evaluation."
    }

@app.get("/api/analytics/utilization")
def get_space_utilization(db: Session = Depends(get_db)):
    rooms = db.query(Room).all()
    schedules = db.query(ClassSchedule).all()
    events = db.query(Event).all()

    # 1. Total rooms & breakdown
    total_rooms = len(rooms)
    by_building = {}
    by_type = {}
    for r in rooms:
        by_building[r.building] = by_building.get(r.building, 0) + 1
        by_type[r.room_type] = by_type.get(r.room_type, 0) + 1

    # 2. Total scheduled weekly class room-hours by building
    # Standard academic week: Monday through Friday, 8:00 AM to 18:00 PM (10 hours/day * 5 days = 50 available hours per room)
    # Denominator explanation: 50 weekly daytime operating hours per room.
    scheduled_hours_by_building = {}
    weekly_class_hours = 0
    room_scheduled_hours = {}

    for s in schedules:
        r = next((rm for rm in rooms if rm.room_id == s.room_id), None)
        if r:
            b = r.building
            scheduled_hours_by_building[b] = scheduled_hours_by_building.get(b, 0) + s.duration_hours
            weekly_class_hours += s.duration_hours
            room_scheduled_hours[s.room_id] = room_scheduled_hours.get(s.room_id, 0) + s.duration_hours

    building_utilization = []
    for b_name, count in by_building.items():
        total_avail_hours = count * 50 # 50 operating hours/week
        sched_h = scheduled_hours_by_building.get(b_name, 0)
        rate = round((sched_h / total_avail_hours) * 100, 1) if total_avail_hours > 0 else 0.0
        building_utilization.append({
            "building": b_name,
            "room_count": count,
            "scheduled_hours": sched_h,
            "available_operating_hours": total_avail_hours,
            "utilization_rate_pct": rate
        })

    # 3. Peak scheduling hours of the day
    hour_distribution = {h: 0 for h in range(8, 20)}
    for s in schedules:
        for offset in range(s.duration_hours):
            h = s.start_hour + offset
            if h in hour_distribution:
                hour_distribution[h] += 1

    hourly_demand = [
        {"hour": f"{h:02d}:00", "active_classes": count}
        for h, count in sorted(hour_distribution.items())
    ]

    # 4. Expected vs Actual Event Attendance
    event_attendance_data = []
    for ev in events[:15]:
        event_attendance_data.append({
            "event_id": ev.event_id,
            "event_type": ev.event_type,
            "room_id": ev.room_id,
            "expected": ev.expected_attendance,
            "actual": ev.actual_attendance,
            "variance": ev.actual_attendance - ev.expected_attendance
        })

    # 5. Top scheduled rooms
    top_rooms = sorted(room_scheduled_hours.items(), key=lambda x: x[1], reverse=True)[:6]
    top_rooms_data = []
    for rid, hours in top_rooms:
        r_obj = next((rm for rm in rooms if rm.room_id == rid), None)
        if r_obj:
            top_rooms_data.append({
                "room_id": rid,
                "building": r_obj.building,
                "room_type": r_obj.room_type,
                "capacity": r_obj.capacity,
                "scheduled_hours_week": hours,
                "weekly_utilization_pct": round((hours / 50.0) * 100, 1)
            })

    total_avail_campus_hours = total_rooms * 50
    overall_utilization = round((weekly_class_hours / total_avail_campus_hours) * 100, 1) if total_avail_campus_hours > 0 else 0.0

    return {
        "observation_window": "Standard Weekly Academic Timetable (Mon-Fri, 08:00 - 18:00, 50 hours/room)",
        "metrics": {
            "total_rooms": total_rooms,
            "total_weekly_scheduled_hours": weekly_class_hours,
            "total_available_operating_hours": total_avail_campus_hours,
            "overall_scheduled_utilization_pct": overall_utilization,
        },
        "building_utilization": building_utilization,
        "hourly_demand": hourly_demand,
        "by_room_type": [{"type": k, "count": v} for k, v in by_type.items()],
        "event_attendance_comparison": event_attendance_data,
        "top_utilized_rooms": top_rooms_data,
        "limitations": "Scheduled room-hours reflect planned class schedules. Actual in-room occupancy sensors are not present in this synthetic datathon dataset."
    }

@app.get("/api/forecast")
def get_demand_forecast(
    days: int = Query(7, ge=1, le=30),
    start_date: Optional[str] = None
):
    """
    Proxies request to datathonapi ML service.
    """
    try:
        payload = {"days": days}
        if start_date:
            payload["start_date"] = start_date

        resp = requests.post(f"{ML_API_BASE_URL}/api/forecast", json=payload, timeout=5.0)
        if resp.status_code == 200:
            return resp.json()
        else:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Machine Learning forecasting service (datathonapi) is unavailable at {ML_API_BASE_URL}. Ensure datathonapi is running on port 8001."
        )

@app.get("/api/model/metrics")
def get_ml_metrics():
    """
    Proxies evaluation metrics from datathonapi ML service.
    """
    try:
        resp = requests.get(f"{ML_API_BASE_URL}/api/model/metrics", timeout=5.0)
        if resp.status_code == 200:
            return resp.json()
        else:
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
    except requests.exceptions.RequestException:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"datathonapi service unavailable at {ML_API_BASE_URL}."
        )

@app.post("/api/dataset/import")
def trigger_data_import():
    """
    Re-runs the repeatable data import script.
    """
    try:
        stats = import_all()
        return {
            "success": True,
            "message": "Data imported successfully into database without duplicate records.",
            "imported_counts": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8002, reload=False)
