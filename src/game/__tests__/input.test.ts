import { describe, expect, it } from 'vitest'
import { Input, screenDeltaToLogical } from '../input'
import { WORLD_W } from '../constants'

describe('screenDeltaToLogical', () => {
  it('按 canvas 显示宽度等比换算为逻辑坐标位移', () => {
    // canvas 显示宽度是逻辑宽度的一半 -> 位移放大 2 倍
    const r = screenDeltaToLogical(10, -20, WORLD_W / 2)
    expect(r.x).toBeCloseTo(20)
    expect(r.y).toBeCloseTo(-40)
  })

  it('显示宽度恰好等于逻辑宽度时 1:1 直通', () => {
    const r = screenDeltaToLogical(7, 13, WORLD_W)
    expect(r.x).toBeCloseTo(7)
    expect(r.y).toBeCloseTo(13)
  })

  it('显示宽度为 0（未布局）时按 1:1 兜底，不产生 NaN', () => {
    const r = screenDeltaToLogical(5, 5, 0)
    expect(r.x).toBe(5)
    expect(r.y).toBe(5)
    expect(Number.isFinite(r.x)).toBe(true)
    expect(Number.isFinite(r.y)).toBe(true)
  })
})

describe('Input.snapshot 拖动位移', () => {
  it('返回累积位移并在下次 snapshot 清零', () => {
    const input = new Input()
    const stub = input as unknown as { accX: number; accY: number }
    stub.accX = 5.5
    stub.accY = -7.25

    const s1 = input.snapshot()
    expect(s1.tdx).toBeCloseTo(5.5)
    expect(s1.tdy).toBeCloseTo(-7.25)
    expect(s1.kx).toBe(0)
    expect(s1.ky).toBe(0)

    const s2 = input.snapshot()
    expect(s2.tdx).toBe(0)
    expect(s2.tdy).toBe(0)
  })

  it('第二根手指按住（extraPointers > 0）时 slow 为真', () => {
    const input = new Input()
    const stub = input as unknown as { extraPointers: number }
    stub.extraPointers = 1
    expect(input.snapshot().slow).toBe(true)

    stub.extraPointers = 0
    expect(input.snapshot().slow).toBe(false)
  })

  it('reset() 清空未消费的拖动位移', () => {
    const input = new Input()
    const stub = input as unknown as { accX: number; accY: number }
    stub.accX = 100
    stub.accY = -100
    input.reset()
    expect(input.snapshot().tdx).toBe(0)
    expect(input.snapshot().tdy).toBe(0)
  })

  it('键盘斜向输入归一化', () => {
    const input = new Input()
    const stub = input as unknown as { keys: Set<string> }
    stub.keys.add('w')
    stub.keys.add('a')
    const s = input.snapshot()
    expect(s.kx).toBeCloseTo(-Math.SQRT1_2)
    expect(s.ky).toBeCloseTo(-Math.SQRT1_2)
  })
})
