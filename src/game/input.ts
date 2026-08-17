import { WORLD_W } from './constants'

export interface InputSnapshot {
  /** 键盘方向，斜向已归一化到 -1..1 */
  kx: number
  ky: number
  /** 按住 Shift 或第二根手指：减速精确走位（弹幕游戏惯例） */
  slow: boolean
  /** 指针拖动产生的逻辑坐标位移增量（snapshot 时消费并清零） */
  tdx: number
  tdy: number
}

/** 屏幕像素位移 -> 逻辑坐标位移：按 canvas 显示宽度等比换算 */
export function screenDeltaToLogical(dx: number, dy: number, cssWidth: number): {
  x: number
  y: number
} {
  const scale = cssWidth > 0 ? WORLD_W / cssWidth : 1
  return { x: dx * scale, y: dy * scale }
}

/** 粗指针设备（手机/平板触屏）检测：用于切换操作说明文案 */
export function isCoarsePointer(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)')?.matches
}

/**
 * 键盘输入：方向键 / WASD 移动，Shift 减速。
 * 指针输入（触屏/鼠标统一 PointerEvent）：按住画面相对拖动移动机体，
 * 手指与机体位移 1:1 且不必重叠（弹幕游戏移动端惯例，避免手指遮挡弹幕）；
 * 按住第二根手指 = 减速精走（等价 Shift）。
 */
export class Input {
  private keys = new Set<string>()
  private disposers: Array<() => void> = []

  // ---- 指针拖动状态 ----
  /** 控制移动的主指针 id；-1 表示未按下 */
  private dragId = -1
  private lastX = 0
  private lastY = 0
  /** 未消费的逻辑坐标累积位移 */
  private accX = 0
  private accY = 0
  /** 主指针之外按下的指针数（>0 即减速） */
  private extraPointers = 0

  attach(canvas?: HTMLCanvasElement): void {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault()
      this.keys.add(k)
    }
    const onKeyUp = (e: KeyboardEvent) => this.keys.delete(e.key.toLowerCase())
    const onBlur = () => this.keys.clear()
    const onContextMenu = (e: Event) => e.preventDefault()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('contextmenu', onContextMenu)

    this.disposers = [
      () => window.removeEventListener('keydown', onKeyDown),
      () => window.removeEventListener('keyup', onKeyUp),
      () => window.removeEventListener('blur', onBlur),
      () => document.removeEventListener('contextmenu', onContextMenu),
    ]

    if (canvas) this.attachPointer(canvas)
  }

  /** 触屏/鼠标拖动：PointerEvent 统一处理 */
  private attachPointer(canvas: HTMLCanvasElement): void {
    const onDown = (e: PointerEvent) => {
      e.preventDefault()
      if (this.dragId === -1) {
        this.dragId = e.pointerId
        this.lastX = e.clientX
        this.lastY = e.clientY
        // 手指滑出 canvas 仍持续追踪
        try {
          canvas.setPointerCapture(e.pointerId)
        } catch {
          /* 部分浏览器可能在未渲染时抛错，忽略 */
        }
      } else {
        this.extraPointers++
      }
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerId !== this.dragId) return
      const d = screenDeltaToLogical(e.clientX - this.lastX, e.clientY - this.lastY, canvas.clientWidth)
      this.accX += d.x
      this.accY += d.y
      this.lastX = e.clientX
      this.lastY = e.clientY
    }
    const onUp = (e: PointerEvent) => {
      if (e.pointerId === this.dragId) {
        this.dragId = -1
      } else if (this.extraPointers > 0) {
        this.extraPointers--
      }
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)

    this.disposers.push(
      () => canvas.removeEventListener('pointerdown', onDown),
      () => canvas.removeEventListener('pointermove', onMove),
      () => canvas.removeEventListener('pointerup', onUp),
      () => canvas.removeEventListener('pointercancel', onUp),
    )
  }

  /** 清空未消费的拖动位移（暂停时调用，避免恢复瞬间机体跳动） */
  reset(): void {
    this.accX = 0
    this.accY = 0
  }

  snapshot(): InputSnapshot {
    const kx =
      (this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0) -
      (this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0)
    const ky =
      (this.keys.has('s') || this.keys.has('arrowdown') ? 1 : 0) -
      (this.keys.has('w') || this.keys.has('arrowup') ? 1 : 0)
    // 斜向速度归一化
    const len = Math.hypot(kx, ky) || 1
    const snap: InputSnapshot = {
      kx: kx / len,
      ky: ky / len,
      slow: this.keys.has('shift') || this.extraPointers > 0,
      tdx: this.accX,
      tdy: this.accY,
    }
    this.accX = 0
    this.accY = 0
    return snap
  }

  destroy(): void {
    for (const d of this.disposers) d()
    this.disposers = []
    this.dragId = -1
    this.extraPointers = 0
    this.reset()
  }
}
