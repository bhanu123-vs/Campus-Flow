import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from backend.app.models import Room, ClassSchedule, Event

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def check_interval_overlap(start_a: float, end_a: float, start_b: float, end_b: float) -> bool:
    """
    Standard half-open interval overlap check:
    start_a < end_b and end_a > start_b
    """
    return (start_a < end_b) and (end_a > start_b)

def find_room_recommendations(
    db: Session,
    target_date_str: str,
    start_hour: int,
    duration_hours: int,
    required_capacity: int,
    projector_required: bool = False,
    computers_required: bool = False,
    accessible_required: bool = False,
    preferred_building: Optional[str] = None
) -> Dict[str, Any]:
    # 1. Parse target date and weekday
    try:
        target_date = datetime.datetime.strptime(target_date_str, "%Y-%m-%d").date()
    except ValueError:
        raise ValueError(f"Invalid date format '{target_date_str}'. Expected YYYY-MM-DD.")

    req_start = float(start_hour)
    req_end = float(start_hour + duration_hours)
    weekday_name = WEEKDAY_NAMES[target_date.weekday()]

    # 2. Query all rooms in inventory
    rooms = db.query(Room).all()

    candidates = []
    conflict_rooms = []

    for r in rooms:
        # Mandatory hard filter checks
        capacity_ok = r.capacity >= required_capacity
        projector_ok = (not projector_required) or (r.projector == 1)
        computers_ok = (not computers_required) or (r.computers == 1)
        accessible_ok = (not accessible_required) or (r.accessible == 1)

        # Check recurring class schedules for this weekday
        schedules = db.query(ClassSchedule).filter(
            ClassSchedule.room_id == r.room_id,
            ClassSchedule.weekday == weekday_name
        ).all()

        conflicts = []
        for s in schedules:
            s_start = float(s.start_hour)
            s_end = float(s.start_hour + s.duration_hours)
            if check_interval_overlap(req_start, req_end, s_start, s_end):
                conflicts.append({
                    "type": "Class Schedule Conflict",
                    "details": f"{s.course_code} ({s.department})",
                    "time": f"{int(s_start):02d}:00 - {int(s_end):02d}:00",
                    "overlap_window": f"{int(max(req_start, s_start)):02d}:00 - {int(min(req_end, s_end)):02d}:00"
                })

        # Check dated events on this specific date
        events = db.query(Event).filter(Event.room_id == r.room_id).all()
        for ev in events:
            # Parse event start time: YYYY-MM-DD HH:MM:SS
            try:
                ev_dt = datetime.datetime.strptime(ev.start_time.split()[0], "%Y-%m-%d").date()
                if ev_dt == target_date:
                    time_part = ev.start_time.split()[1] if len(ev.start_time.split()) > 1 else "00:00:00"
                    ev_start_h = float(time_part.split(":")[0])
                    ev_end_h = ev_start_h + float(ev.duration_hours)
                    if check_interval_overlap(req_start, req_end, ev_start_h, ev_end_h):
                        conflicts.append({
                            "type": "Special Event Conflict",
                            "details": f"{ev.event_type} (Exp: {ev.expected_attendance})",
                            "time": f"{int(ev_start_h):02d}:00 - {int(ev_end_h):02d}:00",
                            "overlap_window": f"{int(max(req_start, ev_start_h)):02d}:00 - {int(min(req_end, ev_end_h)):02d}:00"
                        })
            except Exception:
                continue

        has_conflicts = len(conflicts) > 0

        # Detailed qualification explanations
        qualifications = []
        if capacity_ok:
            surplus = r.capacity - required_capacity
            qualifications.append(f"Capacity requirement met: room holds {r.capacity} seats (+{surplus} buffer for {required_capacity} requested).")
        else:
            qualifications.append(f"Insufficient capacity: room holds {r.capacity} seats (needed {required_capacity}).")

        if r.projector == 1:
            qualifications.append("High-definition projector and A/V system installed.")
        elif projector_required:
            qualifications.append("Lacks required presentation projector.")

        if r.computers == 1:
            qualifications.append("Dedicated workstation computers provided.")
        elif computers_required:
            qualifications.append("No computer workstations available in room.")

        if r.accessible == 1:
            qualifications.append("Full ADA wheelchair and elevator accessibility verified.")
        elif accessible_required:
            qualifications.append("Does not meet specified accessibility requirements.")

        if r.power_outlets == 1:
            qualifications.append("Abundant perimeter power outlets for laptops.")

        if not has_conflicts:
            qualifications.append(f"Zero scheduling conflicts found on {weekday_name} between {int(req_start):02d}:00 and {int(req_end):02d}:00.")
        else:
            qualifications.append(f"Blocked by {len(conflicts)} active booking conflict(s).")

        room_card = {
            "room_id": r.room_id,
            "building": r.building,
            "floor": r.floor,
            "room_type": r.room_type,
            "capacity": r.capacity,
            "projector": bool(r.projector == 1),
            "computers": bool(r.computers == 1),
            "accessible": bool(r.accessible == 1),
            "power_outlets": bool(r.power_outlets == 1),
            "conflicts": conflicts,
            "has_conflicts": has_conflicts,
            "meets_facilities": bool(capacity_ok and projector_ok and computers_ok and accessible_ok),
            "is_available": bool(not has_conflicts and capacity_ok and projector_ok and computers_ok and accessible_ok),
            "qualifications": qualifications
        }

        # Scoring & Ranking for Eligible Rooms
        if room_card["is_available"]:
            # Prefer snug fit over massive empty lecture hall for small groups
            capacity_diff = r.capacity - required_capacity
            fit_score = 100.0 - min(capacity_diff * 0.5, 50.0) # closer to requested capacity is better utilized
            
            # Bonus for preferred building
            if preferred_building and r.building.lower() == preferred_building.lower():
                fit_score += 20.0
            
            # Minor equipment bonuses
            if r.power_outlets == 1:
                fit_score += 5.0
            if r.projector == 1 and not projector_required:
                fit_score += 3.0

            room_card["fit_score"] = round(fit_score, 1)
            candidates.append(room_card)
        else:
            conflict_rooms.append(room_card)

    # Sort candidates by fit_score descending
    candidates.sort(key=lambda x: x.get("fit_score", 0), reverse=True)

    return {
        "search_parameters": {
            "target_date": target_date_str,
            "weekday": weekday_name,
            "start_hour": start_hour,
            "duration_hours": duration_hours,
            "end_hour": start_hour + duration_hours,
            "required_capacity": required_capacity,
            "projector_required": projector_required,
            "computers_required": computers_required,
            "accessible_required": accessible_required,
            "preferred_building": preferred_building
        },
        "total_rooms_evaluated": len(rooms),
        "available_count": len(candidates),
        "unavailable_count": len(conflict_rooms),
        "recommendations": candidates,
        "unavailable_sample": conflict_rooms[:8], # Show top unavailable rooms with their real conflict reasons
        "availability_disclaimer": "Availability estimated from the provided dataset. Synthetic campus-space observations may not reflect real-time conditions.",
        "incomplete_schedule_disclosure": "Class schedules represent recurring weekday timetables; special events reflect recorded dated entries only."
    }
