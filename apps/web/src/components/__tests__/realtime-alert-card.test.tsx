import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { RealtimeAlertCard } from '../realtime-alert-card'
import type { RealtimeAlert } from '@/types/database'

// Mock GlassTip to always render detail content (it's collapsible in real usage)
vi.mock('@/components/glass', () => ({
  GlassCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  GlassTip: ({ label, detail }: { label: string; detail: React.ReactNode }) => (
    <div>
      <span>{label}</span>
      <div>{detail}</div>
    </div>
  ),
}))

function makeAlert(overrides: Partial<RealtimeAlert> & { id: string }): RealtimeAlert {
  return {
    trip_id: 'trip-1',
    alert_type: 'facility',
    priority: 'medium',
    title: '设施异常通知',
    description: '景区缆车停运维修',
    confidence: 0.85,
    suggestion: '已为你搜索附近替代景点',
    status: 'pending',
    created_at: new Date().toISOString(),
    dismiss_reason: null,
    dismissed_at: null,
    ...overrides,
  } as RealtimeAlert
}

describe('RealtimeAlertCard', () => {
  it('渲染标题和描述', () => {
    render(<RealtimeAlertCard alert={makeAlert({ id: 'a1' })} />)
    expect(screen.getByText('设施异常通知')).toBeTruthy()
    expect(screen.getByText(/缆车停运/)).toBeTruthy()
  })

  it('pending 状态显示操作按钮，点击触发回调', () => {
    const onAccept = vi.fn()
    const onDismiss = vi.fn()
    render(
      <RealtimeAlertCard alert={makeAlert({ id: 'a2' })} onAccept={onAccept} onDismiss={onDismiss} />,
    )
    fireEvent.click(screen.getByText('采纳建议'))
    expect(onAccept).toHaveBeenCalledWith('a2')
    fireEvent.click(screen.getByText(/继续原计划/))
    expect(onDismiss).toHaveBeenCalled()
  })

  it('accepted 状态显示已采纳文案', () => {
    render(<RealtimeAlertCard alert={makeAlert({ id: 'a3', status: 'accepted' })} />)
    expect(screen.queryByText('采纳建议')).toBeNull()
    expect(screen.getByText(/已采纳/)).toBeTruthy()
  })

  it('有备选方案时自动展示', () => {
    const alert = makeAlert({
      id: 'a4',
      metadata: {
        care_tip: '注意安全',
        alternatives: [{ name: '替代景点A', rating: '4.5' }],
      },
    } as any)
    render(<RealtimeAlertCard alert={alert} />)
    expect(screen.getByText('替代景点A')).toBeTruthy()
    expect(screen.getByText('4.5')).toBeTruthy()
  })
})
