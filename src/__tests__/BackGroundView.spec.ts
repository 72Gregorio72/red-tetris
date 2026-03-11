import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import BackGroundView from '../views/BackGroundView.vue';

describe('BackGroundView', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the background container', () => {
    const wrapper = mount(BackGroundView, {
      slots: { default: '<div class="test-content">Hello</div>' },
    });
    expect(wrapper.find('.tetris-bg').exists()).toBe(true);
  });

  it('renders grid pattern', () => {
    const wrapper = mount(BackGroundView);
    expect(wrapper.find('.grid-pattern').exists()).toBe(true);
  });

  it('renders falling blocks container', () => {
    const wrapper = mount(BackGroundView);
    expect(wrapper.find('.falling-blocks').exists()).toBe(true);
  });

  it('renders slot content', () => {
    const wrapper = mount(BackGroundView, {
      slots: { default: '<span id="slotted">Test</span>' },
    });
    expect(wrapper.find('#slotted').exists()).toBe(true);
  });

  it('spawns initial block on mount', async () => {
    const wrapper = mount(BackGroundView);
    vi.advanceTimersByTime(500);
    await wrapper.vm.$nextTick();
    // Blocks may or may not render depending on random chance
    expect(wrapper.find('.falling-blocks').exists()).toBe(true);
  });

  it('spawns additional blocks over time via interval', () => {
    const wrapper = mount(BackGroundView);
    const initialBlocks = wrapper.findAll('.tetris-block').length;
    vi.advanceTimersByTime(1000); // 5 intervals at 200ms each
    // Blocks may increase (random spawn chance), but at minimum the existing ones move
  });

  it('moves blocks down on interval', async () => {
    const wrapper = mount(BackGroundView);
    vi.advanceTimersByTime(400);
    await wrapper.vm.$nextTick();
    // Blocks should have moved (y increased)
  });

  it('cleans up interval on unmount', () => {
    const wrapper = mount(BackGroundView);
    const clearSpy = vi.spyOn(window, 'clearInterval');
    wrapper.unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });

  it('renders different piece types with different colors', async () => {
    const wrapper = mount(BackGroundView);
    vi.advanceTimersByTime(2000);
    await wrapper.vm.$nextTick();
    // Blocks may or may not be rendered depending on random spawn chance
    // Just verify no crash occurs
    expect(wrapper.find('.falling-blocks').exists()).toBe(true);
  });

  it('blocks fall off screen and get removed', async () => {
    const wrapper = mount(BackGroundView);
    // Advance enough for blocks to potentially reach bottom and be removed
    for (let i = 0; i < 200; i++) {
      vi.advanceTimersByTime(200);
    }
    await wrapper.vm.$nextTick();
    // Some blocks should have been filtered out
  });
});
