import { describe, it, expect } from 'vitest'
import { verdictFor, COPY } from '../copy'

describe('verdictFor 结算评价分档', () => {
  it('各档位边界正确', () => {
    expect(verdictFor(0)).toBe('这也叫男人？')
    expect(verdictFor(9.9)).toBe('这也叫男人？')
    expect(verdictFor(10)).toBe('还差得远呢')
    expect(verdictFor(29.9)).toBe('还差得远呢')
    expect(verdictFor(30)).toBe('有点男人样了')
    expect(verdictFor(59.9)).toBe('有点男人样了')
    expect(verdictFor(60)).toBe('真正的猛士！')
    expect(verdictFor(89.9)).toBe('真正的猛士！')
    expect(verdictFor(90)).toBe('惜败！就差一点！')
    expect(verdictFor(99.9)).toBe('惜败！就差一点！')
    expect(verdictFor(100)).toBe('是男人就坚持100秒——你做到了！')
    expect(verdictFor(120)).toBe('是男人就坚持100秒——你做到了！')
  })
})

describe('COPY 文案完整性', () => {
  it('关键文案均非空', () => {
    expect(COPY.title).toContain('100')
    expect(COPY.instructions.length).toBeGreaterThan(0)
    for (const line of COPY.instructions) expect(line.length).toBeGreaterThan(0)
    expect(COPY.controls.length).toBeGreaterThan(0)
    expect(COPY.start.length).toBeGreaterThan(0)
  })
})
