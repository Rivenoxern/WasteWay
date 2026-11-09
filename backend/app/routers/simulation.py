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
