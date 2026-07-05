import { describe, it, expect } from 'vitest'
import {
  createStrategy,
  TightStrategy,
  RelaxedStrategy,
} from '../strategy'
import type { Spot } from '@/types/database'

/** 构造测试景点的工厂 */
function makeSpot(overrides: Partial<Spot> & { id: string }): Spot {
  return {
    name: `景点 ${overrides.id}`,
    description: null,
    image_url: null,
    latitude: 30.25,
    longitude: 120.16,
    min_visit_minutes: 90,
    recommended_minutes: 120,
    rating: 4.5,
    tags: null,
    opening_time: '09:00',
    closing_time: '18:00',
    ...overrides,
  }
}

const baseSpots: Spot[] = [
  makeSpot({ id: 'a1111111-1111-1111-1111-111111111111', rating: 4.8 }),
  makeSpot({ id: 'a2222222-2222-2222-2222-222222222222', rating: 4.5 }),
  makeSpot({ id: 'a3333333-3333-3333-3333-333333333333', rating: 4.2 }),
  makeSpot({ id: 'a4444444-4444-4444-4444-444444444444', rating: 4.0 }),
]

const baseParams = {
  spots: baseSpots,
  pace: 'tight' as const,
  startDate: '2026-07-01',
  endDate: '2026-07-02',
  destination: '杭州',
}

describe('createStrategy 工厂', () => {
  it('pace=tight → TightStrategy；pace=relaxed → RelaxedStrategy', () => {
    expect(createStrategy('tight')).toBeInstanceOf(TightStrategy)
    expect(createStrategy('relaxed')).toBeInstanceOf(RelaxedStrategy)
  })
})

describe('TightStrategy', () => {
  const strategy = new TightStrategy()

  it('生成节点数 ≥ 景点数，且 sort_order 从 0 递增', () => {
    const { nodes, pace } = strategy.generate(baseParams)
    expect(pace).toBe('tight')
    expect(nodes.length).toBeGreaterThanOrEqual(baseSpots.length)
    nodes.forEach((n, i) => expect(n.sort_order).toBe(i))
  })

  it('首个节点出发时间为 08:00', () => {
    const { nodes } = strategy.generate(baseParams)
    const first = new Date(nodes[0].start_time)
    expect(first.getHours()).toBe(8)
    expect(first.getMinutes()).toBe(0)
  })

  it('景点节点带 spot_id + metadata.day，并按评分降序（最高评分排首）', () => {
    const { nodes } = strategy.generate(baseParams)
    const spotNodes = nodes.filter((n) => n.node_type === 'spot')
    expect(spotNodes[0].spot_id).toBe('a1111111-1111-1111-1111-111111111111')
    const meta = spotNodes[0].metadata as { day?: number }
    expect(meta.day).toBeGreaterThanOrEqual(1)
  })
})

describe('RelaxedStrategy', () => {
  const strategy = new RelaxedStrategy()

  it('每日最多 3 个景点（7 景点 + 2 天 → 截断到 6）', () => {
    const spots = [
      ...baseSpots,
      makeSpot({ id: 'a5555555-5555-5555-5555-555555555555', rating: 3.9 }),
      makeSpot({ id: 'a6666666-6666-6666-6666-666666666666', rating: 3.8 }),
      makeSpot({ id: 'a7777777-7777-7777-7777-777777777777', rating: 3.7 }),
    ]
    const { nodes, pace } = strategy.generate({
      ...baseParams,
      spots,
      pace: 'relaxed',
    })
    expect(pace).toBe('relaxed')
    const spotNodes = nodes.filter((n) => n.node_type === 'spot')
    expect(spotNodes.length).toBeLessThanOrEqual(6)
  })

  it('首个节点 09:00 出发，且每日首个景点后插入 12:00 午餐', () => {
    const { nodes } = strategy.generate({ ...baseParams, pace: 'relaxed' })
    const first = new Date(nodes[0].start_time)
    expect(first.getHours()).toBe(9)
    expect(first.getMinutes()).toBe(0)

    const meals = nodes.filter((n) => n.node_type === 'meal')
    expect(meals.length).toBeGreaterThanOrEqual(2) // 2 天至少 2 顿午餐
    const firstMeal = new Date(meals[0].start_time)
    expect(firstMeal.getHours()).toBe(12)
  })

  it('每个景点后插入休息节点（rest 数 = spot 数）', () => {
    const { nodes } = strategy.generate({ ...baseParams, pace: 'relaxed' })
    const restCount = nodes.filter((n) => n.node_type === 'rest').length
    const spotCount = nodes.filter((n) => n.node_type === 'spot').length
    expect(restCount).toBe(spotCount)
  })
})
