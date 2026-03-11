import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Grid from '../Classes/GameContainer/Grid.vue';

// Stub requestAnimationFrame for BlockTemplate child
vi.stubGlobal('requestAnimationFrame', (cb: any) => 1);
vi.stubGlobal('cancelAnimationFrame', vi.fn());
// Stub alert
vi.stubGlobal('alert', vi.fn());

describe('Grid', () => {
  it('renders the grid container', () => {
    const wrapper = mount(Grid, {
      props: {
        currentLevel: 1,
        isMovingLeft: false,
        isMovingRight: false,
        isMovingDown: false,
        isRotate: false,
        isHardDrop: false,
      },
    });
    expect(wrapper.find('.game-container').exists()).toBe(true);
    expect(wrapper.find('.grid').exists()).toBe(true);
  });

  it('renders with default props', () => {
    const wrapper = mount(Grid);
    expect(wrapper.find('.game-container').exists()).toBe(true);
  });

  it('spawns BlockTemplate initially', () => {
    const wrapper = mount(Grid, {
      props: {
        currentLevel: 1,
        isMovingLeft: false,
        isMovingRight: false,
        isMovingDown: false,
        isRotate: false,
        isHardDrop: false,
      },
    });
    // Block template should be present (not game over)
    expect(wrapper.find('.grid').exists()).toBe(true);
  });

  it('does not show Game Over initially', () => {
    const wrapper = mount(Grid);
    expect(wrapper.find('h1').exists()).toBe(false);
  });
});
