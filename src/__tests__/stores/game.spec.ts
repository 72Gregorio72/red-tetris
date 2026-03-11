import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../stores/game';

describe('useGameStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('starts with a 20×10 empty grid', () => {
      const store = useGameStore();
      expect(store.grid.length).toBe(20);
      expect(store.grid[0].length).toBe(10);
      expect(store.grid.every(row => row.every(cell => cell === 0))).toBe(true);
    });

    it('starts with score=0, level=1, linesCleared=0', () => {
      const store = useGameStore();
      expect(store.score).toBe(0);
      expect(store.level).toBe(1);
      expect(store.linesCleared).toBe(0);
    });

    it('starts with status=waiting', () => {
      const store = useGameStore();
      expect(store.status).toBe('waiting');
    });

    it('starts with pendingAttackLines=0', () => {
      const store = useGameStore();
      expect(store.pendingAttackLines).toBe(0);
    });
  });

  describe('setGrid', () => {
    it('replaces the grid', () => {
      const store = useGameStore();
      const newGrid = Array.from({ length: 20 }, () => Array(10).fill(1));
      store.setGrid(newGrid);
      expect(store.grid).toEqual(newGrid);
      expect(store.grid[0][0]).toBe(1);
    });
  });

  describe('setStatus', () => {
    it('changes the game status', () => {
      const store = useGameStore();
      store.setStatus('playing');
      expect(store.status).toBe('playing');
    });

    it('can set to finished', () => {
      const store = useGameStore();
      store.setStatus('finished');
      expect(store.status).toBe('finished');
    });
  });

  describe('updateState', () => {
    it('updates grid, score, level, linesCleared from IGameState', () => {
      const store = useGameStore();
      const newGrid = Array.from({ length: 20 }, () => Array(10).fill(5));
      store.updateState({
        grid: newGrid,
        score: 1000,
        level: 5,
        linesCleared: 40,
        currentPiece: null,
        nextPiece: null,
        holdPiece: null,
        canHold: true,
        players: [],
      });
      expect(store.grid).toEqual(newGrid);
      expect(store.score).toBe(1000);
      expect(store.level).toBe(5);
      expect(store.linesCleared).toBe(40);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      const store = useGameStore();
      store.setStatus('playing');
      store.setGrid(Array.from({ length: 20 }, () => Array(10).fill(3)));
      store.receiveAttack(5);

      store.reset();

      expect(store.score).toBe(0);
      expect(store.level).toBe(1);
      expect(store.linesCleared).toBe(0);
      expect(store.status).toBe('waiting');
      expect(store.grid.every(row => row.every(cell => cell === 0))).toBe(true);
    });
  });

  describe('attack system', () => {
    it('receiveAttack accumulates lines', () => {
      const store = useGameStore();
      store.receiveAttack(2);
      expect(store.pendingAttackLines).toBe(2);
      store.receiveAttack(3);
      expect(store.pendingAttackLines).toBe(5);
    });

    it('consumeAttackLines returns and resets pending lines', () => {
      const store = useGameStore();
      store.receiveAttack(4);
      const lines = store.consumeAttackLines();
      expect(lines).toBe(4);
      expect(store.pendingAttackLines).toBe(0);
    });

    it('consumeAttackLines returns 0 when no pending attacks', () => {
      const store = useGameStore();
      const lines = store.consumeAttackLines();
      expect(lines).toBe(0);
    });
  });
});
