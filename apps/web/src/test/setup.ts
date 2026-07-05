/**
 * Vitest 测试环境初始化
 * - 每个用例后清理 React Testing Library 渲染产物
 * - 补充 jsdom 缺失的 matchMedia / IntersectionObserver
 */
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// jsdom 不提供 matchMedia（Radix / Framer Motion 可能用到）
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom 不提供 IntersectionObserver（部分懒加载组件用到）
if (!('IntersectionObserver' in window)) {
  class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: MockIntersectionObserver,
  })
}

// 滚动方法（Radix 调用）
if (!window.scrollTo) {
  window.scrollTo = () => {}
}
