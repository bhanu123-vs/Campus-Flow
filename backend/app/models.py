from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float
from sqlalchemy.orm import relationship
from backend.app.database import Base

class Room(Base):
    __tablename__ = "rooms"

    room_id = Column(String, primary_key=True, index=True)
    building = Column(String, index=True, nullable=False)
    floor = Column(Integer, nullable=False)
    room_type = Column(String, index=True, nullable=False)
    capacity = Column(Integer, nullable=False)
    projector = Column(Integer, default=0)
    computers = Column(Integer, default=0)
    accessible = Column(Integer, default=0)
    power_outlets = Column(Integer, default=0)

    # Relationships
    schedules = relationship("ClassSchedule", back_populates="room", cascade="all, delete-orphan")
    events = relationship("Event", back_populates="room", cascade="all, delete-orphan")

class ClassSchedule(Base):
    __tablename__ = "class_schedules"

    schedule_id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("rooms.room_id"), nullable=False, index=True)
    course_code = Column(String, nullable=False, index=True)
    weekday = Column(String, nullable=False, index=True)
    start_hour = Column(Integer, nullable=False)
    duration_hours = Column(Integer, nullable=False)
    expected_attendance = Column(Integer, nullable=False)
    department = Column(String, nullable=False)

    room = relationship("Room", back_populates="schedules")

class Event(Base):
    __tablename__ = "events"

    event_id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("rooms.room_id"), nullable=False, index=True)
    event_type = Column(String, nullable=False)
    start_time = Column(String, nullable=False, index=True) # YYYY-MM-DD HH:MM:SS
    duration_hours = Column(Integer, nullable=False)
    expected_attendance = Column(Integer, nullable=False)
    actual_attendance = Column(Integer, nullable=False)

    room = relationship("Room", back_populates="events")

class RoomRequest(Base):
    __tablename__ = "room_requests"

    request_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    request_date = Column(String, nullable=False, index=True) # YYYY-MM-DD
    start_hour = Column(Integer, nullable=False)
    duration_hours = Column(Integer, nullable=False)
    required_capacity = Column(Integer, nullable=False)
    projector_required = Column(Integer, default=0)
    computers_required = Column(Integer, default=0)
    purpose = Column(String, nullable=False)
    status = Column(String, nullable=False, default="Submitted") # Submitted, Approved, Pending, Rejected
    requested_room_id = Column(String, nullable=True) # Populated when submitted from Find a Room
    created_at = Column(String, nullable=True)
