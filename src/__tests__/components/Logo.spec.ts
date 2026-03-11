import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import Logo from '../../Style/Logo.vue';

describe('Logo.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the title container', () => {
    const wrapper = mount(Logo);
    expect(wrapper.find('.title-container').exists()).toBe(true);
  });

  it('renders the logo image', () => {
    const wrapper = mount(Logo);
    const img = wrapper.find('.title-image');
    expect(img.exists()).toBe(true);
    expect(img.attributes('alt')).toBe('Red Tetris');
  });

  it('starts invisible and transitions to visible', async () => {
    vi.useFakeTimers();
    const wrapper = mount(Logo);
    
    // Initially no visible class
    expect(wrapper.find('.title-visible').exists()).toBe(false);
    
    vi.advanceTimersByTime(200);
    await wrapper.vm.$nextTick();
    
    expect(wrapper.find('.title-visible').exists()).toBe(true);
    vi.useRealTimers();
  });
});
