# WasteWay 
**Agentic AI for Garbage Truck Scheduling in Modern Cities**

A Multi-Agent System (MAS) prototype that dynamically schedules municipal garbage trucks based on real-time trash bin fill levels and autonomously handles field crises (e.g., truck breakdowns) using **LangGraph**, **FastAPI**, **PostgreSQL**, **Redis**, and a **React (Vite)** operations dashboard.

---

##  Architecture & Core Features

1. **Dynamic Routing Agent (LangGraph)**:
   - Continuously monitors trash bins across the city grid.
   - When a bin exceeds **75% capacity**, the agent fetches available (`idle`) trucks, calculates optimal routes via a **Greedy Nearest-Neighbour heuristic**, and generates active `RouteTask` records.
2. **Crisis Management Agent (LangGraph)**:
   - Handles field disruptions (e.g. truck breakdowns / fatal constraints).
   - Marks the broken truck `out_of_service`, cancels its pending tasks, identifies the closest active/idle truck using 2D Euclidean distance, and seamlessly reassigns the unfinished waypoints.
3. **Real-Time Admin Dashboard (React + Vite)**:
   - Pure SVG 2D city grid map displaying live bin levels, truck locations, and active route paths (zero paid mapping APIs required).
   - Live KPI status counters, overflowing alerts, fleet tracker, crisis feed, and manual AI agent trigger controls.
4. **Mock Simulator**:
   - Background Python engine that progressively increases trash bin capacities and simulates random truck breakdowns for realistic demonstration.

---

##  Project Structure

```
Wasteway/
├── README.md
├── backend/
│   ├── main.py                     # FastAPI application entrypoint & lifespan
│   ├── requirements.txt            # Python dependencies (FastAPI, LangGraph, etc.)
│   ├── .env.example                # Environment variables template
│   └── app/
│       ├── core/
│       │   ├── config.py           # Pydantic Settings (.env loader)
│       │   └── database.py         # SQLAlchemy engine, session & declarative base
│       ├── models/                 # PostgreSQL Relational Schemas
│       │   ├── admin.py            # Admin accounts
│       │   ├── driver.py           # Driver profiles
│       │   ├── truck.py            # Truck fleet & status (idle, en_route, out_of_service)
│       │   ├── trash_bin.py        # Bin GPS coordinates & capacity tracker
│       │   ├── route_task.py       # Task assignments & JSON waypoints
│       │   └── crisis_event.py     # Breakdown & crisis logs
│       ├── routers/                # REST API Endpoints
│       │   ├── trucks.py           # /api/v1/trucks
│       │   ├── trash_bins.py       # /api/v1/bins
│       │   ├── route_tasks.py      # /api/v1/tasks
│       │   ├── crisis_events.py    # /api/v1/crises
│       │   └── agents.py           # /api/v1/agents (manual triggers & status)
│       └── agents/                 # LangGraph Multi-Agent Workflows
│           ├── state.py            # TypedDict state definitions
│           ├── tools.py            # DB helpers & nearest-neighbour math
│           ├── routing_agent.py    # Dynamic Routing StateGraph
│           ├── crisis_agent.py     # Crisis Management StateGraph
│           └── runner.py           # Background daemon runner & Redis caching
├── simulator/
│   ├── seed.py                     # Database seeder (Jakarta grid mock coordinates)
│   └── simulate.py                 # Live tick loop simulator
└── frontend/                       # React 18 Admin Dashboard (Vite)
    ├── package.json
    ├── vite.config.js              # Dev proxy to FastAPI backend
    ├── index.html
    └── src/
        ├── App.jsx                 # Dashboard root & data polling
        ├── App.css                 # Dark "Operations Centre" stylesheet
        ├── main.jsx
        ├── api/client.js           # Axios REST client
        ├── hooks/usePolling.js     # Real-time state polling hook
        └── components/
            ├── Header.jsx          # Live header & system clock
            ├── StatusBar.jsx       # Real-time KPI summary bar
            ├── CityMap.jsx         # Custom 2D SVG city grid & route visualizer
            ├── BinTable.jsx        # Bin capacity list with alert highlights
            ├── TruckPanel.jsx      # Truck fleet status cards
            ├── RouteTaskPanel.jsx  # Active route tasks & expandable waypoints
            ├── CrisisPanel.jsx     # Incident & crisis event feed
            └── AgentControls.jsx   # Manual agent triggers & Redis cache inspector
```

---

##  Quick Start Guide

### Prerequisites
- **Python 3.11+**
- **Node.js 18+** & npm
- **PostgreSQL 15+** running on `localhost:5432` with a database named `wasteway_db`
- **Redis** running on `localhost:6379` (e.g. via Windows service or Docker)

---

### Step 1: Backend Setup

1. Open a terminal in the `backend` directory:
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Configure environment:
   ```powershell
   copy .env.example .env
   ```
   Open `.env` and set your PostgreSQL password:
   ```env
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/wasteway_db
   REDIS_URL=redis://localhost:6379/0
   APP_ENV=development
   ```

3. Seed the initial database (run once from project root):
   ```powershell
   python simulator/seed.py
   ```

---

### Step 2: Frontend Setup

Open a terminal in the `frontend` directory:
```powershell
cd frontend
npm install
```

---

##  Running the System

To see the full end-to-end system in action, start these **3 processes** in separate terminal windows:

### Terminal 1 — FastAPI Backend & AI Agents
```powershell
cd backend
.\venv\Scripts\activate
uvicorn main:app --reload --port 8000
```
> Interactive API Documentation: **http://localhost:8000/docs**  
> *(Note: The Routing Agent and Crisis Agent loops start automatically as background threads)*

### Terminal 2 — React Admin Dashboard
```powershell
cd frontend
npm run dev
```
> Open in your browser: **http://localhost:3000**

### Terminal 3 — Mock Simulation Loop
```powershell
.\backend\venv\Scripts\activate
python simulator/simulate.py --interval 5 --breakdown-prob 0.05
```
> Watch trash bins fill up randomly every 5 seconds and trigger the AI agents in real time!

---

## 📡 REST API Reference

| Group | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **System** | `GET` | `/health` | API health check & version info |
| **Trucks** | `GET` | `/api/v1/trucks/` | List all trucks |
| | `POST` | `/api/v1/trucks/` | Register a new truck |
| | `GET/PATCH/DELETE`| `/api/v1/trucks/{id}` | Retrieve, update status/location, or delete |
| **Trash Bins** | `GET` | `/api/v1/bins/` | List all trash bins |
| | `GET` | `/api/v1/bins/overflowing` | Filter bins with capacity ≥ threshold (default: 75%) |
| | `POST` | `/api/v1/bins/` | Register a new trash bin |
| | `GET/PATCH/DELETE`| `/api/v1/bins/{id}` | Retrieve, update capacity/coords, or delete |
| **Route Tasks**| `GET` | `/api/v1/tasks/` | List route tasks (filterable by status/truck) |
| | `GET` | `/api/v1/tasks/{id}` | Task details and ordered waypoint sequence |
| | `PATCH` | `/api/v1/tasks/{id}/status`| Update status (e.g. `completed` auto-resets truck to `idle`) |
| **Crises** | `GET` | `/api/v1/crises/` | List crisis events (filterable by resolved) |
| | `GET` | `/api/v1/crises/unresolved`| List open crises requiring agent intervention |
| | `POST` | `/api/v1/crises/` | Manually report a truck incident |
| | `PATCH` | `/api/v1/crises/{id}/resolve`| Mark a crisis as resolved |
| **AI Agents** | `POST` | `/api/v1/agents/routing/run`| Manually trigger 1 full pass of Dynamic Routing Agent |
| | `POST` | `/api/v1/agents/crisis/run/{id}` | Manually trigger Crisis Agent for a specific incident |
| | `GET` | `/api/v1/agents/status` | Read latest agent run state cached in Redis |

---

##  Project Completion Status

- [x] **Phase 1** – Database models (PostgreSQL/SQLAlchemy), CRUD endpoints, mock seeder & simulator
- [x] **Phase 2** – Multi-Agent System (LangGraph StateGraphs for Dynamic Routing & Crisis Management, background runner, Redis caching)
- [x] **Phase 3** – React Admin Dashboard (Vite, pure SVG 2D city map, live polling, fleet/task/crisis panels, agent trigger controls)
