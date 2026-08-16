import { COPY } from '../game/copy'
import type { Records } from '../game/storage'

interface Props {
  records: Records
  onStart: () => void
}

export function StartScreen({ records, onStart }: Props) {
  return (
    <div className="overlay">
      <h1 className="title">{COPY.title}</h1>
      <p className="subtitle">{COPY.subtitle}</p>
      <div className="instructions">
        {COPY.instructions.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <p className="small-note">
        {COPY.controls}
        <br />
        {COPY.hotkeys}
      </p>
      {records.plays > 0 && (
        <p className="records-line">
          {COPY.bestLabel} {records.best.toFixed(1)}s · {COPY.winsLabel} {records.wins} · 已挑战{' '}
          {records.plays} 局
        </p>
      )}
      <button className="btn" onClick={onStart} autoFocus>
        {COPY.start}
      </button>
    </div>
  )
}
