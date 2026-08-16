import { useEffect, useRef } from 'react'
import { Game, type GameEvents } from '../game/Game'

interface Props extends GameEvents {
  paused: boolean
  /** 暂停切换时同步给引擎；挂载后变化才生效 */
  onReady?: (game: Game) => void
}

/**
 * 挂载 canvas 并驱动 Game 实例。
 * 事件回调经 ref 转发，避免闭包过期 / effect 重跑；重开由父组件改 key 重新挂载。
 */
export function GameCanvas({ paused, onTick, onAnnounce, onPhase, onEnd, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const eventsRef = useRef({ onTick, onAnnounce, onPhase, onEnd })
  eventsRef.current = { onTick, onAnnounce, onPhase, onEnd }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const game = new Game(canvas, {
      onTick: (t, g) => eventsRef.current.onTick(t, g),
      onAnnounce: (text) => eventsRef.current.onAnnounce(text),
      onPhase: (p) => eventsRef.current.onPhase(p),
      onEnd: (r) => eventsRef.current.onEnd(r),
    })
    gameRef.current = game
    game.start()
    onReady?.(game)
    return () => {
      game.destroy()
      gameRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    gameRef.current?.setPaused(paused)
  }, [paused])

  return <canvas ref={canvasRef} />
}
