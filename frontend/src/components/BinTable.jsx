/**
 * components/BinTable.jsx
 * ────────────────────────
 * Scrollable table of all trash bins sorted by capacity (highest first).
 * Each row shows a colour-coded progress bar and an alert badge when ≥ 75%.
 */

function capColour(pct) {
  if (pct >= 90) return 'var(--cap-critical)'
  if (pct >= 75) return 'var(--cap-high)'
  if (pct >= 50) return 'var(--cap-med)'
  return 'var(--cap-low)'
}

function rowClass(pct) {
  if (pct >= 90) return 'row-critical'
  if (pct >= 75) return 'row-high'
  return ''
}

function fmtTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function BinTable({ bins = [], loading }) {
  const sorted = [...bins].sort((a, b) => b.current_capacity_pct - a.current_capacity_pct)

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">🗑️ Trash Bin Status</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {bins.length} bins · auto-refresh 5s
        </span>
      </div>

      <div className="bin-table-wrap">
        {loading && sorted.length === 0 ? (
          <div className="loading" style={{ padding: '16px' }}>Loading bins…</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Last Updated</th>
                <th>Alert</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(bin => {
                const pct   = bin.current_capacity_pct
                const col   = capColour(pct)
                const rClass = rowClass(pct)
                return (
                  <tr key={bin.id} className={rClass}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      #{bin.id}
                    </td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {bin.location_name}
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <div className="cap-bar-wrap">
                        <div className="cap-bar-bg">
                          <div
                            className="cap-bar-fill"
                            style={{ width: `${pct}%`, background: col }}
                          />
                        </div>
                        <span className="cap-value" style={{ color: col }}>
                          {pct.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                      {fmtTime(bin.last_updated)}
                    </td>
                    <td>
                      {pct >= 90 && <span className="badge badge-crisis">🔴 Critical</span>}
                      {pct >= 75 && pct < 90 && <span className="badge badge-en_route">🟠 Alert</span>}
                      {pct < 75 && <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                    </td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={5} className="empty-state">No bins found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
