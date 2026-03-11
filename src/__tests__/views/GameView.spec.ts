import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import GameView from '../../views/GameView.vue';

// Mock Audio as a class constructor
class MockAudio {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  volume = 0;
  currentTime = 0;
  duration = 100;
  paused = true;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}
globalThis.Audio = MockAudio as any;

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((cb) => 1) as any;
globalThis.cancelAnimationFrame = vi.fn();

describe('GameView.vue', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    setActivePinia(createPinia());
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/game', component: GameView },
      ],
    });
  });

  it('renders without crashing', () => {
    const wrapper = mount(GameView, {
      global: { plugins: [createPinia(), router] },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('has a game-container class', () => {
    const wrapper = mount(GameView, {
      global: { plugins: [createPinia(), router] },
    });
    expect(wrapper.find('.game-container').exists()).toBe(true);
  });
});
