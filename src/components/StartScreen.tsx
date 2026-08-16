import { COPY } from '../game/copy'
import type { Records } from '../game/storage'

interface Props {
  records: Records
  onStart: () => void
}

export function StartScreen({ records, onStart }: Props) {
  return (
    <div className="overlay start-screen">
      {/* CRT 扫描线 + 暗角，盖住整块"屏幕"（含文字），低透明度保证可读 */}
      <div className="scanlines" aria-hidden="true" />
      <div className="start-content">
        <p className="title-en" aria-hidden="true">
          {COPY.titleEn}
        </p>
        <h1 className="title glitch-title" data-text={COPY.title}>
          {COPY.title}
        </h1>
        <p className="subtitle terminal">{COPY.subtitle}</p>

        {/* 海报包装成街机 CRT 屏幕卡片；加载失败时整个卡片隐藏降级 */}
        <div className="crt-frame poster-card">
          <div className="crt-screen">
            <img
              className="poster-hero"
              src="./og-card.webp"
              alt={COPY.title}
              draggable={false}
              onError={(e) => {
                const card = e.currentTarget.closest<HTMLElement>('.poster-card')
                if (card) card.style.display = 'none'
              }}
            />
          </div>
          <p className="crt-label" aria-hidden="true">
            {COPY.insertCoin}
          </p>
        </div>

        <div className="instructions term-list">
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
          <div className="score-panel">
            <div className="score-cell">
              <span>{COPY.bestLabel}</span>
              <b>{records.best.toFixed(1)}s</b>
            </div>
            <div className="score-cell">
              <span>{COPY.winsLabel}</span>
              <b>{records.wins}</b>
            </div>
            <div className="score-cell">
              <span>已挑战</span>
              <b>{records.plays}局</b>
            </div>
          </div>
        )}
        <button className="btn" onClick={onStart} autoFocus>
          ▶ {COPY.start}
        </button>
      </div>
    </div>
  )
}
