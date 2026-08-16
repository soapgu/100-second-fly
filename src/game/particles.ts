interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  hue: number
  active: boolean
}

const MAX_PARTICLES = 600

/** 轻量粒子池：爆炸、擦弹火花、通关礼花 */
export class ParticleSystem {
  private particles: Particle[] = []

  burst(
    x: number,
    y: number,
    count: number,
    opts: { speed?: number; life?: number; size?: number; hue?: number; spread?: number } = {},
  ): void {
    const { speed = 180, life = 0.6, size = 3, hue = 0, spread = Math.PI * 2 } = opts
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * spread - spread / 2 + (spread < Math.PI * 2 ? -Math.PI / 2 : 0)
      const v = speed * (0.3 + Math.random() * 0.7)
      this.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: life * (0.6 + Math.random() * 0.4),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        hue,
        active: true,
      })
    }
  }

  private push(p: Particle): void {
    for (const slot of this.particles) {
      if (!slot.active) {
        Object.assign(slot, p)
        return
      }
    }
    if (this.particles.length < MAX_PARTICLES) this.particles.push(p)
  }

  update(dt: number): void {
    for (const p of this.particles) {
      if (!p.active) continue
      p.life -= dt
      if (p.life <= 0) {
        p.active = false
        continue
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= 1 - 2.2 * dt
      p.vy *= 1 - 2.2 * dt
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    for (const p of this.particles) {
      if (!p.active) continue
      const a = Math.max(0, p.life / p.maxLife)
      ctx.fillStyle = `hsla(${p.hue}, 95%, 62%, ${a})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }

  clear(): void {
    for (const p of this.particles) p.active = false
  }
}
