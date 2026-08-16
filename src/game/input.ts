export interface InputSnapshot {
  /** 键盘方向，斜向已归一化到 -1..1 */
  kx: number
  ky: number
  /** 按住 Shift：减速精确走位（弹幕游戏惯例） */
  slow: boolean
}

/** 键盘输入：方向键 / WASD 移动，Shift 减速 */
export class Input {
  private keys = new Set<string>()
  private disposers: Array<() => void> = []

  attach(): void {
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
    return { kx: kx / len, ky: ky / len, slow: this.keys.has('shift') }
  }

  destroy(): void {
    for (const d of this.disposers) d()
    this.disposers = []
  }
}
