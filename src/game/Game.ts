import { WORLD_W, WORLD_H, GRAZE_BAND_R } from './constants'
import { BulletPool } from './bullets'
import { ParticleSystem } from './particles'
import { Player } from './player'
import { Input } from './input'
import { createEmitters, type AnyEmitter } from './patterns'
import { circlesHit, grazeCheck } from './collision'
import {
  PHASES,
  WIN_TIME,
  EXTRA_ANNOUNCEMENTS,
  phaseAt,
  phaseProgress,
  currentInterval,
  type Phase,
} from './difficulty'
import { sfx } from './audio'

export interface GameResult {
  win: boolean
  time: number
  graze: number
}

export interface GameEvents {
  /** 每帧上报（调用方自行节流 setState） */
  onTick(time: number, graze: number): void
  onAnnounce(text: string): void
  onPhase(phase: { level: number; name: string }): void
  onEnd(result: GameResult): void
}

type GameState = 'running' | 'dying' | 'won' | 'over'

const STEP = 1 / 60
const DEATH_SLOWMO = 0.15
const DEATH_FREEZE_AFTER = 1.1
const WIN_CELEBRATE = 1.4

interface Star {
  x: number
  y: number
  size: number
  speed: number
}

/** 子弹发光贴图缓存（radial gradient 预渲染，避免每帧 shadowBlur 几百次） */
const spriteCache = new Map<number, HTMLCanvasElement>()
function bulletSprite(hue: number): HTMLCanvasElement {
  const cached = spriteCache.get(hue)
  if (cached) return cached
  const s = 48
  const c = document.createElement('canvas')
  c.width = s
  c.height = s
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(s / 2, s / 2, 1, s / 2, s / 2, s / 2)
  grad.addColorStop(0, '#ffffff')
  grad.addColorStop(0.25, `hsl(${hue}, 95%, 65%)`)
  grad.addColorStop(0.6, `hsla(${hue}, 95%, 55%, 0.45)`)
  grad.addColorStop(1, `hsla(${hue}, 95%, 50%, 0)`)
  g.fillStyle = grad
  g.fillRect(0, 0, s, s)
  spriteCache.set(hue, c)
  return c
}

export class Game {
  private ctx: CanvasRenderingContext2D
  private input: Input
  private player = new Player()
  private pool = new BulletPool()
  private particles = new ParticleSystem()
  private emitters: AnyEmitter[] = []
  private stars: Star[] = []

  private state: GameState = 'running'
  private time = 0
  private graze = 0
  private phase: Phase = PHASES[0]
  private firedExtra = new Set<number>()
  private timeScale = 1
  private stateTimer = 0
  private shakeTrauma = 0
  private endSent = false

  private raf = 0
  private lastTs = 0
  private acc = 0
  private paused = false
  private destroyed = false
  private viewScale = 1
  private removeResize: (() => void) | null = null

  constructor(
    private canvas: HTMLCanvasElement,
    private events: GameEvents,
  ) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D not supported')
    this.ctx = ctx

    for (let i = 0; i < 110; i++) {
      this.stars.push({
        x: Math.random() * WORLD_W,
        y: Math.random() * WORLD_H,
        size: 0.6 + Math.random() * 1.8,
        speed: 6 + Math.random() * 22,
      })
    }

    this.input = new Input()
    this.applyPhase(this.phase, true)
  }

  start(): void {
    this.input.attach(this.canvas)
    this.resize()
    const onResize = () => this.resize()
    window.addEventListener('resize', onResize)
    this.removeResize = () => window.removeEventListener('resize', onResize)
    this.events.onPhase({ level: this.phase.level, name: this.phase.name })
    this.events.onAnnounce(this.phase.announce)
    sfx.phaseWhoosh()
    this.lastTs = performance.now()
    this.raf = requestAnimationFrame(this.loop)
  }

  setPaused(paused: boolean): void {
    this.paused = paused
    this.lastTs = performance.now()
    // 暂停期间清空未消费的拖动位移，避免恢复瞬间机体跳动
    if (paused) this.input.reset()
  }

  destroy(): void {
    this.destroyed = true
    cancelAnimationFrame(this.raf)
    this.input.destroy()
    this.removeResize?.()
  }

  // ---------- 尺寸与坐标 ----------

  private resize(): void {
    const margin = 0.96
    const s = Math.min(window.innerWidth / WORLD_W, window.innerHeight / WORLD_H) * margin
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.canvas.style.width = `${Math.floor(WORLD_W * s)}px`
    this.canvas.style.height = `${Math.floor(WORLD_H * s)}px`
    this.canvas.width = Math.max(1, Math.floor(WORLD_W * s * dpr))
    this.canvas.height = Math.max(1, Math.floor(WORLD_H * s * dpr))
    this.viewScale = (this.canvas.width / WORLD_W) || 1
  }

  // ---------- 主循环 ----------

  private loop = (ts: number): void => {
    if (this.destroyed) return
    this.raf = requestAnimationFrame(this.loop)

    let dt = (ts - this.lastTs) / 1000
    this.lastTs = ts
    if (dt > 0.1) dt = 0.1
    if (this.paused) {
      // 暂停中手指仍可能按住拖动，持续丢弃累积位移
      this.input.reset()
      this.render()
      return
    }

    // 死亡/通关演出用真实时间推进
    if (this.state === 'dying' || this.state === 'won') {
      this.stateTimer += dt
      if (this.state === 'dying' && this.stateTimer >= DEATH_FREEZE_AFTER) {
        this.finish({ win: false, time: this.time, graze: this.graze })
      } else if (this.state === 'won' && this.stateTimer >= WIN_CELEBRATE) {
        this.finish({ win: true, time: WIN_TIME, graze: this.graze })
      }
    }

    this.acc += dt * this.timeScale
    let steps = 0
    while (this.acc >= STEP && steps < 5) {
      this.update(STEP)
      this.acc -= STEP
      steps++
    }
    if (steps === 5) this.acc = 0

    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 1.6)
    this.events.onTick(this.time, this.graze)
    this.render()
  }

  private update(dt: number): void {
    if (this.state === 'over') return

    if (this.state === 'running') {
      this.time += dt
      if (this.time >= WIN_TIME) {
        this.enterWin()
      } else {
        const next = phaseAt(this.time)
        if (next !== this.phase) this.applyPhase(next, false)
        for (const ea of EXTRA_ANNOUNCEMENTS) {
          if (this.time >= ea.at && !this.firedExtra.has(ea.at)) {
            this.firedExtra.add(ea.at)
            this.events.onAnnounce(ea.text)
            sfx.phaseWhoosh()
          }
        }
      }
    }

    // 发射器（通关演出时停火）
    if (this.state === 'running') {
      const progress = phaseProgress(this.phase, this.time)
      for (const e of this.emitters) {
        e.interval = currentInterval(e.spec, progress)
        e.update(dt, { pool: this.pool, playerX: this.player.x, playerY: this.player.y })
      }
    }

    this.pool.update(dt)
    this.particles.update(dt)
    if (this.state === 'running') this.player.update(dt, this.input.snapshot())

    for (const star of this.stars) {
      star.y += star.speed * dt
      if (star.y > WORLD_H) {
        star.y = -2
        star.x = Math.random() * WORLD_W
      }
    }

    // 碰撞与擦弹
    if (this.state === 'running') {
      const p = this.player
      let killed = false
      this.pool.forEachActive((b) => {
        if (killed) return
        if (circlesHit(b.x, b.y, b.r, p.x, p.y, p.hitR)) {
          killed = true
          return
        }
        if (!b.grazed && grazeCheck(b.x, b.y, b.r, p.x, p.y, p.hitR, GRAZE_BAND_R)) {
          b.grazed = true
          this.graze++
          this.particles.burst(p.x, p.y, 3, { speed: 120, life: 0.3, size: 2, hue: 190 })
          sfx.grazeTick()
        }
      })
      if (killed) this.enterDeath()
    }
  }

  // ---------- 状态切换 ----------

  private applyPhase(phase: Phase, first: boolean): void {
    this.phase = phase
    this.emitters = createEmitters(phase.emitters, first ? 1.2 : 0.8)
    if (!first) {
      this.events.onPhase({ level: phase.level, name: phase.name })
      this.events.onAnnounce(phase.announce)
      sfx.phaseWhoosh()
    }
  }

  private enterDeath(): void {
    this.state = 'dying'
    this.stateTimer = 0
    this.timeScale = DEATH_SLOWMO
    this.player.alive = false
    this.shakeTrauma = 1
    this.particles.burst(this.player.x, this.player.y, 60, {
      speed: 320,
      life: 0.9,
      size: 4,
      hue: 200,
    })
    this.particles.burst(this.player.x, this.player.y, 30, {
      speed: 180,
      life: 0.7,
      size: 3,
      hue: 20,
    })
    sfx.dieBoom()
  }

  private enterWin(): void {
    this.state = 'won'
    this.stateTimer = 0
    this.timeScale = 1
    // 场上所有子弹化成礼花
    let i = 0
    this.pool.forEachActive((b) => {
      if (i++ % 3 === 0) {
        this.particles.burst(b.x, b.y, 4, { speed: 120, life: 0.8, size: 3, hue: b.hue })
      }
    })
    this.pool.clear()
    this.particles.burst(this.player.x, this.player.y, 80, {
      speed: 380,
      life: 1.1,
      size: 4,
      hue: 50,
    })
    sfx.winJingle()
  }

  private finish(result: GameResult): void {
    if (this.endSent) return
    this.endSent = true
    this.state = 'over'
    this.timeScale = 0
    this.events.onEnd(result)
  }

  // ---------- 渲染 ----------

  private render(): void {
    const ctx = this.ctx
    ctx.setTransform(this.viewScale, 0, 0, this.viewScale, 0, 0)

    // 屏幕震动
    if (this.shakeTrauma > 0) {
      const mag = this.shakeTrauma * this.shakeTrauma * 14
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag)
    }

    // 背景
    ctx.fillStyle = '#070712'
    ctx.fillRect(-20, -20, WORLD_W + 40, WORLD_H + 40)
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    for (const star of this.stars) {
      ctx.globalAlpha = Math.min(1, star.size / 2)
      ctx.fillRect(star.x, star.y, star.size, star.size)
    }
    ctx.globalAlpha = 1

    // 子弹（预渲染发光贴图）
    this.pool.forEachActive((b) => {
      const img = bulletSprite(b.hue)
      const drawSize = b.r * 5
      ctx.drawImage(img, b.x - drawSize / 2, b.y - drawSize / 2, drawSize, drawSize)
    })

    this.particles.render(ctx)
    this.player.render(ctx)

    // 死亡演出期间微白闪
    if (this.state === 'dying') {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(0, 0, WORLD_W, WORLD_H)
    }
  }
}
