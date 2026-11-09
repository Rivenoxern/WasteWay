/**
 * components/BinTable.jsx
 * ────────────────────────
 * Scrollable table of all trash bins sorted by capacity (highest first).
 * Features:
 *   • Auto-refresh with colour-coded progress bar and alert badge
 *   • Manual capacity adjustment per bin (direct % input & quick presets)
 *   • Bulk actions (Fill All to 100%, 80%, or Empty to 0%)
 *   • Mode awareness (shows notice when Manual Fill mode is active)
 */
import { useState } from 'react'

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

export default function BinTable({
  bins = [],
  loading,
  mode = 'auto',
  onUpdateBin,
  onBulkUpdate,
}) {
  const [editingBinId, setEditingBinId] = useState(null)
  const [customPct, setCustomPct] = useState('')
  const [updating, setUpdating] = useState(false)

  const sorted = [...bins].sort((a, b) => b.current_capacity_pct - a.current_capacity_pct)

  const handleSetCapacity = async (binId, pct) => {
    setUpdating(true)
    try {
      await onUpdateBin?.(binId, pct)
      setEditingBinId(null)
      setCustomPct('')
    } finally {
      setUpdating(false)
    }
  }

  const handleBulkSet = async (pct) => {
    setUpdating(true)
    try {
      await onBulkUpdate?.(pct)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="card-title">🗑️ Trash Bin Status</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {bins.length} bins · auto-refresh 5s
          </span>
        </div>

        {/* Bulk fill action buttons */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Bulk:</span>
          <button
            className="btn btn-ghost"
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => handleBulkSet(100.0)}
            disabled={updating}
            title="Set all bins to 100% capacity"
          >
            🔴 All 100%
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => handleBulkSet(80.0)}
            disabled={updating}
            title="Set all bins to 80% (trigger routing agent threshold)"
          >
            🟠 All 80%
          </button>
          <button
            className="btn btn-ghost"
            style={{ padding: '2px 8px', fontSize: 11 }}
            onClick={() => handleBulkSet(0.0)}
            disabled={updating}
            title="Reset all bins to 0%"
          >
            🟢 Empty All
          </button>
        </div>
      </div>

      {mode === 'manual' && (
        <div style={{
          background: 'rgba(188, 140, 255, 0.08)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '6px 16px',
          fontSize: 11,
          color: 'var(--accent-purple)',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}>
          <span>✍️</span>
          <span><strong>Manual Mode Active:</strong> Automatic bin filling is paused. Set each bin's fill percentage manually below or use the bulk buttons.</span>
        </div>
      )}

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
                <th>Manual Adjust</th>
                <th>Alert</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(bin => {
                const pct = bin.current_capacity_pct
                const col = capColour(pct)
                const rClass = rowClass(pct)
                const isEditing = editingBinId === bin.id

                return (
                  <tr key={bin.id} className={rClass}>
                    <td style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                      #{bin.id}
                    </td>
                    <td style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={bin.location_name}>
                      {bin.location_name}
                    </td>
                    <td style={{ minWidth: 150 }}>
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
                    <td style={{ minWidth: 190 }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0-100"
                            value={customPct}
                            onChange={e => setCustomPct(e.target.value)}
                            style={{ width: 60, padding: '2px 6px', fontSize: 12 }}
                            autoFocus
                          />
                          <button
                            className="btn btn-primary"
                            style={{ padding: '2px 8px', fontSize: 11 }}
                            onClick={() => {
                              const num = parseFloat(customPct)
                              if (!isNaN(num)) {
                                handleSetCapacity(bin.id, Math.max(0, Math.min(100, num)))
                              }
                            }}
                            disabled={updating}
                          >
                            ✓
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '2px 6px', fontSize: 11 }}
                            onClick={() => setEditingBinId(null)}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '1px 5px', fontSize: 10 }}
                            onClick={() => handleSetCapacity(bin.id, 0)}
                            disabled={updating}
                            title="Empty bin (0%)"
                          >
                            0%
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '1px 5px', fontSize: 10 }}
                            onClick={() => handleSetCapacity(bin.id, 50)}
                            disabled={updating}
                            title="Set to 50%"
                          >
                            50%
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '1px 5px', fontSize: 10 }}
                            onClick={() => handleSetCapacity(bin.id, 85)}
                            disabled={updating}
                            title="Set to 85% (trigger agent)"
                          >
                            85%
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '1px 5px', fontSize: 10 }}
                            onClick={() => handleSetCapacity(bin.id, 100)}
                            disabled={updating}
                            title="Fill bin (100%)"
                          >
                            100%
                          </button>
                          <button
                            className="btn btn-ghost"
                            style={{ padding: '1px 5px', fontSize: 10, color: 'var(--accent-blue)' }}
                            onClick={() => {
                              setEditingBinId(bin.id)
                              setCustomPct(Math.round(pct).toString())
                            }}
                            disabled={updating}
                            title="Custom percentage"
                          >
                            ✏️
                          </button>
                        </div>
                      )}
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
