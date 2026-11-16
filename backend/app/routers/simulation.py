"""
app/routers/simulation.py
─────────────────────────
Endpoints to control simulation modes and collection execution.
"""
from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.simulation_service import (
    get_simulation_mode,
    set_simulation_mode,
    step_collection,
)

router = APIRouter(prefix="/simulation", tags=["Simulation"])


class SimulationModePayload(BaseModel):
    mode: Literal["auto", "manual"]


class SimulationModeResponse(BaseModel):
    mode: str
    message: str


@router.get("/mode", response_model=SimulationModeResponse)
def get_mode():
    """Get current bin fill simulation mode ('auto' or 'manual')."""
    current = get_simulation_mode()
    return SimulationModeResponse(
        mode=current,
        message=f"Simulation mode is currently '{current}'.",
    )


@router.post("/mode", response_model=SimulationModeResponse)
def update_mode(payload: SimulationModePayload):
    """Switch simulation mode between 'auto' (random fill) and 'manual'."""
    new_mode = set_simulation_mode(payload.mode)
    return SimulationModeResponse(
        mode=new_mode,
        message=f"Simulation mode switched to '{new_mode}'.",
    )


@router.post("/step-collection")
def trigger_step_collection(db: Session = Depends(get_db)):
    """
    Manually advance garbage collection by one step across all active trucks.
    Empties the next bin for each active truck and advances their route.
    """
    actions = step_collection(db)
    return {
        "success": True,
        "actions_count": len(actions),
        "actions": actions,
    }


@router.post("/reset")
def reset_system(db: Session = Depends(get_db)):
    """
    Reset the system state back to clean initial conditions:
      - Wipes all active/pending/completed RouteTasks.
      - Wipes all CrisisEvents.
      - Resets all trucks back to 'idle' at their initial GPS locations.
      - Resets bins back to clean capacities.
    """
    from app.models.crisis_event import CrisisEvent
    from app.models.route_task import RouteTask
    from app.models.truck import Truck, TruckStatus
    from app.models.trash_bin import TrashBin

    db.query(CrisisEvent).delete()
    db.query(RouteTask).delete()

    truck_coords = {
        "B-1234-WW": "-6.2000,106.8166",
        "B-5678-WW": "-6.2100,106.8200",
        "B-9012-WW": "-6.1900,106.8100",
    }
    for t in db.query(Truck).all():
        t.status = TruckStatus.idle
        if t.plate_number in truck_coords:
            t.current_gps_location = truck_coords[t.plate_number]

    initial_caps = {
        "Jl. Sudirman Blok A": 10.0,
        "Jl. Sudirman Blok B": 45.0,
        "Jl. Thamrin Blok A": 80.0,
        "Jl. Thamrin Blok B": 20.0,
        "Pasar Minggu Utara": 65.0,
        "Pasar Minggu Selatan": 90.0,
        "Kebayoran Baru A": 30.0,
        "Kebayoran Baru B": 55.0,
        "Tebet Timur": 78.0,
        "Tebet Barat": 5.0,
        "Cawang Junction": 40.0,
        "Cawang Interchange": 12.0,
    }
    for b in db.query(TrashBin).all():
        b.current_capacity_pct = initial_caps.get(b.location_name, 0.0)

    db.commit()
    return {"success": True, "message": "System state reset to clean starting point."}
