import { useEffect, useRef } from 'react'

interface Star {
  x: number
  y: number
  size: number
  phase: number
  speed: number
}

interface Orb {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  hue: number
  life: number
  maxLife: number
}

/**
 * 菜单页动态背景：深空底 + 透视网格地平线 + 像素星星 + 霓虹弹幕流。
 * 纯装饰 canvas，挂在 .app 内、overlay 之下；prefers-reduced-motion 时只绘制静态一帧。
 */
export function MenuBackdrop() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let w = 0
    let h = 0
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const stars: Star[] = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() < 0.72 ? 1 : 2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.6,
    }))

    const orbs: Orb[] = []
    const spawnOrb = () => {
      const speed = 40 + Math.random() * 100 // px/s
      const edge = Math.floor(Math.random() * 4)
      let x = 0
      let y = 0
      let vx = 0
      let vy = 0
      if (edge === 0) {
        x = Math.random() * w
        y = -12
        vx = (Math.random() - 0.5) * speed
        vy = speed
      } else if (edge === 1) {
        x = w + 12
        y = Math.random() * h
        vx = -speed
        vy = (Math.random() - 0.5) * speed
      } else if (edge === 2) {
        x = Math.random() * w
        y = h + 12
        vx = (Math.random() - 0.5) * speed
        vy = -speed
      } else {
        x = -12
        y = Math.random() * h
        vx = speed
        vy = (Math.random() - 0.5) * speed
      }
      orbs.push({
        x,
        y,
        vx,
        vy,
        r: 2 + Math.random() * 2.5,
        hue: Math.random() < 0.5 ? 186 : 335, // 霓虹青 / 品红
        life: 0,
        maxLife: 6 + Math.random() * 6,
      })
    }
    for (let i = 0; i < 12; i++) spawnOrb()

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let last = performance.now()
    let orbTimer = 0

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // 深空底色
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#05050d')
      bg.addColorStop(0.55, '#070a18')
      bg.addColorStop(1, '#04040c')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // 透视网格：地平线约在 62% 高度，向下张开
      const horizon = h * 0.62
      const vpx = w / 2
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.09)'
      for (let i = -12; i <= 12; i++) {
        ctx.beginPath()
        ctx.moveTo(vpx + (i * w) / 12, h)
        ctx.lineTo(vpx + i * 26, horizon)
        ctx.stroke()
      }
      // 横线随时间向远处滚动（间距按透视分布）
      const scroll = ((now / 1000) * 0.35) % 1
      for (let i = 0; i < 14; i++) {
        const t = (i + scroll) / 14
        const y = horizon + (h - horizon) * Math.pow(t, 2.4)
        ctx.strokeStyle = `rgba(0, 240, 255, ${0.02 + t * 0.13})`
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(w, y)
        ctx.stroke()
      }
      // 地平线光带
      const hg = ctx.createLinearGradient(0, horizon - 30, 0, horizon + 8)
      hg.addColorStop(0, 'rgba(0, 240, 255, 0)')
      hg.addColorStop(1, 'rgba(0, 240, 255, 0.15)')
      ctx.fillStyle = hg
      ctx.fillRect(0, horizon - 30, w, 38)

      // 像素星星（只在地平线以上的天区）
      for (const s of stars) {
        const tw = 0.45 + 0.55 * Math.abs(Math.sin(s.phase + (now / 1000) * s.speed))
        ctx.fillStyle = `rgba(190, 225, 255, ${0.12 + tw * 0.5})`
        ctx.fillRect(Math.round(s.x * w), Math.round(s.y * horizon * 0.96), s.size, s.size)
      }

      // 霓虹弹幕：内核方块 + 外圈光晕
      orbTimer -= dt
      if (orbTimer <= 0 && orbs.length < 26) {
        spawnOrb()
        orbTimer = 0.5 + Math.random() * 1.2
      }
      for (let i = orbs.length - 1; i >= 0; i--) {
        const o = orbs[i]
        o.x += o.vx * dt
        o.y += o.vy * dt
        o.life += dt
        if (o.life > o.maxLife || o.x < -40 || o.x > w + 40 || o.y < -40 || o.y > h + 40) {
          orbs.splice(i, 1)
          continue
        }
        const a = Math.min(1, o.life * 2, (o.maxLife - o.life) * 2) * 0.8
        ctx.fillStyle = `hsla(${o.hue}, 100%, 68%, ${a * 0.13})`
        ctx.beginPath()
        ctx.arc(o.x, o.y, o.r * 3.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `hsla(${o.hue}, 100%, 78%, ${a})`
        ctx.fillRect(Math.round(o.x - o.r), Math.round(o.y - o.r), Math.ceil(o.r * 2), Math.ceil(o.r * 2))
      }

      if (!reduced) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas className="menu-backdrop" ref={canvasRef} aria-hidden="true" />
}
