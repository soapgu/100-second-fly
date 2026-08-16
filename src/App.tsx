import { useCallback, useEffect, useRef, useState } from 'react'
import { GameCanvas } from './components/GameCanvas'
import { StartScreen } from './components/StartScreen'
import { HudOverlay, type Toast } from './components/HudOverlay'
import { ResultScreen } from './components/ResultScreen'
import type { GameResult } from './game/Game'
import { loadRecords, saveRecords, mergeResult, type Records } from './game/storage'
import { sfx } from './game/audio'

type Screen = 'menu' | 'playing' | 'result'

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [runId, setRunId] = useState(0)
  const [records, setRecords] = useState<Records>(() => loadRecords())
  const [result, setResult] = useState<GameResult | null>(null)
  const [isNewBest, setIsNewBest] = useState(false)

  const [displayTime, setDisplayTime] = useState(0)
  const [graze, setGraze] = useState(0)
  const [phase, setPhase] = useState({ level: 1, name: '' })
  const [toast, setToast] = useState<Toast | null>(null)
  const [paused, setPaused] = useState(false)
  const [muted, setMuted] = useState(sfx.isMuted)

  const toastIdRef = useRef(0)
  const tickThrottleRef = useRef(0)
  const screenRef = useRef(screen)
  screenRef.current = screen
  const recordsRef = useRef(records)
  recordsRef.current = records

  const startRun = useCallback(() => {
    sfx.unlock()
    setDisplayTime(0)
    setGraze(0)
    setToast(null)
    setPaused(false)
    setResult(null)
    setRunId((id) => id + 1)
    setScreen('playing')
  }, [])

  const handleEnd = useCallback((r: GameResult) => {
    const prev = recordsRef.current
    const next = mergeResult(prev, r)
    saveRecords(next)
    setRecords(next)
    setIsNewBest(prev.best > 0 && r.time > prev.best)
    setResult(r)
    setScreen('result')
  }, [])

  // onTick 节流：最多每 100ms 触发一次 React 更新
  const handleTick = useCallback((t: number, g: number) => {
    const now = performance.now()
    if (now - tickThrottleRef.current < 100) return
    tickThrottleRef.current = now
    setDisplayTime(t)
    setGraze(g)
  }, [])

  const handleAnnounce = useCallback((text: string) => {
    setToast({ id: ++toastIdRef.current, text })
  }, [])

  const handlePhase = useCallback((p: { level: number; name: string }) => {
    setPhase(p)
  }, [])

  const togglePause = useCallback(() => {
    setPaused((p) => {
      if (screenRef.current !== 'playing') return p
      return !p
    })
  }, [])

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      sfx.setMuted(!m)
      return !m
    })
  }, [])

  // 全局快捷键 + 失焦自动暂停
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'p' && screenRef.current === 'playing') togglePause()
      else if (k === 'm') toggleMute()
      else if (k === 'r' && screenRef.current === 'result') startRun()
      else if ((k === 'enter' || k === ' ') && screenRef.current !== 'playing') {
        e.preventDefault()
        startRun()
      }
    }
    const onBlurOrHidden = () => {
      if (screenRef.current === 'playing') setPaused(true)
    }
    const onVisibility = () => {
      if (document.hidden) onBlurOrHidden()
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('blur', onBlurOrHidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('blur', onBlurOrHidden)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [startRun, togglePause, toggleMute])

  return (
    <div className="app">
      {screen !== 'menu' && (
        <GameCanvas
          key={runId}
          paused={paused}
          onTick={handleTick}
          onAnnounce={handleAnnounce}
          onPhase={handlePhase}
          onEnd={handleEnd}
        />
      )}

      {screen === 'playing' && (
        <HudOverlay
          time={displayTime}
          graze={graze}
          phase={phase}
          toast={toast}
          paused={paused}
          muted={muted}
          onTogglePause={togglePause}
          onToggleMute={toggleMute}
        />
      )}

      {screen === 'menu' && <StartScreen records={records} onStart={startRun} />}

      {screen === 'result' && result && (
        <ResultScreen
          result={result}
          records={records}
          isNewBest={isNewBest}
          onRestart={startRun}
          onMenu={() => setScreen('menu')}
        />
      )}
    </div>
  )
}
