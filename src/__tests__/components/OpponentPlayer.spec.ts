import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import OpponentPlayer from '../../Classes/Player/OpponentPlayer.vue';
import { useMultiplayerStore } from '../../stores/multiplayer';
import type { IPlayer } from '../../../server/types/player';

function makePlayer(id: string, name: string): IPlayer {
  return {
    id, name, score: 0, isConnected: true, isAlive: true, isReady: false, isPlatformer: false, life: 0,
  };
}

describe('OpponentPlayer.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('renders "Waiting for opponents..." when no opponents', () => {
    const wrapper = mount(OpponentPlayer);
    expect(wrapper.text()).toContain('Waiting for opponents...');
  });

  it('renders opponent grids when data is available', () => {
    const store = useMultiplayerStore();
    const host = makePlayer('me', 'Me');
    const opp = makePlayer('opp1', 'Opponent');
    store.joinRoom({
      id: 'r1', name: 'Room', host, players: [host, opp], gameState: null,
    });
    
    const emptyGrid = Array.from({ length: 20 }, () => Array(10).fill(0));
    store.opponentsState = [
      { id: 'opp1', state: { isAlive: true } as any, displayGrid: emptyGrid } as any,
    ];

    const wrapper = mount(OpponentPlayer);
    expect(wrapper.find('.opponents-panel').exists()).toBe(true);
    expect(wrapper.find('.opponent-name').text()).toContain('Opponent');
  });

  it('shows KO indicator when opponent is dead', () => {
    const store = useMultiplayerStore();
    const host = makePlayer('me', 'Me');
    const opp = makePlayer('opp2', 'DeadOpponent');
    store.joinRoom({
      id: 'r2', name: 'Room', host, players: [host, opp], gameState: null,
    });
    
    const emptyGrid = Array.from({ length: 20 }, () => Array(10).fill(0));
    store.opponentsState = [
      { id: 'opp2', state: { isAlive: false } as any, displayGrid: emptyGrid } as any,
    ];

    const wrapper = mount(OpponentPlayer);
    expect(wrapper.text()).toContain('(KO)');
    expect(wrapper.find('.dimmed').exists()).toBe(true);
  });

  it('renders the correct number of grid cells per opponent', () => {
    const store = useMultiplayerStore();
    const host = makePlayer('me', 'Me');
    const opp = makePlayer('opp3', 'Opp');
    store.joinRoom({
      id: 'r3', name: 'Room', host, players: [host, opp], gameState: null,
    });
    
    const emptyGrid = Array.from({ length: 20 }, () => Array(10).fill(0));
    store.opponentsState = [
      { id: 'opp3', state: { isAlive: true } as any, displayGrid: emptyGrid } as any,
    ];

    const wrapper = mount(OpponentPlayer);
    // 20 rows × 10 cells = 200 cells
    const cells = wrapper.findAll('.opponent-cell');
    expect(cells.length).toBe(200);
  });

  it('marks filled cells correctly', () => {
    const store = useMultiplayerStore();
    const host = makePlayer('me', 'Me');
    const opp = makePlayer('opp4', 'Opp');
    store.joinRoom({
      id: 'r4', name: 'Room', host, players: [host, opp], gameState: null,
    });
    
    const grid = Array.from({ length: 20 }, () => Array(10).fill(0));
    grid[19][0] = 1; // Filled
    grid[19][1] = 8; // Penalty
    store.opponentsState = [
      { id: 'opp4', state: { isAlive: true } as any, displayGrid: grid } as any,
    ];

    const wrapper = mount(OpponentPlayer);
    const filledCells = wrapper.findAll('.filled');
    const penaltyCells = wrapper.findAll('.penalty');
    expect(filledCells.length).toBe(1);
    expect(penaltyCells.length).toBe(1);
  });

  it('shows "Unknown" for unnamed opponents', () => {
    const store = useMultiplayerStore();
    const host = makePlayer('me', 'Me');
    store.joinRoom({
      id: 'r5', name: 'Room', host, players: [host], gameState: null,
    });
    
    const emptyGrid = Array.from({ length: 20 }, () => Array(10).fill(0));
    store.opponentsState = [
      { id: 'unknown-player', state: { isAlive: true } as any, displayGrid: emptyGrid } as any,
    ];

    const wrapper = mount(OpponentPlayer);
    expect(wrapper.text()).toContain('Unknown');
  });
});
