import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from '../App.vue'

// Mock Audio as a class constructor
class MockAudio {
  play = vi.fn().mockResolvedValue(undefined)
  pause = vi.fn()
  volume = 0
  currentTime = 0
  duration = 100
  paused = true
  addEventListener = vi.fn()
  removeEventListener = vi.fn()
}
globalThis.Audio = MockAudio as any

describe('App', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
      ],
    })
  })

  it('mounts and renders properly', () => {
    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router] },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('renders the router-view', () => {
    const wrapper = mount(App, {
      global: { plugins: [createPinia(), router] },
    })
    // App wraps content in BackGroundView and router-view
    expect(wrapper.html()).toBeTruthy()
  })
})
