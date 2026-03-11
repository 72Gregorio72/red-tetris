import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Player from '../Classes/Player/Player.vue';

// Stub globals
vi.stubGlobal('requestAnimationFrame', (cb: any) => 1);
vi.stubGlobal('cancelAnimationFrame', vi.fn());
vi.stubGlobal('alert', vi.fn());

describe('Player', () => {
  it('renders player info', () => {
    const wrapper = mount(Player);
    expect(wrapper.find('.player-info').exists()).toBe(true);
    expect(wrapper.text()).toContain('Player 1');
    expect(wrapper.text()).toContain('Score');
    expect(wrapper.text()).toContain('Level');
  });

  it('handles keydown events', async () => {
    const wrapper = mount(Player, { attachTo: document.body });
    await window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp' }));
    await window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    wrapper.unmount();
  });

  it('handles keyup events', async () => {
    const wrapper = mount(Player, { attachTo: document.body });
    await window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    await window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
    await window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    await window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight' }));
    await window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    await window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown' }));
    await window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp' }));
    await window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowUp', key: 'ArrowUp' }));
    await window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    await window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }));
    wrapper.unmount();
  });

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const wrapper = mount(Player, { attachTo: document.body });
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    removeSpy.mockRestore();
  });
});
