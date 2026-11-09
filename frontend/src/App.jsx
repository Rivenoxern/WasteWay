/**
 * App.jsx  –  WasteWay Admin Dashboard Root
 * ───────────────────────────────────────────
 * Single source of truth for all polled data.
 * Passes data down to stateless display components.
 *
 * Data flow:
 *   usePolling(api)  →  state  →  props  →  components
 *
 * Polling intervals:
 *   Bins, Trucks, Tasks, Crises, SimMode : every 5 s
 */
import { useState, useCallback } from 'react'

import { binsApi, trucksApi, tasksApi, crisesApi, simulationApi } from './api/client.js'
import { usePolling } from './hooks/usePolling.js'

import Header        from './components/Header.jsx'
import StatusBar     from './components/StatusBar.jsx'
import CityMap       from './components/CityMap.jsx'
import BinTable      from './components/BinTable.jsx'
import TruckPanel    from './components/TruckPanel.jsx'
import RouteTaskPanel from './components/RouteTaskPanel.jsx'
import CrisisPanel   from './components/CrisisPanel.jsx'
import AgentControls from './components/AgentControls.jsx'

const POLL_MS = 5000  // 5-second refresh interval

export default function App() {
  // ── Data sources ───────────────────────────────────────────────────
  const {
    data: bins,
    loading: binsLoading,
    refetch: refetchBins,
  } = usePolling(() => binsApi.list(), POLL_MS)

  const {
    data: trucks,
    loading: trucksLoading,
    refetch: refetchTrucks,
  } = usePolling(() => trucksApi.list(), POLL_MS)

  const {
    data: tasks,
    loading: tasksLoading,
    refetch: refetchTasks,
  } = usePolling(
    () => tasksApi.list({ limit: 20 }),
    POLL_MS,
  )

  const {
    data: crises,
    loading: crisesLoading,
    refetch: refetchCrises,
  } = usePolling(() => crisesApi.list({ limit: 30 }), POLL_MS)

  const {
    data: modeData,
    loading: modeLoading,
    refetch: refetchMode,
  } = usePolling(() => simulationApi.getMode(), 10000)

  const [modeBusy, setModeBusy] = useState(false)
  const currentMode = modeData?.mode || 'auto'

  // ── Mode Switcher ───────────────────────────────────────────────────
  const handleModeChange = useCallback(async (newMode) => {
    if (newMode === currentMode) return
    setModeBusy(true)
    try {
      await simulationApi.setMode(newMode)
      await refetchMode()
    } catch (err) {
      console.error('Failed to change mode:', err)
    } finally {
      setModeBusy(false)
    }
  }, [currentMode, refetchMode])

  // ── Bin Capacity Updates ───────────────────────────────────────────
  const handleUpdateBin = useCallback(async (binId, pct) => {
    await binsApi.update(binId, { current_capacity_pct: pct })
    await refetchBins()
  }, [refetchBins])

  const handleBulkUpdate = useCallback(async (pct) => {
    await binsApi.bulkCapacity(pct)
    await refetchBins()
  }, [refetchBins])

  // ── Global refresh (called after agent triggers) ────────────────────
  const refreshAll = useCallback(() => {
    refetchBins()
    refetchTrucks()
    refetchTasks()
    refetchCrises()
    refetchMode()
  }, [refetchBins, refetchTrucks, refetchTasks, refetchCrises, refetchMode])

  // ── Derived: last sync time (from trucks as proxy) ──────────────────
  const lastUpdated = trucks?.[0]
    ? new Date().toISOString()
    : null

  // ── Active tasks only (for the map route lines) ─────────────────────
  const activeTasks = (tasks || []).filter(t => t.status === 'active')

  return (
    <div className="app-wrapper">
      <Header
        lastUpdated={lastUpdated}
        mode={currentMode}
        onModeChange={handleModeChange}
        modeLoading={modeBusy || modeLoading}
      />

      <main className="dashboard-body">

        {/* ── Row 1: Status Bar (full width) ─────────────────────── */}
        <StatusBar
          bins={bins || []}
          trucks={trucks || []}
          tasks={tasks || []}
          crises={crises || []}
        />

        {/* ── Left column ────────────────────────────────────────── */}
        <div className="col-left">
          <CityMap
            bins={bins || []}
            trucks={trucks || []}
            tasks={activeTasks}
          />
          <BinTable
            bins={bins || []}
            loading={binsLoading}
            mode={currentMode}
            onUpdateBin={handleUpdateBin}
            onBulkUpdate={handleBulkUpdate}
          />
        </div>

        {/* ── Right column ───────────────────────────────────────── */}
        <div className="col-right">
          <TruckPanel
            trucks={trucks || []}
            loading={trucksLoading}
          />
          <RouteTaskPanel
            tasks={tasks || []}
            trucks={trucks || []}
            loading={tasksLoading}
          />
          <CrisisPanel
            crises={crises || []}
            trucks={trucks || []}
            loading={crisesLoading}
          />
          <AgentControls
            trucks={trucks || []}
            onRefresh={refreshAll}
          />
        </div>

      </main>
    </div>
  )
}
