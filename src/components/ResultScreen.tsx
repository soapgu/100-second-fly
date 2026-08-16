import { COPY, verdictFor } from '../game/copy'
import type { GameResult } from '../game/Game'
import type { Records } from '../game/storage'

interface Props {
  result: GameResult
  records: Records
  isNewBest: boolean
  onRestart: () => void
  onMenu: () => void
}

export function ResultScreen({ result, records, isNewBest, onRestart, onMenu }: Props) {
  return (
    <div className="overlay">
      <p className={`result-title${result.win ? ' win' : ''}`}>
        {result.win ? COPY.winTitle : COPY.deadTitle}
      </p>
      <p className="verdict">{verdictFor(result.time)}</p>
      <div className="stats">
        <span className="stat-label">{COPY.survivedLabel}</span>
        <span className="stat-value highlight">{result.time.toFixed(1)}s</span>
        <span className="stat-label">{COPY.grazeLabel}</span>
        <span className="stat-value">{result.graze}</span>
        <span className="stat-label">{COPY.bestLabel}</span>
        <span className="stat-value">
          {records.best.toFixed(1)}s{isNewBest ? ' 🏆 新纪录！' : ''}
        </span>
        <span className="stat-label">{COPY.winsLabel}</span>
        <span className="stat-value">{records.wins}</span>
      </div>
      <div className="button-row">
        <button className="btn" onClick={onRestart} autoFocus>
          {COPY.again} (R)
        </button>
        <button className="btn ghost" onClick={onMenu}>
          {COPY.backToMenu}
        </button>
      </div>
    </div>
  )
}
