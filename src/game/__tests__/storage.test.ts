import { describe, it, expect } from 'vitest'
import { loadRecords, saveRecords, mergeResult, DEFAULT_RECORDS, type Records } from '../storage'

function makeStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    _map: map,
  }
}

describe('storage 纪录读写', () => {
  it('空存储返回默认值', () => {
    expect(loadRecords(makeStore())).toEqual(DEFAULT_RECORDS)
    expect(loadRecords(null)).toEqual(DEFAULT_RECORDS)
  })

  it('保存后可读回', () => {
    const store = makeStore()
    const r: Records = { best: 42.5, wins: 2, totalGraze: 99, plays: 7 }
    saveRecords(r, store)
    expect(loadRecords(store)).toEqual(r)
  })

  it('损坏的 JSON 回退默认值', () => {
    const store = makeStore({ 'man100.records.v1': '{oops' })
    expect(loadRecords(store)).toEqual(DEFAULT_RECORDS)
  })

  it('非法字段被清洗', () => {
    const store = makeStore({
      'man100.records.v1': JSON.stringify({ best: -3, wins: 'x', totalGraze: 5, plays: 1 }),
    })
    expect(loadRecords(store)).toEqual({ best: 0, wins: 0, totalGraze: 5, plays: 1 })
  })
})

describe('mergeResult 战绩合并', () => {
  it('刷新最佳、累加擦弹与局数', () => {
    const prev: Records = { best: 50, wins: 1, totalGraze: 10, plays: 3 }
    const next = mergeResult(prev, { time: 66.6, graze: 5, win: false })
    expect(next).toEqual({ best: 66.6, wins: 1, totalGraze: 15, plays: 4 })
  })

  it('未破纪录保留旧最佳；通关累加 wins', () => {
    const prev: Records = { best: 80, wins: 1, totalGraze: 0, plays: 1 }
    const next = mergeResult(prev, { time: 100, graze: 0, win: true })
    expect(next).toEqual({ best: 100, wins: 2, totalGraze: 0, plays: 2 })
  })

  it('负数擦弹按 0 处理', () => {
    const next = mergeResult(DEFAULT_RECORDS, { time: 1, graze: -5, win: false })
    expect(next.totalGraze).toBe(0)
  })
})
