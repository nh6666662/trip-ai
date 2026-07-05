import { describe, it, expect } from 'vitest'
import { detectConflicts } from '../conflict'
import type { TripNode } from '@/types/database'

/** 构造测试节点的工厂 */
function makeNode(
  overrides: Partial<TripNode> & { id: string; sort_order: number },
): TripNode {
  return {
    trip_id: 'trip-1',
    spot_id: null,
    name: overrides.name ?? `节点 ${overrides.id}`,
    node_type: 'spot',
    start_time: overrides.start_time ?? '2026-07-01T09:00:00.000Z',
    duration_minutes: overrides.duration_minutes ?? 60,
    transit_minutes: overrides.transit_minutes ?? 30,
    metadata: {},
    ...overrides,
  }
}

describe('detectConflicts', () => {
  it('时间间隔合理时无冲突', () => {
    const nodes = [
      makeNode({
        id: 'a',
        sort_order: 0,
        start_time: '2026-07-01T09:00:00.000Z',
        duration_minutes: 60,
        transit_minutes: 30,
      }),
      makeNode({
        id: 'b',
        sort_order: 1,
        start_time: '2026-07-01T10:30:00.000Z', // 9:00+60min+30min transit = 10:30
        duration_minutes: 90,
        transit_minutes: 30,
      }),
    ]
    expect(detectConflicts(nodes)).toHaveLength(0)
  })

  it('检测到 time_overlap（前一节点未结束下一节点已开始）', () => {
    const nodes = [
      makeNode({
        id: 'a',
        sort_order: 0,
        start_time: '2026-07-01T09:00:00.000Z',
        duration_minutes: 120, // 11:00 结束
        transit_minutes: 30, // 需要 11:30 才到下一站
      }),
      makeNode({
        id: 'b',
        sort_order: 1,
        start_time: '2026-07-01T10:30:00.000Z', // 但 10:30 就开始了
      }),
    ]
    const conflicts = detectConflicts(nodes)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('time_overlap')
    expect(conflicts[0].severity).toBe('error')
    expect(conflicts[0].nodeId).toBe('b')
  })

  it('检测到 transit_too_long（到达下一节点交通耗时 > 120 分钟）', () => {
    const nodes = [
      makeNode({
        id: 'a',
        sort_order: 0,
        start_time: '2026-07-01T09:00:00.000Z',
        duration_minutes: 60,
        transit_minutes: 30,
      }),
      makeNode({
        id: 'b',
        sort_order: 1,
        start_time: '2026-07-01T13:30:00.000Z', // 9:00 + 60min = 10:00；+150min transit = 12:30 < 13:30，无重叠
        transit_minutes: 150, // 到达 b 需 150 分钟交通（超长）
      }),
    ]
    const conflicts = detectConflicts(nodes)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].type).toBe('transit_too_long')
    expect(conflicts[0].severity).toBe('warning')
  })

  it('无序输入也能按 sort_order 正确检测', () => {
    const nodes = [
      // 故意打乱顺序
      makeNode({
        id: 'second',
        sort_order: 1,
        start_time: '2026-07-01T09:30:00.000Z', // 与 first 09:00+60min 重叠
      }),
      makeNode({
        id: 'first',
        sort_order: 0,
        start_time: '2026-07-01T09:00:00.000Z',
        duration_minutes: 60,
        transit_minutes: 30,
      }),
    ]
    const conflicts = detectConflicts(nodes)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0].nodeId).toBe('second')
  })

  it('空列表与单节点均无冲突', () => {
    expect(detectConflicts([])).toHaveLength(0)
    expect(detectConflicts([makeNode({ id: 'solo', sort_order: 0 })])).toHaveLength(0)
  })

  it('多节点链路冲突计数正确（连续两处重叠）', () => {
    const nodes = [
      makeNode({
        id: 'a',
        sort_order: 0,
        start_time: '2026-07-01T09:00:00.000Z',
        duration_minutes: 120,
        transit_minutes: 15,
      }),
      makeNode({
        id: 'b',
        sort_order: 1,
        start_time: '2026-07-01T10:00:00.000Z', // 与 a 重叠
      }),
      makeNode({
        id: 'c',
        sort_order: 2,
        start_time: '2026-07-01T10:30:00.000Z', // 与 b 重叠（b 默认 60min）
      }),
    ]
    const conflicts = detectConflicts(nodes)
    expect(conflicts).toHaveLength(2)
    expect(conflicts.map((c) => c.nodeId)).toEqual(['b', 'c'])
  })
})
