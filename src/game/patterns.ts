import { WORLD_W, WORLD_H } from './constants'
import type { EmitterSpec } from './difficulty'
import type { BulletPool } from './bullets'

export interface FireContext {
  pool: BulletPool
  playerX: number
  playerY: number
}

/** 弹幕发射器基类：Game 每帧写入 interval（难度插值），到点调用 fire */
abstract class Emitter {
  readonly spec: EmitterSpec
  interval: number
  protected timer: number
  /** 首次发射前的延迟，避免开局瞬间贴脸 */
  constructor(spec: EmitterSpec, firstDelay: number) {
    this.spec = spec
    this.interval = spec.interval
    this.timer = -firstDelay
  }

  update(dt: number, ctx: FireContext): void {
    this.timer += dt
    while (this.timer >= this.interval) {
      this.timer -= this.interval
      this.fire(ctx)
    }
  }

  protected abstract fire(ctx: FireContext): void
  /** 阶段切换时给个小缓冲 */
  reset(delay: number): void {
    this.timer = -delay
  }
}

/** 瞄准弹：从屏幕边缘/角落的出弹点朝玩家当前位置射击 */
class AimedEmitter extends Emitter {
  private static SPAWNS: ReadonlyArray<readonly [number, number]> = [
    [WORLD_W / 2, -20],
    [60, -20],
    [WORLD_W - 60, -20],
    [-20, WORLD_H * 0.25],
    [WORLD_W + 20, WORLD_H * 0.25],
    [-20, WORLD_H * 0.5],
    [WORLD_W + 20, WORLD_H * 0.5],
  ]
  private idx = Math.floor(Math.random() * AimedEmitter.SPAWNS.length)

  protected fire(ctx: FireContext): void {
    const [sx, sy] = AimedEmitter.SPAWNS[this.idx]
    this.idx = (this.idx + 1 + Math.floor(Math.random() * 3)) % AimedEmitter.SPAWNS.length
    const speed = this.spec.speed
    const base = Math.atan2(ctx.playerY - sy, ctx.playerX - sx)
    // 小幅扇形散布，避免单发太呆
    const spread = 0.09
    for (const off of [-spread, 0, spread]) {
      const a = base + off
      ctx.pool.spawn(sx, sy, Math.cos(a) * speed, Math.sin(a) * speed, 5, 350)
    }
  }
}

/** 环形散射：场地上半区随机点炸开一圈 */
class RingEmitter extends Emitter {
  private rotation = Math.random() * Math.PI * 2

  protected fire(ctx: FireContext): void {
    const cx = 80 + Math.random() * (WORLD_W - 160)
    const cy = 90 + Math.random() * WORLD_H * 0.35
    const n = this.spec.count ?? 16
    const speed = this.spec.speed
    this.rotation += 0.35
    for (let i = 0; i < n; i++) {
      const a = this.rotation + (i / n) * Math.PI * 2
      ctx.pool.spawn(cx, cy, Math.cos(a) * speed, Math.sin(a) * speed, 5, 315)
    }
  }
}

/** 螺旋弹幕：固定点位持续旋转喷洒 */
class SpiralEmitter extends Emitter {
  private angle = Math.random() * Math.PI * 2
  private readonly cx = WORLD_W / 2
  private readonly cy = WORLD_H * 0.3
  private readonly spin = 2.4

  update(dt: number, ctx: FireContext): void {
    this.angle += this.spin * dt
    super.update(dt, ctx)
  }

  protected fire(ctx: FireContext): void {
    const arms = this.spec.count ?? 2
    const speed = this.spec.speed
    for (let i = 0; i < arms; i++) {
      const a = this.angle + (i / arms) * Math.PI * 2
      ctx.pool.spawn(this.cx, this.cy, Math.cos(a) * speed, Math.sin(a) * speed, 4.5, 200)
    }
  }
}

/** 弹幕墙：顶部整排压下，留一个随机缺口 */
class WallEmitter extends Emitter {
  private static SPACING = 26
  private static GAP_W = 150

  protected fire(ctx: FireContext): void {
    const speed = this.spec.speed
    const gapX = 120 + Math.random() * (WORLD_W - 240)
    for (let x = WallEmitter.SPACING / 2; x < WORLD_W; x += WallEmitter.SPACING) {
      if (Math.abs(x - gapX) < WallEmitter.GAP_W / 2) continue
      ctx.pool.spawn(x, -12, 0, speed, 5, 25)
    }
  }
}

export type AnyEmitter = Emitter

export function createEmitters(specs: EmitterSpec[], firstDelay: number): Emitter[] {
  return specs.map((spec) => {
    switch (spec.type) {
      case 'aimed':
        return new AimedEmitter(spec, firstDelay)
      case 'ring':
        return new RingEmitter(spec, firstDelay + 1.2)
      case 'spiral':
        return new SpiralEmitter(spec, firstDelay + 1.5)
      case 'wall':
        return new WallEmitter(spec, firstDelay + 2)
    }
  })
}
