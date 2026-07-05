import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TripTimeline } from '../trip-timeline'
import { useTripStore } from '@/lib/stores/trip-store'
import type { TripNode } from '@/types/database'

// Mock use-trips hooks（避免依赖 QueryClientProvider）
vi.mock('@/lib/hooks/use-trips', () => ({
  useReorderNodes: () => ({ mutate: vi.fn() }),
  useDeleteNode: () => ({ mutate: vi.fn() }),
}))

// Mock toast（直接返回，避免触发 DOM 副作用）
vi.mock('@/lib/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

/** 构造测试节点 */
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

beforeEach(() => {
  useTripStore.setState({
    currentTrip: null,
    nodes: [],
    selectedNodeId: null,
    conflicts: [],
    isGenerating: false,
  })
})

describe('TripTimeline', () => {
  it('无节点时显示空状态，且 onAddNode 提供时显示「添加节点」按钮', () => {
    const onAddNode = vi.fn()
    render(
      <TripTimeline tripId="trip-1" nodes={[]} onAddNode={onAddNode} />,
    )
    expect(screen.getByText('还没有行程节点')).toBeTruthy()
    fireEvent.click(screen.getByText('添加节点'))
    expect(onAddNode).toHaveBeenCalled()
  })

  it('渲染节点名称', () => {
    const nodes = [
      makeNode({ id: 'n1', sort_order: 0, name: '西湖' }),
      makeNode({ id: 'n2', sort_order: 1, name: '灵隐寺' }),
    ]
    render(<TripTimeline tripId="trip-1" nodes={nodes} />)
    expect(screen.getByText('西湖')).toBeTruthy()
    expect(screen.getByText('灵隐寺')).toBeTruthy()
  })

  it('store 中存在冲突时，节点卡片渲染冲突提示文案', () => {
    const nodes = [
      makeNode({ id: 'n1', sort_order: 0, name: '西湖' }),
      makeNode({ id: 'n2', sort_order: 1, name: '断桥' }),
    ]
    useTripStore.setState({
      conflicts: [
        {
          nodeId: 'n2',
          type: 'time_overlap',
          message: '与"西湖"时间冲突',
          severity: 'error',
        },
      ],
    })
    render(<TripTimeline tripId="trip-1" nodes={nodes} />)
    expect(screen.getByText('与"西湖"时间冲突')).toBeTruthy()
  })

  it('点击节点选中后再次点击取消选中（更新 store）', () => {
    const nodes = [makeNode({ id: 'n1', sort_order: 0, name: '西湖' })]
    render(<TripTimeline tripId="trip-1" nodes={nodes} />)
    fireEvent.click(screen.getByText('西湖'))
    expect(useTripStore.getState().selectedNodeId).toBe('n1')
    fireEvent.click(screen.getByText('西湖'))
    expect(useTripStore.getState().selectedNodeId).toBeNull()
  })
})
