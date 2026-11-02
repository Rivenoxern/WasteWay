/**
 * components/TruckPanel.jsx
 * ──────────────────────────
 * Cards showing each truck's status, driver, plate, and GPS location.
 * Status badge is colour-coded: green = idle, blue = en_route, red = OOS.
 */

const STATUS_ICON = {
  idle:           '🟢',
  en_route:       '🔵',
  out_of_service: '🔴',
}

function StatusBadge({ status }) {
  return (
    <span className={`badge badge-${status}`}>
      {STATUS_ICON[status] || '⚪'} {status.replace('_', ' ')}
    </span>
  )
}

export default function TruckPanel({ trucks = [], loading }) {
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🚛 Fleet Status</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {trucks.length} truck(s)
        </span>
      </div>

      <div className="card-body">
        {loading && trucks.length === 0 ? (
          <div className="loading">Loading trucks…</div>
        ) : trucks.length === 0 ? (
          <div className="empty-state">No trucks registered.</div>
        ) : (
          <div className="truck-list">
            {trucks.map(truck => (
              <div key={truck.id} className="truck-card">
                <span className="truck-icon">🚛</span>
                <div className="truck-info">
                  <div className="truck-plate">{truck.plate_number}</div>
                  <div className="truck-detail">
                    {truck.current_gps_location
                      ? `📍 ${truck.current_gps_location}`
                      : '📍 Location unknown'}
                  </div>
                </div>
                <StatusBadge status={truck.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
