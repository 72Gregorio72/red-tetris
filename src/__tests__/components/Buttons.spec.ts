import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import Buttons from '../../Style/Buttons.vue';

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

describe('Buttons.vue', () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    setActivePinia(createPinia());
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/game', component: { template: '<div>Game</div>' } },
        { path: '/lobby', component: { template: '<div>Lobby</div>' } },
      ],
    });
  });

  it('renders play and multiplayer buttons', () => {
    const wrapper = mount(Buttons, {
      global: { plugins: [createPinia(), router] },
    });
    expect(wrapper.find('.play-button').exists()).toBe(true);
    expect(wrapper.find('.multi-button').exists()).toBe(true);
  });

  it('renders button images', () => {
    const wrapper = mount(Buttons, {
      global: { plugins: [createPinia(), router] },
    });
    const playImg = wrapper.find('.play-image');
    expect(playImg.exists()).toBe(true);
    expect(playImg.attributes('alt')).toBe('play');

    const multiImg = wrapper.find('.multiplayer-image');
    expect(multiImg.exists()).toBe(true);
    expect(multiImg.attributes('alt')).toBe('multiplayer');
  });

  it('navigates to /game on play button click', async () => {
    const wrapper = mount(Buttons, {
      global: { plugins: [createPinia(), router] },
    });
    await router.isReady();
    await wrapper.find('.play-button').trigger('click');
    // Wait for setTimeout
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(router.currentRoute.value.path).toBe('/game');
  });

  it('navigates to /lobby on multiplayer button click', async () => {
    const wrapper = mount(Buttons, {
      global: { plugins: [createPinia(), router] },
    });
    await router.isReady();
    await wrapper.find('.multi-button').trigger('click');
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(router.currentRoute.value.path).toBe('/lobby');
  });

  it('prevents double click on play button', async () => {
    const wrapper = mount(Buttons, {
      global: { plugins: [createPinia(), router] },
    });
    await router.isReady();
    // Click twice
    await wrapper.find('.play-button').trigger('click');
    await wrapper.find('.play-button').trigger('click');
    // Should still navigate correctly
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(router.currentRoute.value.path).toBe('/game');
  });
});
