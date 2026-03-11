import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import MainMenu from '../../views/MainMenu.vue';

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

describe('MainMenu.vue', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    setActivePinia(createPinia());
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: MainMenu },
        { path: '/game', component: { template: '<div>Game</div>' } },
        { path: '/lobby', component: { template: '<div>Lobby</div>' } },
      ],
    });
  });

  it('renders without crashing', () => {
    const wrapper = mount(MainMenu, {
      global: { plugins: [createPinia(), router] },
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('contains the menu container', () => {
    const wrapper = mount(MainMenu, {
      global: { plugins: [createPinia(), router] },
    });
    expect(wrapper.find('.main-menu-page').exists()).toBe(true);
    expect(wrapper.find('.menu-container').exists()).toBe(true);
  });

  it('renders the Buttons component', () => {
    const wrapper = mount(MainMenu, {
      global: { plugins: [createPinia(), router] },
    });
    // Buttons component renders button elements
    expect(wrapper.find('.button-container').exists()).toBe(true);
  });

  it('renders menu holder image', () => {
    const wrapper = mount(MainMenu, {
      global: { plugins: [createPinia(), router] },
    });
    const img = wrapper.find('.menu-holder-image');
    expect(img.exists()).toBe(true);
    expect(img.attributes('alt')).toBe('Menu Holder');
  });
});
