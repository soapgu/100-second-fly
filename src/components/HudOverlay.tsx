import { COPY } from '../game/copy'

export interface Toast {
  id: number
  text: string
}

interface Props {
  time: number
  graze: number
  phase: { level: number; name: string }
  toast: Toast | null
  paused: boolean
  muted: boolean
  onTogglePause: () => void
  onToggleMute: () => void
}

export function HudOverlay({
  time,
  graze,
  phase,
  toast,
  paused,
  muted,
  onTogglePause,
  onToggleMute,
}: Props) {
  return (
    <div className="hud">
      <div className="hud-status">
        {COPY.statusElapsed} <strong>{time.toFixed(1)}s</strong> / {COPY.statusTarget}
        <br />
        {COPY.grazeLabel} <strong>{graze}</strong>
      </div>
      <div className="hud-phase">
        {COPY.statusIntensity} Lv.{phase.level}
        <br />
        {phase.name}
      </div>
      <div className="hud-timer">{time.toFixed(1)}</div>
      {toast && (
        <div className="toast" key={toast.id}>
          {toast.text}
        </div>
      )}
      <div className="hud-buttons">
        <button className="icon-btn" onClick={onToggleMute} title="静音 (M)">
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="icon-btn" onClick={onTogglePause} title="暂停 (P)">
          {paused ? '▶' : '⏸'}
        </button>
      </div>
      {paused && (
        <div
          className="overlay"
          style={{ background: 'rgba(5,5,13,0.6)', pointerEvents: 'auto', cursor: 'pointer' }}
          onClick={onTogglePause}
        >
          <p className="paused-text">{COPY.paused}</p>
          <p className="small-note">{COPY.pausedHint}</p>
        </div>
      )}
    </div>
  )
}
