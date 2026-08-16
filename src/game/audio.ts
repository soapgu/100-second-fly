/** WebAudio 程序化音效：无音频文件；懒加载，首次用户手势后解锁 */

type OscType = OscillatorType

class Sfx {
  private ctx: AudioContext | null = null
  private muted = false

  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume()
      return
    }
    try {
      const AC = window.AudioContext ?? (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (AC) this.ctx = new AC()
    } catch {
      this.ctx = null
    }
  }

  setMuted(m: boolean): void {
    this.muted = m
  }

  get isMuted(): boolean {
    return this.muted
  }

  private beep(freq: number, dur: number, type: OscType, gain: number, slideTo?: number): void {
    if (!this.ctx || this.muted) return
    try {
      const t0 = this.ctx.currentTime
      const osc = this.ctx.createOscillator()
      const g = this.ctx.createGain()
      osc.type = type
      osc.frequency.setValueAtTime(freq, t0)
      if (slideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
      g.gain.setValueAtTime(gain, t0)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
      osc.connect(g).connect(this.ctx.destination)
      osc.start(t0)
      osc.stop(t0 + dur + 0.02)
    } catch {
      /* 忽略音频异常 */
    }
  }

  grazeTick(): void {
    this.beep(1400, 0.05, 'sine', 0.03, 1800)
  }

  phaseWhoosh(): void {
    this.beep(220, 0.25, 'sawtooth', 0.05, 520)
  }

  dieBoom(): void {
    this.beep(160, 0.5, 'square', 0.09, 40)
  }

  winJingle(): void {
    this.beep(523, 0.12, 'triangle', 0.07)
    window.setTimeout(() => this.beep(659, 0.12, 'triangle', 0.07), 120)
    window.setTimeout(() => this.beep(784, 0.2, 'triangle', 0.08), 240)
    window.setTimeout(() => this.beep(1047, 0.35, 'triangle', 0.08), 360)
  }
}

export const sfx = new Sfx()
