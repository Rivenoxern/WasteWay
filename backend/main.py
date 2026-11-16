"""
main.py  –  WasteWay FastAPI Application Entry Point
──────────────────────────────────────────────────────
Starts the API server, initialises the database tables on first run,
mounts all routers, and starts the background AI agent runner threads.

Run with:
    uvicorn main:app --reload --port 8000
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine

# Import models so SQLAlchemy registers them before create_all()
import app.models  # noqa: F401

from app.routers import trucks, trash_bins, route_tasks, crisis_events, agents, simulation
from app.agents.runner import start_agent_runner

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


# ── Lifespan ──────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup:
      1. Create / verify all DB tables.
      2. Auto-seed if database is freshly created and empty.
      3. Start background agent runner threads (Routing + Crisis).
    """
    Base.metadata.create_all(bind=engine)
    logger.info("✅  Database tables verified / created.")

    # Auto-seed if database is empty (e.g. fresh NeonDB deployment)
    try:
        from app.core.database import SessionLocal
        from app.models.trash_bin import TrashBin
        from app.models.driver import Driver
        from app.models.truck import Truck, TruckStatus

        db = SessionLocal()
        if db.query(TrashBin).count() == 0:
            logger.info("🌱 Database is empty. Seeding initial fleet and bins...")
            drivers = [
                Driver(name="Budi Santoso", license_number="SIM-001", phone="081234567890"),
                Driver(name="Agus Wijaya", license_number="SIM-002", phone="081234567891"),
                Driver(name="Dewi Rahayu", license_number="SIM-003", phone="081234567892"),
            ]
            db.add_all(drivers)
            db.flush()

            trucks = [
                Truck(plate_number="B-1234-WW", driver_id=drivers[0].id, status=TruckStatus.idle, current_gps_location="-6.2000,106.8166"),
                Truck(plate_number="B-5678-WW", driver_id=drivers[1].id, status=TruckStatus.idle, current_gps_location="-6.2100,106.8200"),
                Truck(plate_number="B-9012-WW", driver_id=drivers[2].id, status=TruckStatus.idle, current_gps_location="-6.1900,106.8100"),
            ]
            db.add_all(trucks)

            bin_data = [
                ("Jl. Sudirman Blok A",   -6.2088, 106.8227,  10.0),
                ("Jl. Sudirman Blok B",   -6.2095, 106.8240,  45.0),
                ("Jl. Thamrin Blok A",    -6.1944, 106.8229,  80.0),
                ("Jl. Thamrin Blok B",    -6.1950, 106.8235,  20.0),
                ("Pasar Minggu Utara",    -6.2600, 106.8420,  65.0),
                ("Pasar Minggu Selatan",  -6.2650, 106.8430,  90.0),
                ("Kebayoran Baru A",      -6.2383, 106.7971,  30.0),
                ("Kebayoran Baru B",      -6.2390, 106.7980,  55.0),
                ("Tebet Timur",           -6.2250, 106.8500,  78.0),
                ("Tebet Barat",           -6.2260, 106.8490,   5.0),
                ("Cawang Junction",       -6.2426, 106.8706,  40.0),
                ("Cawang Interchange",    -6.2430, 106.8710,  12.0),
            ]
            bins = [TrashBin(location_name=n, latitude=la, longitude=lo, current_capacity_pct=c) for n, la, lo, c in bin_data]
            db.add_all(bins)
            db.commit()
            logger.info("✅ Initial data seeded successfully.")
        db.close()
    except Exception as exc:
        logger.warning(f"Auto-seed check: {exc}")

    start_agent_runner()
    logger.info("✅  Background agent runner started.")

    yield
    # (graceful shutdown logic can go here in future phases)


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="WasteWay API",
    description=(
        "Agentic AI backend for dynamic garbage truck scheduling.\n\n"
        "**Phase 2**: Dynamic Routing Agent + Crisis Management Agent (LangGraph)."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(trucks.router,        prefix="/api/v1")
app.include_router(trash_bins.router,    prefix="/api/v1")
app.include_router(route_tasks.router,   prefix="/api/v1")
app.include_router(crisis_events.router, prefix="/api/v1")
app.include_router(agents.router,        prefix="/api/v1")
app.include_router(simulation.router,    prefix="/api/v1")


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "version": "0.2.0", "env": settings.APP_ENV}
