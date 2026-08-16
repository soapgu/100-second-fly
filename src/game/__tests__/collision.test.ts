import { describe, it, expect } from 'vitest'
import { circlesHit, grazeCheck } from '../collision'

describe('circlesHit', () => {
  it('圆心重合必命中', () => {
    expect(circlesHit(0, 0, 5, 0, 0, 3)).toBe(true)
  })

  it('边缘相切算命中', () => {
    // 半径和 = 8，距离恰好 8
    expect(circlesHit(0, 0, 5, 8, 0, 3)).toBe(true)
  })

  it('刚好分离不命中', () => {
    expect(circlesHit(0, 0, 5, 8.1, 0, 3)).toBe(false)
  })

  it('对角距离按勾股计算', () => {
    // 距离 = sqrt(3^2+4^2) = 5，半径和 = 5 → 相切命中
    expect(circlesHit(0, 0, 2, 3, 4, 3)).toBe(true)
    expect(circlesHit(0, 0, 2, 3.1, 4.1, 3)).toBe(false)
  })
})

describe('grazeCheck', () => {
  const bandR = 30

  it('近旁但未命中 → 擦弹成立', () => {
    // 子弹半径 5、玩家判定 3：距离 20 < 30 且 20 > 8
    expect(grazeCheck(20, 0, 5, 0, 0, 3, bandR)).toBe(true)
  })

  it('已命中判定点的子弹不算擦弹', () => {
    expect(grazeCheck(6, 0, 5, 0, 0, 3, bandR)).toBe(false)
  })

  it('超出环带不算擦弹', () => {
    expect(grazeCheck(31, 0, 5, 0, 0, 3, bandR)).toBe(false)
  })

  it('环带边缘算擦弹', () => {
    expect(grazeCheck(30, 0, 5, 0, 0, 3, bandR)).toBe(true)
  })
})
