from __future__ import annotations

import csv
import io
import json
import math
import os
import sqlite3
import threading
import time
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional, Literal

import requests
from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Form, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from twilio.rest import Client as TwilioClient
from twilio.twiml.voice_response import VoiceResponse

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
STATIC_DIR = BASE_DIR / "static"
AUDIO_DIR = BASE_DIR / "audio"
DB_PATH = BASE_DIR / "dispatch.db"

HOST = os.getenv("HOST", "localhost")
PORT = int(os.getenv("PORT", "8000"))
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:4040").rstrip("/")
SIMULATION_MODE = os.getenv("SIMULATION_MODE", "false").lower() == "true"
print(f"[STARTUP] SIMULATION_MODE = {SIMULATION_MODE}")
AVG_SPEED_MPH = float(os.getenv("AVG_SPEED_MPH", "45"))
ROUTE_MULTIPLIER = float(os.getenv("ROUTE_MULTIPLIER", "1.15"))
DISPATCH_TIMEOUT_SECONDS = int(os.getenv("DISPATCH_TIMEOUT_SECONDS", "30"))

DELICACY_RATING_THRESHOLDS = {
    "low": float(os.getenv("DELICACY_LOW_THRESHOLD", "2.8")),
    "medium": float(os.getenv("DELICACY_MEDIUM_THRESHOLD", "3.8")),
    "high": float(os.getenv("DELICACY_HIGH_THRESHOLD", "4.5")),
}

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY", "")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID", "JBFqnCBsd6RMkjVDRZzb")
ELEVENLABS_TTS_MODEL = os.getenv("ELEVENLABS_TTS_MODEL", "eleven_multilingual_v2")
ELEVENLABS_STT_MODEL = os.getenv("ELEVENLABS_STT_MODEL", "scribe_v2")

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")

DB_LOCK = threading.Lock()
JOB_LOCK = threading.Lock()

app = FastAPI(title="Truck Dispatch Ranking + AI Calling")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


class RankRequest(BaseModel):
    source_lat: float
    source_lng: float
    target_lat: float
    target_lng: float
    avg_speed_mph: float = Field(default=AVG_SPEED_MPH, gt=0)
    route_multiplier: float = Field(default=ROUTE_MULTIPLIER, ge=1.0)
    estimated_delivery_hours: Optional[float] = Field(default=None, gt=0)
    parcel_delicacy: Literal["low", "medium", "high"] = "medium"


class DispatchRequest(RankRequest):
    delivery_name: str = "Delivery Task"


@dataclass
class Driver:
    driver_id: str
    name: str
    phone_number: str
    current_lat: float
    current_lng: float
    hos_left_hours: float
    simulated_willing: bool
    total_deliveries: int
    on_time_deliveries: int
    late_deliveries: int
    damaged_deliveries: int
    accepted_assignments: int
    rating: float


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_dirs() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def db_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with DB_LOCK:
        conn = db_conn()
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS drivers (
                driver_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone_number TEXT NOT NULL,
                current_lat REAL NOT NULL,
                current_lng REAL NOT NULL,
                hos_left_hours REAL NOT NULL,
                simulated_willing INTEGER NOT NULL DEFAULT 0,
                total_deliveries INTEGER NOT NULL DEFAULT 0,
                on_time_deliveries INTEGER NOT NULL DEFAULT 0,
                late_deliveries INTEGER NOT NULL DEFAULT 0,
                damaged_deliveries INTEGER NOT NULL DEFAULT 0,
                accepted_assignments INTEGER NOT NULL DEFAULT 0,
                rating REAL NOT NULL DEFAULT 3.0
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                delivery_name TEXT NOT NULL,
                source_lat REAL NOT NULL,
                source_lng REAL NOT NULL,
                target_lat REAL NOT NULL,
                target_lng REAL NOT NULL,
                avg_speed_mph REAL NOT NULL,
                route_multiplier REAL NOT NULL,
                estimated_delivery_hours REAL NOT NULL,
                parcel_delicacy TEXT NOT NULL DEFAULT 'medium',
                rating_threshold REAL NOT NULL DEFAULT 3.8,
                status TEXT NOT NULL,
                latest_message TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                assigned_driver_id TEXT,
                assigned_driver_name TEXT
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS job_candidates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT NOT NULL,
                rank_order INTEGER NOT NULL,
                driver_id TEXT NOT NULL,
                score REAL NOT NULL,
                distance_to_source_mi REAL NOT NULL,
                route_distance_mi REAL NOT NULL,
                estimated_hours_to_complete REAL NOT NULL,
                hos_left_hours REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',
                transcript TEXT,
                answer TEXT,
                called_at TEXT,
                responded_at TEXT,
                FOREIGN KEY(job_id) REFERENCES jobs(job_id)
            )
            """
        )
        conn.commit()
        conn.close()


def ensure_driver_columns() -> None:
    required = {
        "simulated_willing": "INTEGER NOT NULL DEFAULT 0",
        "total_deliveries": "INTEGER NOT NULL DEFAULT 0",
        "on_time_deliveries": "INTEGER NOT NULL DEFAULT 0",
        "late_deliveries": "INTEGER NOT NULL DEFAULT 0",
        "damaged_deliveries": "INTEGER NOT NULL DEFAULT 0",
        "accepted_assignments": "INTEGER NOT NULL DEFAULT 0",
        "rating": "REAL NOT NULL DEFAULT 3.0",
    }
    with DB_LOCK:
        conn = db_conn()
        cols = {row[1] for row in conn.execute("PRAGMA table_info(drivers)").fetchall()}
        for name, ddl in required.items():
            if name not in cols:
                conn.execute(f"ALTER TABLE drivers ADD COLUMN {name} {ddl}")
        conn.commit()
        conn.close()


def rating_from_history(total_deliveries: int, on_time_deliveries: int, late_deliveries: int, damaged_deliveries: int, accepted_assignments: int) -> float:
    completed = max(int(total_deliveries), int(on_time_deliveries) + int(late_deliveries), 0)
    if completed <= 0:
        return 3.0
    punctuality = int(on_time_deliveries) / completed
    acceptance = min(1.0, int(accepted_assignments) / max(completed, 1))
    damage_ratio = int(damaged_deliveries) / max(int(total_deliveries), 1)
    rating = 1.5 + (2.6 * punctuality) + (0.7 * acceptance) - (1.1 * damage_ratio)
    return round(max(1.0, min(5.0, rating)), 2)


def driver_to_row(d: Driver) -> dict[str, Any]:
    return {
        "driver_id": d.driver_id,
        "name": d.name,
        "phone_number": d.phone_number,
        "current_lat": d.current_lat,
        "current_lng": d.current_lng,
        "hos_left_hours": d.hos_left_hours,
        "simulated_willing": int(d.simulated_willing),
        "total_deliveries": d.total_deliveries,
        "on_time_deliveries": d.on_time_deliveries,
        "late_deliveries": d.late_deliveries,
        "damaged_deliveries": d.damaged_deliveries,
        "accepted_assignments": d.accepted_assignments,
        "rating": d.rating,
    }


def save_drivers_to_csv(drivers: list[Driver]) -> None:
    csv_path = DATA_DIR / "drivers.csv"
    fieldnames = [
        "driver_id",
        "name",
        "phone_number",
        "current_lat",
        "current_lng",
        "hos_left_hours",
        "simulated_willing",
        "total_deliveries",
        "on_time_deliveries",
        "late_deliveries",
        "damaged_deliveries",
        "accepted_assignments",
        "rating",
    ]
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for d in drivers:
            row = driver_to_row(d)
            row["simulated_willing"] = str(bool(row["simulated_willing"]))
            writer.writerow(row)


def load_seed_drivers() -> None:
    ensure_driver_columns()
    csv_path = DATA_DIR / "drivers.csv"
    with csv_path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []
        for r in reader:
            total_deliveries = int(float(r.get("total_deliveries", 0) or 0))
            on_time_deliveries = int(float(r.get("on_time_deliveries", 0) or 0))
            late_deliveries = int(float(r.get("late_deliveries", 0) or 0))
            damaged_deliveries = int(float(r.get("damaged_deliveries", 0) or 0))
            accepted_assignments = int(float(r.get("accepted_assignments", 0) or 0))
            rating = float(r.get("rating") or rating_from_history(total_deliveries, on_time_deliveries, late_deliveries, damaged_deliveries, accepted_assignments))
            rows.append(
                (
                    r["driver_id"],
                    r["name"],
                    r["phone_number"],
                    float(r["current_lat"]),
                    float(r["current_lng"]),
                    float(r["hos_left_hours"]),
                    1 if str(r.get("simulated_willing", "false")).lower() == "true" else 0,
                    total_deliveries,
                    on_time_deliveries,
                    late_deliveries,
                    damaged_deliveries,
                    accepted_assignments,
                    rating,
                )
            )

    with DB_LOCK:
        conn = db_conn()
        conn.executemany(
            """
            INSERT INTO drivers(driver_id, name, phone_number, current_lat, current_lng, hos_left_hours,
                               simulated_willing, total_deliveries, on_time_deliveries, late_deliveries,
                               damaged_deliveries, accepted_assignments, rating)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(driver_id) DO UPDATE SET
                name=excluded.name,
                phone_number=excluded.phone_number,
                current_lat=excluded.current_lat,
                current_lng=excluded.current_lng,
                hos_left_hours=excluded.hos_left_hours,
                simulated_willing=excluded.simulated_willing,
                total_deliveries=excluded.total_deliveries,
                on_time_deliveries=excluded.on_time_deliveries,
                late_deliveries=excluded.late_deliveries,
                damaged_deliveries=excluded.damaged_deliveries,
                accepted_assignments=excluded.accepted_assignments,
                rating=excluded.rating
            """,
            rows,
        )
        conn.commit()
        conn.close()

    persist_drivers_from_db()


def persist_drivers_from_db() -> None:
    with DB_LOCK:
        conn = db_conn()
        rows = conn.execute("SELECT * FROM drivers ORDER BY driver_id").fetchall()
        conn.close()
    drivers = [
        Driver(
            driver_id=r["driver_id"],
            name=r["name"],
            phone_number=r["phone_number"],
            current_lat=r["current_lat"],
            current_lng=r["current_lng"],
            hos_left_hours=r["hos_left_hours"],
            simulated_willing=bool(r["simulated_willing"]),
            total_deliveries=int(r["total_deliveries"]),
            on_time_deliveries=int(r["on_time_deliveries"]),
            late_deliveries=int(r["late_deliveries"]),
            damaged_deliveries=int(r["damaged_deliveries"]),
            accepted_assignments=int(r["accepted_assignments"]),
            rating=float(r["rating"]),
        )
        for r in rows
    ]
    save_drivers_to_csv(drivers)


def get_drivers() -> list[Driver]:
    with DB_LOCK:
        conn = db_conn()
        rows = conn.execute("SELECT * FROM drivers ORDER BY driver_id").fetchall()
        conn.close()
    return [
        Driver(
            driver_id=r["driver_id"],
            name=r["name"],
            phone_number=r["phone_number"],
            current_lat=r["current_lat"],
            current_lng=r["current_lng"],
            hos_left_hours=r["hos_left_hours"],
            simulated_willing=bool(r["simulated_willing"]),
            total_deliveries=int(r["total_deliveries"]),
            on_time_deliveries=int(r["on_time_deliveries"]),
            late_deliveries=int(r["late_deliveries"]),
            damaged_deliveries=int(r["damaged_deliveries"]),
            accepted_assignments=int(r["accepted_assignments"]),
            rating=float(r["rating"]),
        )
        for r in rows
    ]


def save_job(job: dict[str, Any]) -> None:
    with DB_LOCK:
        conn = db_conn()
        conn.execute(
            """
            INSERT INTO jobs(job_id, delivery_name, source_lat, source_lng, target_lat, target_lng,
                             avg_speed_mph, route_multiplier, estimated_delivery_hours, parcel_delicacy,
                             rating_threshold, status, latest_message, created_at, updated_at, assigned_driver_id, assigned_driver_name)
            VALUES(:job_id, :delivery_name, :source_lat, :source_lng, :target_lat, :target_lng,
                   :avg_speed_mph, :route_multiplier, :estimated_delivery_hours, :parcel_delicacy,
                   :rating_threshold, :status, :latest_message, :created_at, :updated_at, :assigned_driver_id, :assigned_driver_name)
            """,
            job,
        )
        conn.commit()
        conn.close()


def update_job(job_id: str, **fields: Any) -> None:
    if not fields:
        return
    fields["updated_at"] = utc_now()
    assignments = ", ".join([f"{k} = :{k}" for k in fields.keys()])
    fields["job_id"] = job_id
    with DB_LOCK:
        conn = db_conn()
        conn.execute(f"UPDATE jobs SET {assignments} WHERE job_id = :job_id", fields)
        conn.commit()
        conn.close()


def save_candidates(job_id: str, candidates: list[dict[str, Any]]) -> None:
    with DB_LOCK:
        conn = db_conn()
        conn.executemany(
            """
            INSERT INTO job_candidates(job_id, rank_order, driver_id, score, distance_to_source_mi,
                                       route_distance_mi, estimated_hours_to_complete, hos_left_hours,
                                       status, called_at)
            VALUES(:job_id, :rank_order, :driver_id, :score, :distance_to_source_mi,
                   :route_distance_mi, :estimated_hours_to_complete, :hos_left_hours,
                   :status, :called_at)
            """,
            candidates,
        )
        conn.commit()
        conn.close()


def update_candidate(job_id: str, driver_id: str, **fields: Any) -> None:
    if not fields:
        return
    fields["job_id"] = job_id
    fields["driver_id"] = driver_id
    assignments = ", ".join([f"{k} = :{k}" for k in fields.keys()])
    with DB_LOCK:
        conn = db_conn()
        conn.execute(
            f"UPDATE job_candidates SET {assignments} WHERE job_id = :job_id AND driver_id = :driver_id",
            fields,
        )
        conn.commit()
        conn.close()


def get_job(job_id: str) -> Optional[dict[str, Any]]:
    with DB_LOCK:
        conn = db_conn()
        row = conn.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
        conn.close()
    return dict(row) if row else None


def get_candidates(job_id: str) -> list[dict[str, Any]]:
    with DB_LOCK:
        conn = db_conn()
        rows = conn.execute(
            "SELECT * FROM job_candidates WHERE job_id = ? ORDER BY rank_order ASC",
            (job_id,),
        ).fetchall()
        conn.close()
    return [dict(r) for r in rows]


def get_driver_by_id(driver_id: str) -> Optional[Driver]:
    with DB_LOCK:
        conn = db_conn()
        row = conn.execute("SELECT * FROM drivers WHERE driver_id = ?", (driver_id,)).fetchone()
        conn.close()
    if not row:
        return None
    return Driver(
        driver_id=row["driver_id"],
        name=row["name"],
        phone_number=row["phone_number"],
        current_lat=row["current_lat"],
        current_lng=row["current_lng"],
        hos_left_hours=row["hos_left_hours"],
        simulated_willing=bool(row["simulated_willing"]),
        total_deliveries=int(row["total_deliveries"]),
        on_time_deliveries=int(row["on_time_deliveries"]),
        late_deliveries=int(row["late_deliveries"]),
        damaged_deliveries=int(row["damaged_deliveries"]),
        accepted_assignments=int(row["accepted_assignments"]),
        rating=float(row["rating"]),
    )


def haversine_miles(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 3958.7613
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlon / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def rating_threshold_for(delicacy: str) -> float:
    delicacy = (delicacy or "medium").lower()
    if delicacy not in DELICACY_RATING_THRESHOLDS:
        return DELICACY_RATING_THRESHOLDS["medium"]
    return DELICACY_RATING_THRESHOLDS[delicacy]


def delivery_history_stats(d: Driver) -> dict[str, Any]:
    completed = max(d.total_deliveries, d.on_time_deliveries + d.late_deliveries)
    punctuality = (d.on_time_deliveries / completed) if completed else 0.0
    damage_rate = (d.damaged_deliveries / d.total_deliveries) if d.total_deliveries else 0.0
    acceptance_rate = (d.accepted_assignments / d.total_deliveries) if d.total_deliveries else 0.0
    return {
        "completed_deliveries": completed,
        "punctuality": round(punctuality, 3),
        "damage_rate": round(damage_rate, 3),
        "acceptance_rate": round(acceptance_rate, 3),
    }


def update_driver_hos(driver_id: str, hours_deducted: float) -> None:
    with DB_LOCK:
        conn = db_conn()
        row = conn.execute("SELECT * FROM drivers WHERE driver_id = ?", (driver_id,)).fetchone()
        if not row:
            conn.close()
            return
        updated_hos = max(0.0, float(row["hos_left_hours"]) - float(hours_deducted))
        conn.execute(
            "UPDATE drivers SET hos_left_hours = ? WHERE driver_id = ?",
            (updated_hos, driver_id),
        )
        conn.commit()
        conn.close()
    persist_drivers_from_db()


def estimate_delivery_hours(source_lat: float, source_lng: float, target_lat: float, target_lng: float, avg_speed_mph: float, route_multiplier: float, manual_hours: Optional[float]) -> float:
    if manual_hours is not None:
        return float(manual_hours)
    route_miles = haversine_miles(source_lat, source_lng, target_lat, target_lng) * route_multiplier
    return route_miles / avg_speed_mph


def compute_rankings(req: RankRequest) -> list[dict[str, Any]]:
    route_hours = estimate_delivery_hours(
        req.source_lat, req.source_lng, req.target_lat, req.target_lng, req.avg_speed_mph, req.route_multiplier, req.estimated_delivery_hours
    )
    delicacy_threshold = rating_threshold_for(req.parcel_delicacy)
    drivers = get_drivers()
    scored: list[dict[str, Any]] = []
    route_distance_mi = haversine_miles(req.source_lat, req.source_lng, req.target_lat, req.target_lng) * req.route_multiplier

    for d in drivers:
        distance_to_source = haversine_miles(d.current_lat, d.current_lng, req.source_lat, req.source_lng)
        travel_hours_to_source = distance_to_source / req.avg_speed_mph
        total_required_hours = travel_hours_to_source + route_hours
        if d.hos_left_hours < total_required_hours:
            continue
        if d.rating < delicacy_threshold:
            continue

        slack_ratio = min(1.0, d.hos_left_hours / max(total_required_hours, 0.001))
        distance_score = 1 / (1 + distance_to_source)
        rating_score = d.rating / 5.0
        score = (distance_score * 0.45) + (slack_ratio * 0.25) + (rating_score * 0.30)

        scored.append(
            {
                "driver_id": d.driver_id,
                "name": d.name,
                "phone_number": d.phone_number,
                "current_lat": d.current_lat,
                "current_lng": d.current_lng,
                "hos_left_hours": d.hos_left_hours,
                "rating": d.rating,
                "delivery_history": delivery_history_stats(d),
                "distance_to_source_mi": distance_to_source,
                "route_distance_mi": route_distance_mi,
                "estimated_hours_to_complete": total_required_hours,
                "score": score,
                "parcel_delicacy": req.parcel_delicacy,
                "rating_threshold": delicacy_threshold,
                "simulated_willing": d.simulated_willing,
            }
        )

    scored.sort(key=lambda x: (-x["score"], -x["rating"], x["distance_to_source_mi"], -x["hos_left_hours"]))
    return scored


def create_tts_audio(text: str) -> str:
    ensure_dirs()
    if not ELEVENLABS_API_KEY:
        raise RuntimeError("ELEVENLABS_API_KEY is not set")
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVENLABS_VOICE_ID}"
    params = {"output_format": "mp3_44100_128"}
    headers = {"xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json"}
    payload = {"text": text, "model_id": ELEVENLABS_TTS_MODEL}
    resp = requests.post(url, params=params, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    filename = f"{uuid.uuid4().hex}.mp3"
    out_path = AUDIO_DIR / filename
    out_path.write_bytes(resp.content)
    return filename


def transcribe_with_elevenlabs(audio_bytes: bytes) -> str:
    if not ELEVENLABS_API_KEY:
        return ""
    url = "https://api.elevenlabs.io/v1/speech-to-text"
    headers = {"xi-api-key": ELEVENLABS_API_KEY}
    files = {"file": ("recording.wav", audio_bytes, "audio/wav")}
    data = {"model_id": ELEVENLABS_STT_MODEL}
    resp = requests.post(url, headers=headers, files=files, data=data, timeout=120)
    resp.raise_for_status()
    return resp.json().get("text", "")


def is_affirmative(text: str) -> bool:
    t = text.lower().strip()
    affirmative = ["yes", "yeah", "yep", "sure", "okay", "ok", "i can", "willing", "accept", "agree", "send it", "confirm"]
    return any(word in t for word in affirmative)


def get_twilio_client() -> Optional[TwilioClient]:
    if not (TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN):
        return None
    return TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)


def create_job_from_request(req: DispatchRequest, status: str = "queued", latest_message: str = "Queued") -> dict[str, Any]:
    route_hours = estimate_delivery_hours(req.source_lat, req.source_lng, req.target_lat, req.target_lng, req.avg_speed_mph, req.route_multiplier, req.estimated_delivery_hours)
    threshold = rating_threshold_for(req.parcel_delicacy)
    return {
        "job_id": uuid.uuid4().hex,
        "delivery_name": req.delivery_name,
        "source_lat": req.source_lat,
        "source_lng": req.source_lng,
        "target_lat": req.target_lat,
        "target_lng": req.target_lng,
        "avg_speed_mph": req.avg_speed_mph,
        "route_multiplier": req.route_multiplier,
        "estimated_delivery_hours": route_hours,
        "parcel_delicacy": req.parcel_delicacy,
        "rating_threshold": threshold,
        "status": status,
        "latest_message": latest_message,
        "created_at": utc_now(),
        "updated_at": utc_now(),
        "assigned_driver_id": None,
        "assigned_driver_name": None,
    }


def wait_for_candidate_result(job_id: str, driver_id: str, timeout_seconds: int) -> dict[str, Any]:
    start = time.time()
    while time.time() - start < timeout_seconds:
        with DB_LOCK:
            conn = db_conn()
            row = conn.execute(
                "SELECT * FROM job_candidates WHERE job_id = ? AND driver_id = ?",
                (job_id, driver_id),
            ).fetchone()
            conn.close()
        if row and row["status"] in {"answered_yes", "answered_no", "failed"}:
            return dict(row)
        time.sleep(1.0)
    return {"status": "timeout"}


def process_dispatch_job(job_id: str, ranked: list[dict[str, Any]]) -> None:
    update_job(job_id, status="running", latest_message="Calling drivers in ranking order")
    twilio = get_twilio_client()
    print(f"[DEBUG] twilio object = {twilio}")
    for idx, candidate in enumerate(ranked, start=1):
        driver = get_driver_by_id(candidate["driver_id"])
        if driver is None:
            continue

        update_candidate(job_id, driver.driver_id, status="calling", called_at=utc_now())
        update_job(job_id, latest_message=f"Calling {driver.name} ({idx}/{len(ranked)})")

        question = (
            f"Hello {driver.name}. We have a delivery task named {get_job(job_id)['delivery_name']}. "
            f"Are you willing to complete it now? Please answer yes or no."
        )
        print(f"[DEBUG] SIMULATION_MODE={SIMULATION_MODE}, twilio is None={twilio is None}")
        if SIMULATION_MODE or twilio is None:
            transcript = "yes" if driver.simulated_willing else "no"
            update_candidate(
                job_id,
                driver.driver_id,
                status="answered_yes" if driver.simulated_willing else "answered_no",
                transcript=transcript,
                answer="yes" if driver.simulated_willing else "no",
                responded_at=utc_now(),
            )
            update_job(job_id, latest_message=f"Simulation result from {driver.name}: {transcript}")
            if driver.simulated_willing:
                update_driver_hos(driver.driver_id, candidate["estimated_hours_to_complete"])
                with DB_LOCK:
                    conn = db_conn()
                    conn.execute(
                        "UPDATE drivers SET accepted_assignments = accepted_assignments + 1 WHERE driver_id = ?",
                        (driver.driver_id,),
                    )
                    conn.commit()
                    conn.close()
                persist_drivers_from_db()
                update_job(
                    job_id,
                    status="completed",
                    latest_message=f"Assigned to {driver.name}",
                    assigned_driver_id=driver.driver_id,
                    assigned_driver_name=driver.name,
                )
                return
            continue

        try:
            audio_filename = create_tts_audio(question)
            voice_url = f"{PUBLIC_BASE_URL}/twilio/voice/{job_id}/{driver.driver_id}/{audio_filename}"
            call = twilio.calls.create(
                to=driver.phone_number,
                from_=TWILIO_FROM_NUMBER,
                url=voice_url,
                method="POST",
            )
            update_candidate(job_id, driver.driver_id, status="dialing", transcript=call.sid)
            update_job(job_id, latest_message=f"Dialing {driver.name}")

            result = wait_for_candidate_result(job_id, driver.driver_id, DISPATCH_TIMEOUT_SECONDS)
            if result.get("status") == "answered_yes":
                update_driver_hos(driver.driver_id, candidate["estimated_hours_to_complete"])
                with DB_LOCK:
                    conn = db_conn()
                    conn.execute(
                        "UPDATE drivers SET accepted_assignments = accepted_assignments + 1 WHERE driver_id = ?",
                        (driver.driver_id,),
                    )
                    conn.commit()
                    conn.close()
                persist_drivers_from_db()
                update_job(
                    job_id,
                    status="completed",
                    latest_message=f"Assigned to {driver.name}",
                    assigned_driver_id=driver.driver_id,
                    assigned_driver_name=driver.name,
                )
                return
            if result.get("status") in {"answered_no", "timeout", "failed"}:
                continue
        except Exception as exc:
            import traceback
            print(f"[ERROR] {driver.name}: {exc}")
            traceback.print_exc()
            update_candidate(job_id, driver.driver_id, status="failed", transcript=str(exc), responded_at=utc_now())
            update_job(job_id, latest_message=f"Call error for {driver.name}: {exc}")
            continue

    update_job(job_id, status="failed", latest_message="No eligible driver accepted the task")


@app.on_event("startup")
def on_startup() -> None:
    ensure_dirs()
    init_db()
    load_seed_drivers()


@app.get("/", response_class=HTMLResponse)
def home() -> HTMLResponse:
    return HTMLResponse((STATIC_DIR / "index.html").read_text(encoding="utf-8"))


@app.get("/api/drivers")
def api_drivers() -> list[dict[str, Any]]:
    return [
        {
            "driver_id": d.driver_id,
            "name": d.name,
            "phone_number": d.phone_number,
            "current_lat": d.current_lat,
            "current_lng": d.current_lng,
            "hos_left_hours": d.hos_left_hours,
            "rating": d.rating,
            "total_deliveries": d.total_deliveries,
            "on_time_deliveries": d.on_time_deliveries,
            "late_deliveries": d.late_deliveries,
            "damaged_deliveries": d.damaged_deliveries,
            "accepted_assignments": d.accepted_assignments,
            "simulated_willing": d.simulated_willing,
        }
        for d in get_drivers()
    ]


@app.post("/api/rank")
def api_rank(req: RankRequest) -> dict[str, Any]:
    ranked = compute_rankings(req)
    return {
        "eligible_count": len(ranked),
        "ranked": ranked,
        "parcel_delicacy": req.parcel_delicacy,
        "rating_threshold": rating_threshold_for(req.parcel_delicacy),
        "estimated_delivery_hours": estimate_delivery_hours(req.source_lat, req.source_lng, req.target_lat, req.target_lng, req.avg_speed_mph, req.route_multiplier, req.estimated_delivery_hours),
    }


@app.post("/api/dispatch/start")
def api_dispatch_start(req: DispatchRequest, background_tasks: BackgroundTasks) -> dict[str, Any]:
    ranked = compute_rankings(req)
    if not ranked:
        raise HTTPException(status_code=400, detail=f"No drivers meet the HOS and rating threshold for {req.parcel_delicacy} parcels.")

    job = create_job_from_request(req)
    save_job(job)

    candidates = []
    for i, row in enumerate(ranked, start=1):
        candidates.append(
            {
                "job_id": job["job_id"],
                "rank_order": i,
                "driver_id": row["driver_id"],
                "score": row["score"],
                "distance_to_source_mi": row["distance_to_source_mi"],
                "route_distance_mi": row["route_distance_mi"],
                "estimated_hours_to_complete": row["estimated_hours_to_complete"],
                "hos_left_hours": row["hos_left_hours"],
                "rating": row["rating"],
                "parcel_delicacy": row["parcel_delicacy"],
                "rating_threshold": row["rating_threshold"],
                "status": "queued",
                "called_at": None,
            }
        )
    save_candidates(job["job_id"], candidates)

    background_tasks.add_task(process_dispatch_job, job["job_id"], ranked)
    return {
        "job_id": job["job_id"],
        "ranked_count": len(ranked),
        "status": "queued",
        "simulation_mode": SIMULATION_MODE,
        "latest_message": "Dispatch job started",
    }


@app.get("/api/jobs/{job_id}")
def api_get_job(job_id: str) -> dict[str, Any]:
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    candidates = get_candidates(job_id)
    return {"job": job, "status": job["status"], "latest_message": job.get("latest_message"), "candidates": candidates}


@app.get("/api/jobs/{job_id}/candidates")
def api_get_candidates(job_id: str) -> list[dict[str, Any]]:
    return get_candidates(job_id)


@app.get("/audio/{filename}")
def get_audio(filename: str) -> FileResponse:
    path = AUDIO_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    return FileResponse(path)


@app.post("/twilio/voice/{job_id}/{driver_id}/{audio_filename}")
def twilio_voice(job_id: str, driver_id: str, audio_filename: str) -> Response:
    resp = VoiceResponse()
    resp.play(f"{PUBLIC_BASE_URL}/audio/{audio_filename}")
    resp.record(
        action=f"{PUBLIC_BASE_URL}/twilio/recording/{job_id}/{driver_id}",
        method="POST",
        max_length=10,
        play_beep=True,
        trim="trim-silence",
    )
    return Response(content=str(resp), media_type="application/xml")


@app.post("/twilio/recording/{job_id}/{driver_id}")
async def twilio_recording(job_id: str, driver_id: str, request: Request) -> PlainTextResponse:
    form = await request.form()
    recording_url = str(form.get("RecordingUrl", ""))
    if not recording_url:
        update_candidate(job_id, driver_id, status="failed", transcript="No recording URL received", responded_at=utc_now())
        return PlainTextResponse("missing recording url", status_code=200)

    try:
        audio_url = recording_url + ".wav"
        if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
            r = requests.get(audio_url, auth=(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN), timeout=120)
        else:
            r = requests.get(audio_url, timeout=120)
        r.raise_for_status()
        transcript = transcribe_with_elevenlabs(r.content)
        if not transcript:
            transcript = "no"
        answer = "yes" if is_affirmative(transcript) else "no"
        update_candidate(
            job_id,
            driver_id,
            status="answered_yes" if answer == "yes" else "answered_no",
            transcript=transcript,
            answer=answer,
            responded_at=utc_now(),
        )
        if answer == "yes":
            driver = get_driver_by_id(driver_id)
            if driver:
                candidate = None
                with DB_LOCK:
                    conn = db_conn()
                    candidate = conn.execute(
                        "SELECT estimated_hours_to_complete FROM job_candidates WHERE job_id = ? AND driver_id = ?",
                        (job_id, driver_id),
                    ).fetchone()
                    conn.close()
                if candidate:
                    update_driver_hos(driver.driver_id, float(candidate["estimated_hours_to_complete"]))
                    with DB_LOCK:
                        conn = db_conn()
                        conn.execute(
                            "UPDATE drivers SET accepted_assignments = accepted_assignments + 1 WHERE driver_id = ?",
                            (driver.driver_id,),
                        )
                        conn.commit()
                        conn.close()
                    persist_drivers_from_db()
                update_job(
                    job_id,
                    status="completed",
                    latest_message=f"Assigned to {driver.name}",
                    assigned_driver_id=driver.driver_id,
                    assigned_driver_name=driver.name,
                )
        return PlainTextResponse("ok", status_code=200)
    except Exception as exc:
        update_candidate(job_id, driver_id, status="failed", transcript=str(exc), responded_at=utc_now())
        return PlainTextResponse(f"error: {exc}", status_code=200)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host=HOST, port=PORT, reload=False)
