import { WORLD_W, WORLD_H } from './constants'

export interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hue: number
  active: boolean
  /** 是否已被擦弹计分（每颗子弹只计一次） */
  grazed: boolean
}

const MAX_BULLETS = 1500
const CULL_MARGIN = 80

/** 子弹对象池：复用槽位，避免高频分配造成 GC 抖动 */
export class BulletPool {
  private bullets: Bullet[] = []

  spawn(x: number, y: number, vx: number, vy: number, r: number, hue: number): void {
    for (const b of this.bullets) {
      if (!b.active) {
        b.x = x
        b.y = y
        b.vx = vx
        b.vy = vy
        b.r = r
        b.hue = hue
        b.grazed = false
        b.active = true
        return
      }
    }
    if (this.bullets.length >= MAX_BULLETS) return
    this.bullets.push({ x, y, vx, vy, r, hue, active: true, grazed: false })
  }

  update(dt: number): void {
    for (const b of this.bullets) {
      if (!b.active) continue
      b.x += b.vx * dt
      b.y += b.vy * dt
      if (
        b.x < -CULL_MARGIN ||
        b.x > WORLD_W + CULL_MARGIN ||
        b.y < -CULL_MARGIN ||
        b.y > WORLD_H + CULL_MARGIN
      ) {
        b.active = false
      }
    }
  }

  forEachActive(cb: (b: Bullet) => void): void {
    for (const b of this.bullets) {
      if (b.active) cb(b)
    }
  }

  get activeCount(): number {
    let n = 0
    for (const b of this.bullets) if (b.active) n++
    return n
  }

  clear(): void {
    for (const b of this.bullets) b.active = false
  }
}
