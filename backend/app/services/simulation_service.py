"""
app/services/simulation_service.py
───────────────────────────────────
Core service for:
  1. Managing simulation mode ('auto' vs 'manual' bins fill).
  2. Simulating garbage collection progress along active truck routes.
"""
import logging
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from app.core.config import settings
from app.models.trash_bin import TrashBin
from app.models.truck import Truck, TruckStatus
from app.models.route_task import RouteTask, RouteTaskStatus

logger = logging.getLogger(__name__)

# Fallback mode when Redis is not available
_CURRENT_MODE: str = "auto"
REDIS_KEY_SIM_MODE = "wasteway:simulation:mode"


def _get_redis():
    try:
        import redis as redis_lib
        client = redis_lib.from_url(settings.REDIS_URL, decode_responses=True)
        client.ping()
        return client
    except Exception:
        return None


def get_simulation_mode() -> str:
    """Return 'auto' or 'manual'."""
    global _CURRENT_MODE
    r = _get_redis()
    if r:
        try:
            val = r.get(REDIS_KEY_SIM_MODE)
            if val in ("auto", "manual"):
                return val
        except Exception as exc:
            logger.warning(f"Failed to read mode from Redis: {exc}")
    return _CURRENT_MODE


def set_simulation_mode(mode: Literal["auto", "manual"]) -> str:
    """Set simulation mode to 'auto' or 'manual'."""
    global _CURRENT_MODE
    _CURRENT_MODE = mode
    r = _get_redis()
    if r:
        try:
            r.set(REDIS_KEY_SIM_MODE, mode)
        except Exception as exc:
            logger.warning(f"Failed to set mode in Redis: {exc}")
    return _CURRENT_MODE


def step_collection(db: Session) -> list[dict]:
    """
    Simulate one step of garbage collection for each active RouteTask:
      1. Find the first uncollected waypoint in the task.
      2. Move the truck to that waypoint's GPS coordinates.
      3. Empty that bin (current_capacity_pct = 0.0).
      4. Mark the waypoint as collected.
      5. If all waypoints for this task are collected, mark RouteTask as
         completed and return truck to idle.
    """
    active_tasks = (
        db.query(RouteTask)
        .filter(RouteTask.status == RouteTaskStatus.active)
        .all()
    )

    actions = []

    for task in active_tasks:
        truck = db.get(Truck, task.truck_id)
        if not truck or truck.status == TruckStatus.out_of_service:
            continue

        waypoints = list(task.waypoints or [])
        target_wp = None
        target_idx = -1

        for idx, wp in enumerate(waypoints):
            if not wp.get("collected"):
                target_wp = wp
                target_idx = idx
                break

        if target_wp is not None:
            # Move truck to waypoint location
            lat = target_wp.get("latitude")
            lng = target_wp.get("longitude")
            if lat is not None and lng is not None:
                truck.current_gps_location = f"{lat},{lng}"

            # Empty the bin
            bin_id = target_wp.get("bin_id")
            bin_name = target_wp.get("location_name", f"Bin #{bin_id}")
            if bin_id:
                bin_obj = db.get(TrashBin, bin_id)
                if bin_obj:
                    bin_obj.current_capacity_pct = 0.0
                    bin_obj.last_updated = datetime.now(timezone.utc)

            # Mark waypoint as collected
            target_wp["collected"] = True
            target_wp["collected_at"] = datetime.now(timezone.utc).isoformat()
            waypoints[target_idx] = target_wp
            task.waypoints = waypoints
            flag_modified(task, "waypoints")

            # Check if all waypoints are collected
            all_done = all(w.get("collected") is True for w in waypoints)
            if all_done:
                task.status = RouteTaskStatus.completed
                truck.status = TruckStatus.idle

            actions.append({
                "truck_id": truck.id,
                "plate_number": truck.plate_number,
                "bin_id": bin_id,
                "location_name": bin_name,
                "task_id": task.id,
                "task_completed": all_done,
                "remaining_waypoints": sum(1 for w in waypoints if not w.get("collected")),
            })

    if actions:
        db.commit()

    return actions
