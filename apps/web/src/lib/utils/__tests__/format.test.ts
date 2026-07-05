import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatDateWithWeekday,
  formatTime,
  formatDuration,
  daysBetween,
  addMinutes,
  setTimeOnDate,
  timeAgo,
  haversineDistance,
  uuid,
} from '../format'

describe('format utils', () => {
  it('formatDate: 字符串/Date 入参均输出 "M月D日"，非法日期返回空', () => {
    expect(formatDate('2026-03-05')).toBe('3月5日')
    expect(formatDate(new Date('2026-12-25T00:00:00'))).toBe('12月25日')
    expect(formatDate('not-a-date')).toBe('')
  })

  it('formatDateWithWeekday: 日期带星期（2026-07-01 为周三）', () => {
    expect(formatDateWithWeekday('2026-07-01')).toBe('7月1日 周三')
  })

  it('formatTime: ISO 转 HH:MM', () => {
    expect(formatTime('2026-07-01T09:05:00')).toBe('09:05')
  })

  it('formatDuration: 分钟数转可读时长（覆盖四类分支）', () => {
    expect(formatDuration(0)).toBe('0分钟')
    expect(formatDuration(45)).toBe('45分钟')
    expect(formatDuration(120)).toBe('2小时')
    expect(formatDuration(90)).toBe('1小时30分钟')
  })

  it('daysBetween: 含起止天数 / 同天为 1 / 非法回退 1', () => {
    expect(daysBetween('2026-07-01', '2026-07-03')).toBe(3)
    expect(daysBetween('2026-07-01', '2026-07-01')).toBe(1)
    expect(daysBetween('bad', 'date')).toBe(1)
  })

  it('addMinutes + setTimeOnDate: 时间运算与时刻合并', () => {
    const base = new Date('2026-07-01T10:00:00')
    expect(addMinutes(base, 90).toISOString()).toBe(
      new Date('2026-07-01T11:30:00').toISOString(),
    )
    const merged = setTimeOnDate('2026-07-01', '14:30')
    expect(merged.getHours()).toBe(14)
    expect(merged.getMinutes()).toBe(30)
  })

  it('timeAgo: 相对时间（刚刚 / 分钟前 / 小时前）', () => {
    expect(timeAgo(new Date())).toBe('刚刚')
    expect(timeAgo(new Date(Date.now() - 5 * 60000))).toBe('5分钟前')
    expect(timeAgo(new Date(Date.now() - 3 * 3600000))).toBe('3小时前')
  })

  it('haversineDistance: 两点距离约为 110km/度，同点为 0', () => {
    const dist = haversineDistance(39.9, 116.4, 39.1, 117.2)
    expect(dist).toBeGreaterThan(100000)
    expect(dist).toBeLessThan(120000)
    expect(haversineDistance(30, 120, 30, 120)).toBe(0)
  })

  it('uuid: 符合 v4 格式且两次不同', () => {
    const id = uuid()
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
    expect(uuid()).not.toBe(id)
  })
})
