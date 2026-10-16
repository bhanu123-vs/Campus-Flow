"""
Repeatable CSV import script for CampusFlow AI.
Imports rooms.csv, class_schedule.csv, events.csv, and room_requests.csv into the database.
Handles idempotent loading (clears or updates without duplication) and reports row counts.
"""

import os
import sys
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.database import engine, SessionLocal, Base, db_status
from backend.app.models import Room, ClassSchedule, Event, RoomRequest

DATA_DIR = os.environ.get("DATA_DIR", "data/02_education_campus_space")

def import_all():
    print(f"Starting data import from {DATA_DIR}...")
    print(f"Target Database: {db_status['active_db']}")

    # Ensure tables exist
    Base.metadata.create_all(bind=engine)
    session: Session = SessionLocal()

    stats = {}

    try:
        # 1. Rooms
        rooms_csv = os.path.join(DATA_DIR, "rooms.csv")
        if not os.path.exists(rooms_csv):
            raise FileNotFoundError(f"Missing {rooms_csv}")
        df_rooms = pd.read_csv(rooms_csv)
        print(f"Inspecting rooms.csv: {len(df_rooms)} rows, columns: {list(df_rooms.columns)}")

        # Delete existing and repopulate cleanly
        session.query(ClassSchedule).delete()
        session.query(Event).delete()
        session.query(Room).delete()
        session.flush()

        rooms_to_add = []
        for _, row in df_rooms.iterrows():
            rooms_to_add.append(Room(
                room_id=str(row["room_id"]).strip(),
                building=str(row["building"]).strip(),
                floor=int(row["floor"]),
                room_type=str(row["room_type"]).strip(),
                capacity=int(row["capacity"]),
                projector=int(row["projector"]),
                computers=int(row["computers"]),
                accessible=int(row["accessible"]),
                power_outlets=int(row["power_outlets"])
            ))
        session.bulk_save_objects(rooms_to_add)
        session.commit()
        stats["rooms"] = len(rooms_to_add)
        print(f"Imported {stats['rooms']} rooms.")

        # 2. Class Schedules
        sched_csv = os.path.join(DATA_DIR, "class_schedule.csv")
        if not os.path.exists(sched_csv):
            raise FileNotFoundError(f"Missing {sched_csv}")
        df_sched = pd.read_csv(sched_csv)
        print(f"Inspecting class_schedule.csv: {len(df_sched)} rows, columns: {list(df_sched.columns)}")

        sched_to_add = []
        valid_room_ids = set(df_rooms["room_id"].astype(str).str.strip())
        for _, row in df_sched.iterrows():
            rid = str(row["room_id"]).strip()
            if rid not in valid_room_ids:
                continue
            sched_to_add.append(ClassSchedule(
                schedule_id=int(row["schedule_id"]),
                room_id=rid,
                course_code=str(row["course_code"]).strip(),
                weekday=str(row["weekday"]).strip(),
                start_hour=int(row["start_hour"]),
                duration_hours=int(row["duration_hours"]),
                expected_attendance=int(row["expected_attendance"]),
                department=str(row["department"]).strip()
            ))
        session.bulk_save_objects(sched_to_add)
        session.commit()
        stats["class_schedules"] = len(sched_to_add)
        print(f"Imported {stats['class_schedules']} class schedules.")

        # 3. Events
        events_csv = os.path.join(DATA_DIR, "events.csv")
        if not os.path.exists(events_csv):
            raise FileNotFoundError(f"Missing {events_csv}")
        df_events = pd.read_csv(events_csv)
        print(f"Inspecting events.csv: {len(df_events)} rows, columns: {list(df_events.columns)}")

        events_to_add = []
        for _, row in df_events.iterrows():
            rid = str(row["room_id"]).strip()
            if rid not in valid_room_ids:
                continue
            events_to_add.append(Event(
                event_id=int(row["event_id"]),
                room_id=rid,
                event_type=str(row["event_type"]).strip(),
                start_time=str(row["start_time"]).strip(),
                duration_hours=int(row["duration_hours"]),
                expected_attendance=int(row["expected_attendance"]),
                actual_attendance=int(row["actual_attendance"])
            ))
        session.bulk_save_objects(events_to_add)
        session.commit()
        stats["events"] = len(events_to_add)
        print(f"Imported {stats['events']} events.")

        # 4. Room Requests
        req_csv = os.path.join(DATA_DIR, "room_requests.csv")
        if not os.path.exists(req_csv):
            raise FileNotFoundError(f"Missing {req_csv}")
        df_req = pd.read_csv(req_csv)
        print(f"Inspecting room_requests.csv: {len(df_req)} rows, columns: {list(df_req.columns)}")

        # Clear existing unassigned synthetic requests, keep user-submitted requests if any
        session.query(RoomRequest).filter(RoomRequest.requested_room_id.is_(None)).delete()
        session.flush()

        reqs_to_add = []
        for _, row in df_req.iterrows():
            reqs_to_add.append(RoomRequest(
                request_id=int(row["request_id"]),
                request_date=str(row["request_date"]).strip(),
                start_hour=int(row["start_hour"]),
                duration_hours=int(row["duration_hours"]),
                required_capacity=int(row["required_capacity"]),
                projector_required=int(row.get("projector_required", 0)),
                computers_required=int(row.get("computers_required", 0)),
                purpose=str(row.get("purpose", "General Study")),
                status=str(row.get("status", "Pending")),
                requested_room_id=None
            ))
        session.bulk_save_objects(reqs_to_add)
        session.commit()
        stats["room_requests"] = len(reqs_to_add)
        print(f"Imported {stats['room_requests']} room requests.")

        print("Data import completed successfully!")
        return stats
    except Exception as e:
        session.rollback()
        print(f"Data import failed: {str(e)}")
        raise e
    finally:
        session.close()

if __name__ == "__main__":
    import_all()
