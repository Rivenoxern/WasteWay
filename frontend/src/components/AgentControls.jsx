/**
 * components/AgentControls.jsx
 * ─────────────────────────────
 * Admin control panel for manually triggering the AI agents.
 *
 * Actions:
 *  1. "Run Routing Agent" → POST /api/v1/agents/routing/run
 *  2. "Report Breakdown"  → POST /api/v1/crises/ (creates event)
 *                           then optionally POST /api/v1/agents/crisis/run/{id}
 *  3. Shows last agent run result from Redis cache
 */
import { useState, useCallback } from 'react'
import { agentsApi, crisesApi } from '../api/client.js'

export default function AgentControls({ trucks = [], onRefresh }) {
  // ── Routing Agent ──────────────────────────────────────────────────
  const [routingBusy,   setRoutingBusy]   = useState(false)
  const [routingResult, setRoutingResult] = useState(null)

  const runRouting = async () => {
    setRoutingBusy(true)
    setRoutingResult(null)
    try {
      const result = await agentsApi.runRouting()
      setRoutingResult({ ok: true, data: result })
      onRefresh?.()
    } catch (err) {
      setRoutingResult({ ok: false, data: err?.response?.data || err.message })
    } finally {
      setRoutingBusy(false)
    }
  }

  // ── Crisis Agent ───────────────────────────────────────────────────
  const [selectedTruck, setSelectedTruck] = useState('')
  const [issueType,     setIssueType]     = useState('breakdown')
  const [crisisBusy,    setCrisisBusy]    = useState(false)
  const [crisisResult,  setCrisisResult]  = useState(null)

  const reportAndDispatch = async () => {
    if (!selectedTruck) return
    setCrisisBusy(true)
    setCrisisResult(null)
    try {
      // Step 1: report the crisis
      const event = await crisesApi.report({
        truck_id: Number(selectedTruck),
        issue_type: issueType,
      })
      // Step 2: immediately dispatch the Crisis Agent for this event
      const result = await agentsApi.runCrisis(event.id)
      setCrisisResult({ ok: true, data: result })
      onRefresh?.()
    } catch (err) {
      setCrisisResult({ ok: false, data: err?.response?.data || err.message })
    } finally {
      setCrisisBusy(false)
    }
  }

  // ── Agent Status ───────────────────────────────────────────────────
  const [statusBusy,   setStatusBusy]   = useState(false)
  const [statusResult, setStatusResult] = useState(null)

  const fetchStatus = async () => {
    setStatusBusy(true)
    try {
      const r = await agentsApi.status()
      setStatusResult(r)
    } catch (err) {
      setStatusResult({ error: err.message })
    } finally {
      setStatusBusy(false)
    }
  }

  const activeTrucks = trucks.filter(t =>
    t.status === 'idle' || t.status === 'en_route'
  )

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🤖 Agent Controls</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Manual triggers & status
        </span>
      </div>

      <div className="card-body agent-controls">

        {/* ── Routing Agent ──────────────────────────────────── */}
        <div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
            Dynamic Routing Agent
          </div>
          <div className="agent-btn-group">
            <button
              className="btn btn-primary"
              onClick={runRouting}
              disabled={routingBusy}
            >
              {routingBusy ? '⏳ Running…' : '▶ Run Routing Agent'}
            </button>
          </div>
          {routingResult && (
            <div className={`agent-result ${routingResult.ok ? 'success' : 'error'}`}
              style={{ marginTop: 8 }}
            >
              {routingResult.ok
                ? `✅ ${routingResult.data.message || 'Done.'}\nTask IDs: [${(routingResult.data.route_task_ids || []).join(', ')}]`
                : `❌ ${JSON.stringify(routingResult.data, null, 2)}`
              }
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
          {/* ── Crisis Agent ──────────────────────────────────── */}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>
            Crisis Management Agent
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            <select
              value={selectedTruck}
              onChange={e => setSelectedTruck(e.target.value)}
              style={{ flex: 1, minWidth: 140 }}
            >
              <option value="">— Select truck —</option>
              {trucks.map(t => (
                <option key={t.id} value={t.id}>
                  {t.plate_number} ({t.status})
                </option>
              ))}
            </select>
            <select
              value={issueType}
              onChange={e => setIssueType(e.target.value)}
              style={{ width: 130 }}
            >
              <option value="breakdown">🔧 Breakdown</option>
              <option value="accident">🚨 Accident</option>
              <option value="flat_tire">🫧 Flat Tire</option>
            </select>
          </div>
          <div className="agent-btn-group">
            <button
              className="btn btn-danger"
              onClick={reportAndDispatch}
              disabled={crisisBusy || !selectedTruck}
            >
              {crisisBusy ? '⏳ Dispatching…' : '🚨 Report & Dispatch Crisis Agent'}
            </button>
          </div>
          {crisisResult && (
            <div className={`agent-result ${crisisResult.ok ? 'success' : 'error'}`}
              style={{ marginTop: 8 }}
            >
              {crisisResult.ok
                ? `✅ ${crisisResult.data.message || 'Crisis handled.'}`
                : `❌ ${JSON.stringify(crisisResult.data, null, 2)}`
              }
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
          {/* ── Agent Status ─────────────────────────────────── */}
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
            Agent Status (Redis Cache)
          </div>
          <button
            className="btn btn-ghost"
            onClick={fetchStatus}
            disabled={statusBusy}
          >
            {statusBusy ? '⏳ Fetching…' : '📡 Fetch Last Run Status'}
          </button>
          {statusResult && (
            <div className="agent-result" style={{ marginTop: 8 }}>
              {JSON.stringify(statusResult, null, 2)}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
