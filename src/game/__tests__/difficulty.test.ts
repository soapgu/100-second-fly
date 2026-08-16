import { describe, it, expect } from 'vitest'
import {
  PHASES,
  WIN_TIME,
  EXTRA_ANNOUNCEMENTS,
  phaseAt,
  phaseProgress,
  currentInterval,
} from '../difficulty'

describe('phaseAt 阶段边界', () => {
  it('关键时间点落在正确阶段', () => {
    expect(phaseAt(0).level).toBe(1)
    expect(phaseAt(9.99).level).toBe(1)
    expect(phaseAt(10).level).toBe(2)
    expect(phaseAt(29.99).level).toBe(2)
    expect(phaseAt(30).level).toBe(3)
    expect(phaseAt(59.99).level).toBe(3)
    expect(phaseAt(60).level).toBe(4)
    expect(phaseAt(99.9).level).toBe(4)
  })

  it('阶段无缝衔接且覆盖 [0, 100)', () => {
    for (let i = 1; i < PHASES.length; i++) {
      expect(PHASES[i].start).toBe(PHASES[i - 1].end)
    }
    expect(PHASES[0].start).toBe(0)
    expect(PHASES[PHASES.length - 1].end).toBe(WIN_TIME)
  })

  it('越界时间被钳制', () => {
    expect(phaseAt(-5).level).toBe(1)
    expect(phaseAt(WIN_TIME).level).toBe(PHASES[PHASES.length - 1].level)
  })

  it('难度单调：等级与发射器数量递增', () => {
    for (let i = 1; i < PHASES.length; i++) {
      expect(PHASES[i].level).toBeGreaterThan(PHASES[i - 1].level)
      expect(PHASES[i].emitters.length).toBeGreaterThanOrEqual(PHASES[i - 1].emitters.length)
    }
  })

  it('每个阶段都有提示语与合法发射器参数', () => {
    for (const p of PHASES) {
      expect(p.announce.length).toBeGreaterThan(0)
      for (const e of p.emitters) {
        expect(e.interval).toBeGreaterThan(0)
        expect(e.speed).toBeGreaterThan(0)
        if (e.intervalEnd !== undefined) {
          expect(e.intervalEnd).toBeLessThanOrEqual(e.interval)
          expect(e.intervalEnd).toBeGreaterThan(0)
        }
      }
    }
  })

  it('最后10秒提示落在最终阶段内', () => {
    for (const ea of EXTRA_ANNOUNCEMENTS) {
      expect(ea.text.length).toBeGreaterThan(0)
      expect(ea.at).toBeGreaterThanOrEqual(0)
      expect(ea.at).toBeLessThan(WIN_TIME)
    }
  })
})

describe('phaseProgress / currentInterval', () => {
  const phase = PHASES[1] // 10..30

  it('阶段内进度 0→1', () => {
    expect(phaseProgress(phase, 10)).toBe(0)
    expect(phaseProgress(phase, 20)).toBeCloseTo(0.5)
    expect(phaseProgress(phase, 30)).toBe(1)
  })

  it('进度越界被钳制', () => {
    expect(phaseProgress(phase, 0)).toBe(0)
    expect(phaseProgress(phase, 999)).toBe(1)
  })

  it('发射间隔随进度线性收紧', () => {
    const spec = phase.emitters[0] // aimed 0.72 → 0.55
    expect(currentInterval(spec, 0)).toBeCloseTo(0.72)
    expect(currentInterval(spec, 1)).toBeCloseTo(0.55)
    expect(currentInterval(spec, 0.5)).toBeCloseTo(0.635)
  })

  it('缺省 intervalEnd 时间隔恒定', () => {
    expect(currentInterval({ type: 'aimed', interval: 1, speed: 100 }, 0.7)).toBe(1)
  })
})
