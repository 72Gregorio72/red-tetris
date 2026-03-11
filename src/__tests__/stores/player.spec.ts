import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlayerStore } from '../../stores/player';

describe('usePlayerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('starts with player = null', () => {
      const store = usePlayerStore();
      expect(store.player).toBeNull();
    });
  });

  describe('setPlayer', () => {
    it('sets the player', () => {
      const store = usePlayerStore();
      const player = {
        id: 'socket-1',
        name: 'TestPlayer',
        score: 0,
        isConnected: true,
        isAlive: true,
        isReady: false,
      };
      store.setPlayer(player);
      expect(store.player).toEqual(player);
      expect(store.player!.name).toBe('TestPlayer');
    });
  });

  describe('setReady', () => {
    it('sets isConnected on the player', () => {
      const store = usePlayerStore();
      store.setPlayer({
        id: 'p1', name: 'P1', score: 0,
        isConnected: false, isAlive: true, isReady: false,
      });
      store.setReady(true);
      expect(store.player!.isConnected).toBe(true);
    });

    it('does nothing if no player is set', () => {
      const store = usePlayerStore();
      store.setReady(true);
      expect(store.player).toBeNull();
    });
  });

  describe('updateScore', () => {
    it('updates the player score', () => {
      const store = usePlayerStore();
      store.setPlayer({
        id: 'p2', name: 'P2', score: 0,
        isConnected: true, isAlive: true, isReady: false,
      });
      store.updateScore(500);
      expect(store.player!.score).toBe(500);
    });

    it('does nothing if no player is set', () => {
      const store = usePlayerStore();
      store.updateScore(100);
      expect(store.player).toBeNull();
    });
  });

  describe('reset', () => {
    it('resets player score, isAlive, isReady to defaults', () => {
      const store = usePlayerStore();
      store.setPlayer({
        id: 'p3', name: 'P3', score: 999,
        isConnected: true, isAlive: false, isReady: true,
      });
      store.reset();
      expect(store.player!.score).toBe(0);
      expect(store.player!.isAlive).toBe(true);
      expect(store.player!.isReady).toBe(false);
    });

    it('does nothing if no player is set', () => {
      const store = usePlayerStore();
      store.reset();
      expect(store.player).toBeNull();
    });
  });
});
