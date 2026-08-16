/** localStorage 纪录读写；纯函数式核心 + 可注入 store，便于测试与隐私模式兜底 */

export interface Records {
  /** 最长坚持秒数 */
  best: number
  /** 通关次数（>=100s） */
  wins: number
  /** 累计擦弹数 */
  totalGraze: number
  /** 总游玩局数 */
  plays: number
}

export const DEFAULT_RECORDS: Records = { best: 0, wins: 0, totalGraze: 0, plays: 0 }

const KEY = 'man100.records.v1'

interface StoreLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStore(): StoreLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

export function loadRecords(store: StoreLike | null = defaultStore()): Records {
  if (!store) return { ...DEFAULT_RECORDS }
  try {
    const raw = store.getItem(KEY)
    if (!raw) return { ...DEFAULT_RECORDS }
    const parsed = JSON.parse(raw) as Partial<Records>
    return {
      best: typeof parsed.best === 'number' && parsed.best >= 0 ? parsed.best : 0,
      wins: typeof parsed.wins === 'number' && parsed.wins >= 0 ? parsed.wins : 0,
      totalGraze:
        typeof parsed.totalGraze === 'number' && parsed.totalGraze >= 0 ? parsed.totalGraze : 0,
      plays: typeof parsed.plays === 'number' && parsed.plays >= 0 ? parsed.plays : 0,
    }
  } catch {
    return { ...DEFAULT_RECORDS }
  }
}

export function saveRecords(records: Records, store: StoreLike | null = defaultStore()): void {
  if (!store) return
  try {
    store.setItem(KEY, JSON.stringify(records))
  } catch {
    /* 隐私模式/配额满：静默失败 */
  }
}

/** 一局结束后合并纪录（纯函数） */
export function mergeResult(
  prev: Records,
  result: { time: number; graze: number; win: boolean },
): Records {
  return {
    best: Math.max(prev.best, result.time),
    wins: prev.wins + (result.win ? 1 : 0),
    totalGraze: prev.totalGraze + Math.max(0, result.graze),
    plays: prev.plays + 1,
  }
}
