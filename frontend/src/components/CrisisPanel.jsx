/**
 * components/CrisisPanel.jsx
 * ───────────────────────────
 * Real-time feed of crisis events.
 * Unresolved crises get a red left-border + alert styling.
 * Shows the 8 most recent events (resolved + unresolved).
 */

function fmtTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    day: '2-digit', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

const ISSUE_ICON = {
  breakdown: '🔧',
  accident:  '🚨',
  flat_tire: '🫧',
}

export default function CrisisPanel({ crises = [], trucks = [], loading }) {
  const sorted = [...crises].sort((a, b) => new Date(b.reported_at) - new Date(a.reported_at))
  const recent = sorted.slice(0, 8)
  const openCount = crises.filter(c => !c.resolved).length

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          🚨 Crisis Events
          {openCount > 0 && (
            <span style={{
              background: 'var(--accent-red)',
              color: '#fff',
              borderRadius: 10,
              padding: '1px 7px',
              fontSize: 10,
              marginLeft: 6,
              fontWeight: 700,
            }}>
              {openCount} open
            </span>
          )}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          Last {recent.length} events
        </span>
      </div>

      <div className="card-body" style={{ padding: '12px' }}>
        {loading && recent.length === 0 ? (
          <div className="loading">Loading crises…</div>
        ) : recent.length === 0 ? (
          <div className="empty-state">✅ No crisis events recorded.</div>
        ) : (
          <div className="crisis-list">
            {recent.map(crisis => {
              const truck = trucks.find(t => t.id === crisis.truck_id)
              const icon  = ISSUE_ICON[crisis.issue_type] || '⚠️'
              return (
                <div
                  key={crisis.id}
                  className={`crisis-item ${crisis.resolved ? 'resolved' : 'unresolved'}`}
                >
                  <div className="crisis-header-row">
                    <span className="crisis-truck">
                      {icon} {truck ? truck.plate_number : `Truck #${crisis.truck_id}`}
                    </span>
                    <span className={`badge ${crisis.resolved ? 'badge-resolved' : 'badge-crisis'}`}>
                      {crisis.resolved ? '✅ Resolved' : '🔴 Open'}
                    </span>
                  </div>
                  <div className="crisis-meta">
                    <span style={{ textTransform: 'capitalize' }}>{crisis.issue_type.replace('_', ' ')}</span>
                    {' · '}
                    <span>#{crisis.id}</span>
                    {' · '}
                    <span>{fmtTime(crisis.reported_at)}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
