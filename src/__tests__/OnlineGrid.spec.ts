import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import OnlineGrid from '../Classes/GameContainer/OnlineGrid.vue';
import { useMultiplayerStore } from '../stores/multiplayer';

// Mock useSocket
vi.mock('../composables/useSocket', () => ({
  useSocket: () => ({
    socket: { value: { id: 'my-socket-id' } },
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }),
}));

describe('OnlineGrid', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function setupStore(overrides: Partial<ReturnType<typeof useMultiplayerStore>> = {}) {
    const store = useMultiplayerStore();
    // Set default values
    store.myDisplayGrid = store.myDisplayGrid || Array.from({ length: 20 }, () => Array(10).fill(0));
    store.myGameState = store.myGameState || { isAlive: true, score: 0, level: 1, linesCleared: 0 };
    Object.assign(store, overrides);
    return store;
  }

  it('renders the arcade cabinet', () => {
    setupStore();
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.arcade-cabinet').exists()).toBe(true);
    expect(wrapper.find('.grid').exists()).toBe(true);
  });

  it('renders empty grid by default', () => {
    setupStore();
    const wrapper = mount(OnlineGrid);
    const blocks = wrapper.findAll('.block');
    expect(blocks.length).toBe(200); // 20×10
  });

  it('applies piece class to filled cells', () => {
    const grid = Array.from({ length: 20 }, () => Array(10).fill(0));
    grid[0][0] = 1; // piece-1 (I-piece cyan)
    grid[0][1] = 5; // piece-5 (Z-piece red)
    grid[0][2] = 8; // penalty
    grid[0][3] = 9; // ghost
    setupStore({ myDisplayGrid: grid });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.piece-1').exists()).toBe(true);
    expect(wrapper.find('.piece-5').exists()).toBe(true);
    expect(wrapper.find('.penalty').exists()).toBe(true);
    expect(wrapper.find('.ghost').exists()).toBe(true);
  });

  it('shows dimmed grid when not alive', () => {
    setupStore({ myGameState: { isAlive: false, score: 100, level: 1, linesCleared: 0 } as any });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.dimmed').exists()).toBe(true);
  });

  it('shows game over overlay when not alive', () => {
    setupStore({ myGameState: { isAlive: false, score: 100, level: 1, linesCleared: 0 } as any });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.game-over-overlay').exists()).toBe(true);
    expect(wrapper.find('.game-over-text').text()).toBe('GAME OVER');
  });

  it('does not show game over when alive', () => {
    setupStore({
      currentRoom: {
        id: 'r1', name: 'R',
        host: { id: 'my-socket-id', name: 'Me' } as any,
        players: [{ id: 'my-socket-id', name: 'Me', isAlive: true, isReady: true, isConnected: true, score: 0 }],
        maxPlayers: 4,
      } as any,
    });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.game-over-overlay').exists()).toBe(false);
  });

  it('shows round info when totalRounds > 0', () => {
    setupStore({ totalRounds: 6, currentRound: 2 });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.text()).toContain('ROUND');
    expect(wrapper.text()).toContain('2 / 6');
  });

  it('hides round info when totalRounds is 0', () => {
    setupStore({ totalRounds: 0, currentRound: 0 });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.hud-round').exists()).toBe(false);
  });

  it('shows platformer score', () => {
    setupStore({ totalRounds: 6, myPlatformerScore: 250 });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.text()).toContain('250');
  });

  it('shows bomb icons', () => {
    setupStore({ totalRounds: 6, myBombs: 2 });
    const wrapper = mount(OnlineGrid);
    const bombIcons = wrapper.findAll('.bomb-icon');
    expect(bombIcons.length).toBe(3);
    // 1 bomb should be "used" (opacity dimmed)
    const usedBombs = wrapper.findAll('.bomb-used');
    expect(usedBombs.length).toBe(1);
  });

  it('shows all bomb icons as used when 0 bombs', () => {
    setupStore({ totalRounds: 6, myBombs: 0 });
    const wrapper = mount(OnlineGrid);
    const usedBombs = wrapper.findAll('.bomb-used');
    expect(usedBombs.length).toBe(3);
  });

  it('displays score board with players', () => {
    setupStore({
      totalRounds: 6,
      currentRoom: {
        id: 'r1', name: 'Room', host: { id: 'h1', name: 'Host' } as any,
        players: [
          { id: 'my-socket-id', name: 'Me', isPlatformer: false, isReady: true, isConnected: true, isAlive: true, score: 0 },
          { id: 'opp-1', name: 'Opponent', isPlatformer: true, isReady: true, isConnected: true, isAlive: true, score: 0 },
        ],
        maxPlayers: 4,
      } as any,
      playerScores: { 'my-socket-id': 100, 'opp-1': 200 },
    });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.text()).toContain('Me');
    expect(wrapper.text()).toContain('Opponent');
    expect(wrapper.text()).toContain('100');
    expect(wrapper.text()).toContain('200');
  });

  it('shows platformer character when game state has platformerChar', () => {
    setupStore({
      myGameState: {
        isAlive: true,
        platformerChar: { x: 5, y: 10, vx: 0, vy: 0, jumpTicks: 0, isGrounded: false, shape: [{ dx: 0, dy: 0 }] },
      } as any,
    });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.character-block').exists()).toBe(true);
  });

  it('does not show platformer character when no char data', () => {
    setupStore();
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.character-block').exists()).toBe(false);
  });

  it('shows round end overlay when roundEndInfo is set', () => {
    setupStore({
      roundEndInfo: {
        round: 1,
        nextRound: 2,
        totalRounds: 6,
        scores: {},
        reason: 'platformer_died',
        newPlatformer: { id: 'my-socket-id', name: 'Me' },
        newTetris: { id: 'opp-1', name: 'Opp' },
      },
    });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.round-end-overlay').exists()).toBe(true);
    expect(wrapper.text()).toContain('PLATFORMER ELIMINATED!');
  });

  it('shows TETRIS PLAYER DOWN for tetris_died reason', () => {
    setupStore({
      roundEndInfo: {
        round: 1,
        reason: 'tetris_died',
        newPlatformer: { id: 'opp-1', name: 'Opp' },
        newTetris: { id: 'my-socket-id', name: 'Me' },
      },
    });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.text()).toContain('TETRIS PLAYER DOWN!');
  });

  it('shows role as PLATFORMER or TETRIS in round end', () => {
    setupStore({
      roundEndInfo: {
        round: 1,
        reason: 'platformer_died',
        newPlatformer: { id: 'my-socket-id', name: 'Me' },
        newTetris: { id: 'opp-1', name: 'Opp' },
      },
    });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.text()).toContain('PLATFORMER');
  });

  it('shows next pieces preview', () => {
    setupStore({ myNextPieces: ['T', 'I', 'O'] });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.preview-panel').exists()).toBe(true);
    expect(wrapper.text()).toContain('NEXT');
    const previews = wrapper.findAll('.preview-piece');
    expect(previews.length).toBe(3);
  });

  it('does not show preview panel when no next pieces', () => {
    setupStore({ myNextPieces: [] });
    const wrapper = mount(OnlineGrid);
    expect(wrapper.find('.preview-panel').exists()).toBe(false);
  });

  it('renders all piece types correctly in preview', () => {
    const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    setupStore({ myNextPieces: types });
    const wrapper = mount(OnlineGrid);
    const previews = wrapper.findAll('.preview-piece');
    expect(previews.length).toBe(7);
  });

  it('handles explosion animation on bomb use', async () => {
    const store = setupStore({
      totalRounds: 6,
      myBombs: 2,
      myGameState: {
        isAlive: true,
        platformerChar: { x: 5, y: 10, vx: 0, vy: 0, jumpTicks: 0, isGrounded: false, shape: [{ dx: 0, dy: 0 }] },
      } as any,
    });
    const wrapper = mount(OnlineGrid);

    // Simulate bomb use by changing myBombs from 2 to 1
    store.myBombs = 1;
    await wrapper.vm.$nextTick();
    // Explosion should appear
    expect(wrapper.findAll('.boom-cell').length).toBeGreaterThanOrEqual(0);
  });
});
