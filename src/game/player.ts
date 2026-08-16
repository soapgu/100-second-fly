import { WORLD_W, WORLD_H, PLAYER_HIT_R } from './constants'
import type { InputSnapshot } from './input'

const KEY_SPEED = 420
const SLOW_FACTOR = 0.45
const MARGIN = 10
const TRAIL_LEN = 14

/** 玩家小飞机：判定半径远小于贴图（弹幕游戏惯例），常驻显示判定点 */
export class Player {
  x = WORLD_W / 2
  y = WORLD_H * 0.72
  readonly hitR = PLAYER_HIT_R
  readonly spriteR = 12
  trail: Array<{ x: number; y: number }> = []
  alive = true

  update(dt: number, input: InputSnapshot): void {
    if (!this.alive) return
    const speed = input.slow ? KEY_SPEED * SLOW_FACTOR : KEY_SPEED
    this.x += input.kx * speed * dt
    this.y += input.ky * speed * dt
    this.x = Math.max(MARGIN, Math.min(WORLD_W - MARGIN, this.x))
    this.y = Math.max(MARGIN, Math.min(WORLD_H - MARGIN, this.y))

    this.trail.unshift({ x: this.x, y: this.y })
    if (this.trail.length > TRAIL_LEN) this.trail.pop()
  }

  render(ctx: CanvasRenderingContext2D): void {
    // 拖尾
    for (let i = 1; i < this.trail.length; i++) {
      const p = this.trail[i]
      const a = (1 - i / this.trail.length) * 0.25
      ctx.fillStyle = `rgba(120, 200, 255, ${a})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, this.spriteR * (1 - i / this.trail.length) * 0.6, 0, Math.PI * 2)
      ctx.fill()
    }
    if (!this.alive) return

    // 机体（三角小飞机）
    ctx.save()
    ctx.translate(this.x, this.y)
    ctx.shadowColor = 'rgba(90, 190, 255, 0.9)'
    ctx.shadowBlur = 14
    ctx.fillStyle = '#bfe8ff'
    ctx.beginPath()
    ctx.moveTo(0, -this.spriteR)
    ctx.lineTo(this.spriteR * 0.8, this.spriteR * 0.9)
    ctx.lineTo(0, this.spriteR * 0.45)
    ctx.lineTo(-this.spriteR * 0.8, this.spriteR * 0.9)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // 判定点（弹幕灵魂）
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.hitR, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.hitR + 2.5, 0, Math.PI * 2)
    ctx.stroke()
  }
}
