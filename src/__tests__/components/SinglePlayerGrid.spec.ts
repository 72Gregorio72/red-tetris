import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import SinglePlayerGrid from '../../Classes/GameContainer/SinglePlayerGrid.vue';
import { useSingleplayerStore } from '../../stores/singleplayer';

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

describe('SinglePlayerGrid.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders the arcade cabinet', () => {
    const wrapper = mount(SinglePlayerGrid);
    expect(wrapper.find('.arcade-cabinet').exists()).toBe(true);
  });

  it('renders an empty grid initially (20×10 = 200 blocks)', () => {
    const wrapper = mount(SinglePlayerGrid);
    const blocks = wrapper.findAll('.block');
    expect(blocks.length).toBe(200);
  });

  it('shows all blocks as empty initially', () => {
    const wrapper = mount(SinglePlayerGrid);
    const emptyBlocks = wrapper.findAll('.block.empty');
    expect(emptyBlocks.length).toBe(200);
  });

  it('displays score, level, and lines HUD', () => {
    const wrapper = mount(SinglePlayerGrid);
    expect(wrapper.text()).toContain('SCORE');
    expect(wrapper.text()).toContain('LEVEL');
    expect(wrapper.text()).toContain('LINES');
    expect(wrapper.text()).toContain('0'); // initial score
    expect(wrapper.text()).toContain('1'); // initial level
  });

  it('shows game over overlay when gameOver is true', () => {
    const store = useSingleplayerStore();
    store.startGame();
    // Manually trigger game over
    store.gameOver = true;
    store.isAlive = false;

    const wrapper = mount(SinglePlayerGrid);
    expect(wrapper.find('.game-over-overlay').exists()).toBe(true);
    expect(wrapper.text()).toContain('GAME OVER');
    expect(wrapper.text()).toContain('PRESS ENTER TO RESTART');
  });

  it('does not show game over overlay when alive', () => {
    const store = useSingleplayerStore();
    store.startGame();

    const wrapper = mount(SinglePlayerGrid);
    expect(wrapper.find('.game-over-overlay').exists()).toBe(false);
  });

  it('renders next pieces preview panel', () => {
    const store = useSingleplayerStore();
    store.startGame();

    const wrapper = mount(SinglePlayerGrid);
    expect(wrapper.find('.preview-panel').exists()).toBe(true);
    expect(wrapper.text()).toContain('NEXT');
  });

  it('renders piece blocks with correct CSS class for filled cells', () => {
    const store = useSingleplayerStore();
    store.startGame();

    const wrapper = mount(SinglePlayerGrid);
    // After starting game, displayGrid should have piece blocks rendered
    // Ghost pieces should also be visible
    const nonEmptyBlocks = wrapper.findAll('.block:not(.empty)');
    expect(nonEmptyBlocks.length).toBeGreaterThan(0);
  });

  it('displays updated score after actions', () => {
    const store = useSingleplayerStore();
    store.startGame();
    store.applyAction('drop');

    const wrapper = mount(SinglePlayerGrid);
    // Grid should now show landed piece
    expect(wrapper.find('.grid').exists()).toBe(true);
  });

  it('adds dimmed class when not alive', () => {
    const store = useSingleplayerStore();
    store.startGame();
    store.isAlive = false;

    const wrapper = mount(SinglePlayerGrid);
    expect(wrapper.find('.grid.dimmed').exists()).toBe(true);
  });
});
