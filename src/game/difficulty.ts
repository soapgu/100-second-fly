/**
 * 难度时间轴：数据驱动。
 * 每个阶段定义一组弹幕发射器；发射间隔在阶段内从 interval 线性收紧到 intervalEnd，
 * 让难度爬升更平滑。阶段切换时由 Game 向 HUD 抛出 announce 提示语。
 */

/** 通关所需存活秒数 */
export const WIN_TIME = 100

export type EmitterType = 'aimed' | 'ring' | 'spiral' | 'wall'

export interface EmitterSpec {
  type: EmitterType
  /** 阶段开始时的发射间隔（秒） */
  interval: number
  /** 阶段结束时的发射间隔（秒），缺省等于 interval */
  intervalEnd?: number
  /** 子弹速度（逻辑像素/秒） */
  speed: number
  /** 每轮子弹数（ring/spiral 用；wall 由宽度推算） */
  count?: number
}

export interface Phase {
  /** 阶段开始秒数（含） */
  start: number
  /** 阶段结束秒数（不含；最后一个阶段到 WIN_TIME） */
  end: number
  level: number
  name: string
  /** 进入该阶段时屏幕中央弹出的提示语 */
  announce: string
  emitters: EmitterSpec[]
}

export const PHASES: Phase[] = [
  {
    start: 0,
    end: 10,
    level: 1,
    name: '阶段一 · 试探',
    announce: '开始！撑过100秒！',
    emitters: [{ type: 'aimed', interval: 0.95, intervalEnd: 0.72, speed: 150 }],
  },
  {
    start: 10,
    end: 30,
    level: 2,
    name: '阶段二 · 压制',
    announce: '弹幕加强了！',
    emitters: [
      { type: 'aimed', interval: 0.72, intervalEnd: 0.55, speed: 180 },
      { type: 'ring', interval: 2.6, intervalEnd: 2.1, speed: 115, count: 14 },
    ],
  },
  {
    start: 30,
    end: 60,
    level: 3,
    name: '阶段三 · 狂乱',
    announce: '密度提升！坚持住！',
    emitters: [
      { type: 'aimed', interval: 0.55, intervalEnd: 0.44, speed: 205 },
      { type: 'ring', interval: 2.1, intervalEnd: 1.7, speed: 135, count: 18 },
      { type: 'spiral', interval: 0.15, intervalEnd: 0.12, speed: 125, count: 2 },
    ],
  },
  {
    start: 60,
    end: WIN_TIME,
    level: 4,
    name: '阶段四 · 地狱',
    announce: '地狱模式！！',
    emitters: [
      { type: 'aimed', interval: 0.44, intervalEnd: 0.34, speed: 235 },
      { type: 'ring', interval: 1.8, intervalEnd: 1.45, speed: 155, count: 22 },
      { type: 'spiral', interval: 0.13, intervalEnd: 0.1, speed: 145, count: 2 },
      { type: 'wall', interval: 4.6, intervalEnd: 3.6, speed: 135 },
    ],
  },
]

/** 阶段内的额外提示（不切换阶段，只弹文字） */
export const EXTRA_ANNOUNCEMENTS: ReadonlyArray<{ at: number; text: string }> = [
  { at: 90, text: '最后10秒！！！' },
]

/** 查询 t 秒时所处的阶段（t 会被钳制到合法范围） */
export function phaseAt(t: number): Phase {
  const clamped = Math.max(0, Math.min(t, WIN_TIME - 1e-9))
  for (const p of PHASES) {
    if (clamped >= p.start && clamped < p.end) return p
  }
  return PHASES[PHASES.length - 1]
}

/** 阶段内进度 0..1，用于发射间隔插值 */
export function phaseProgress(phase: Phase, t: number): number {
  const span = phase.end - phase.start
  if (span <= 0) return 1
  return Math.max(0, Math.min(1, (t - phase.start) / span))
}

/** 发射器当前的发射间隔（阶段内线性收紧） */
export function currentInterval(spec: EmitterSpec, progress: number): number {
  const end = spec.intervalEnd ?? spec.interval
  return spec.interval + (end - spec.interval) * progress
}
