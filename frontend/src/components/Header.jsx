/**
 * components/Header.jsx
 * ──────────────────────
 * Sticky top navigation bar showing brand, live clock, connection status,
 * and the Auto / Manual Bins Fill Mode switcher.
 */
import { useState, useEffect } from 'react'

export default function Header({ lastUpdated, mode = 'auto', onModeChange, modeLoading }) {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const fmtTime = t =>
    t.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="header-logo">🗑️</span>
        <div>
          <div className="header-title">WasteWay</div>
          <div className="header-subtitle">Agentic AI Garbage Truck Scheduling</div>
        </div>
      </div>

      <div className="header-center">
        <div className="mode-pill-container">
          <span className="mode-label">Bins Fill Mode:</span>
          <div className="mode-toggle-group">
            <button
              className={`mode-btn ${mode === 'auto' ? 'mode-active-auto' : ''}`}
              onClick={() => onModeChange?.('auto')}
              disabled={modeLoading}
              title="Simulator automatically fills random bins every tick"
            >
              ⚡ Automatic
            </button>
            <button
              className={`mode-btn ${mode === 'manual' ? 'mode-active-manual' : ''}`}
              onClick={() => onModeChange?.('manual')}
              disabled={modeLoading}
              title="Manual mode: Auto-fill paused, set bin capacity via dashboard"
            >
              ✍️ Manual
            </button>
          </div>
        </div>
      </div>

      <div className="header-meta">
        {lastUpdated && (
          <span>
            Last sync:{' '}
            <span style={{ color: 'var(--text-primary)' }}>
              {new Date(lastUpdated).toLocaleTimeString('id-ID')}
            </span>
          </span>
        )}
        <span>
          <span className="pulse-dot" />
          Live · {fmtTime(time)}
        </span>
      </div>
    </header>
  )
}
