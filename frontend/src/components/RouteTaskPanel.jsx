/**
 * components/RouteTaskPanel.jsx
 * ──────────────────────────────
 * Shows active route tasks with expandable waypoint lists.
 * Each task displays the truck, status badge, and an ordered waypoint list
 * with real-time collection progress (collected waypoints show green checkmarks).
 */
import { useState } from 'react'

const STATUS_COLOUR = {
  pending:   'var(--accent-purple)',
  active:    'var(--accent-blue)',
  completed: 'var(--accent-green)',
  cancelled: 'var(--text-secondary)',
}

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function TaskCard({ task, trucks }) {
  const [expanded, setExpanded] = useState(task.status === 'active')
  const truck = trucks.find(t => t.id === task.truck_id)
  const waypoints = task.waypoints || []
  const collectedCount = waypoints.filter(w => w.collected).length

  return (
    <div className="task-card">
      <div className="task-header-row">
        <span className="task-id">Task #{task.id}</span>
        <span className={`badge badge-${task.status}`}>{task.status}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, fontSize: 12 }}>
        <span>🚛</span>
        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
          {truck ? truck.plate_number : `Truck #${task.truck_id}`}
        </span>
        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {fmtTime(task.assigned_at)}
        </span>
      </div>

      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {waypoints.length} waypoint(s)
          {task.status === 'active' && (
            <span style={{ color: 'var(--accent-green)', marginLeft: 6 }}>
              ({collectedCount}/{waypoints.length} collected)
            </span>
          )}
        </span>
        <button
          onClick={() => setExpanded(e => !e)}
          className="btn btn-ghost"
          style={{ padding: '2px 8px', fontSize: 11 }}
        >
          {expanded ? '▲ Hide' : '▼ Show route'}
        </button>
      </div>

      {expanded && (
        <div className="task-waypoints">
          {waypoints.map((wp, i) => {
            const isCollected = wp.collected === true
            return (
              <div
                key={i}
                className="waypoint-row"
                style={{
                  opacity: isCollected ? 0.6 : 1,
                  background: isCollected ? 'rgba(63, 185, 80, 0.08)' : undefined,
                }}
              >
                <span
                  className="waypoint-num"
                  style={{
                    background: isCollected ? 'var(--accent-green)' : 'var(--accent-blue)',
                    color: '#000',
                  }}
                >
                  {isCollected ? '✓' : i + 1}
                </span>
                <span style={{
                  flex: 1,
                  textDecoration: isCollected ? 'line-through' : 'none',
                }}>
                  {wp.location_name || `Bin #${wp.bin_id}`}
                </span>
                <span style={{
                  color: isCollected ? 'var(--accent-green)' : 'var(--accent-orange)',
                  fontWeight: 600,
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                }}>
                  {isCollected ? 'Emptied' : (wp.capacity_pct != null ? `${wp.capacity_pct.toFixed(0)}%` : '—')}
                </span>
              </div>
            )
          })}
          {waypoints.length === 0 && (
            <div className="empty-state" style={{ padding: '6px' }}>No waypoints.</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function RouteTaskPanel({ tasks = [], trucks = [], loading }) {
  // Show active + pending tasks; show last 3 completed/cancelled too
  const active    = tasks.filter(t => ['active', 'pending'].includes(t.status))
  const finished  = tasks.filter(t => ['completed', 'cancelled'].includes(t.status)).slice(0, 3)
  const display   = [...active, ...finished]

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📋 Route Tasks</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {active.length} active
        </span>
      </div>

      <div className="card-body" style={{ padding: '12px' }}>
        {loading && display.length === 0 ? (
          <div className="loading">Loading tasks…</div>
        ) : display.length === 0 ? (
          <div className="empty-state">No route tasks yet. Trigger the Routing Agent below.</div>
        ) : (
          <div className="task-list">
            {display.map(task => (
              <TaskCard key={task.id} task={task} trucks={trucks} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
