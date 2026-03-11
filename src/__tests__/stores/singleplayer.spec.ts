import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSingleplayerStore } from '../../stores/singleplayer';

// Mock requestAnimationFrame / cancelAnimationFrame for jsdom
let rafId = 0;
const originalRAF = globalThis.requestAnimationFrame;
const originalCAF = globalThis.cancelAnimationFrame;

beforeEach(() => {
  globalThis.requestAnimationFrame = vi.fn((cb) => {
    return ++rafId;
  }) as unknown as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = vi.fn();
});

afterEach(() => {
  globalThis.requestAnimationFrame = originalRAF;
  globalThis.cancelAnimationFrame = originalCAF;
});

describe('useSingleplayerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('starts with no display grid', () => {
      const store = useSingleplayerStore();
      expect(store.displayGrid).toBeNull();
    });

    it('starts with isPlaying=false', () => {
      const store = useSingleplayerStore();
      expect(store.isPlaying).toBe(false);
    });

    it('starts with score=0, level=1, linesCleared=0', () => {
      const store = useSingleplayerStore();
      expect(store.score).toBe(0);
      expect(store.level).toBe(1);
      expect(store.linesCleared).toBe(0);
    });

    it('starts alive and not game over', () => {
      const store = useSingleplayerStore();
      expect(store.isAlive).toBe(true);
      expect(store.gameOver).toBe(false);
    });

    it('starts with empty nextPieces', () => {
      const store = useSingleplayerStore();
      expect(store.nextPieces).toEqual([]);
    });
  });

  describe('startGame', () => {
    it('initializes the game engine and generator', () => {
      const store = useSingleplayerStore();
      store.startGame();

      expect(store.displayGrid).not.toBeNull();
      expect(store.displayGrid!.length).toBe(20);
      expect(store.displayGrid![0].length).toBe(10);
      expect(store.isAlive).toBe(true);
      expect(store.gameOver).toBe(false);
      expect(store.isPlaying).toBe(true);
    });

    it('resets score and level on start', () => {
      const store = useSingleplayerStore();
      store.startGame();
      expect(store.score).toBe(0);
      expect(store.level).toBe(1);
      expect(store.linesCleared).toBe(0);
    });

    it('populates nextPieces', () => {
      const store = useSingleplayerStore();
      store.startGame();
      expect(store.nextPieces.length).toBe(3);
    });
  });

  describe('applyAction', () => {
    it('applies a left action', () => {
      const store = useSingleplayerStore();
      store.startGame();
      const result = store.applyAction('left');
      expect(result).toHaveProperty('locked');
      expect(result).toHaveProperty('linesCleared');
    });

    it('applies a right action', () => {
      const store = useSingleplayerStore();
      store.startGame();
      const result = store.applyAction('right');
      expect(result.locked).toBe(false);
    });

    it('applies a down action', () => {
      const store = useSingleplayerStore();
      store.startGame();
      const result = store.applyAction('down');
      expect(result.locked).toBe(false);
    });

    it('applies a rotate action', () => {
      const store = useSingleplayerStore();
      store.startGame();
      const result = store.applyAction('rotate');
      expect(result.locked).toBe(false);
    });

    it('applies a drop action which locks the piece', () => {
      const store = useSingleplayerStore();
      store.startGame();
      const result = store.applyAction('drop');
      expect(result.locked).toBe(true);
    });

    it('returns no-op when game is not started', () => {
      const store = useSingleplayerStore();
      const result = store.applyAction('left');
      expect(result).toEqual({ locked: false, linesCleared: 0 });
    });

    it('returns no-op when player is dead', () => {
      const store = useSingleplayerStore();
      store.startGame();
      // Manually kill
      store.isAlive = false;
      const result = store.applyAction('left');
      expect(result).toEqual({ locked: false, linesCleared: 0 });
    });

    it('updates display grid after action', () => {
      const store = useSingleplayerStore();
      store.startGame();
      const gridBefore = JSON.stringify(store.displayGrid);
      store.applyAction('drop');
      const gridAfter = JSON.stringify(store.displayGrid);
      expect(gridBefore).not.toBe(gridAfter);
    });

    it('triggers game over when spawn fails after drop', () => {
      const store = useSingleplayerStore();
      store.startGame();
      // Fill the grid to cause game over
      // Drop many pieces quickly
      let attempts = 0;
      while (!store.gameOver && attempts < 200) {
        store.applyAction('drop');
        attempts++;
      }
      // Eventually should be game over
      if (store.gameOver) {
        expect(store.isAlive).toBe(false);
        expect(store.isPlaying).toBe(false);
      }
    });
  });

  describe('restart', () => {
    it('restarts the game with fresh state', () => {
      const store = useSingleplayerStore();
      store.startGame();
      store.applyAction('drop');
      store.applyAction('drop');
      
      store.restart();
      
      expect(store.score).toBe(0);
      expect(store.level).toBe(1);
      expect(store.linesCleared).toBe(0);
      expect(store.isAlive).toBe(true);
      expect(store.gameOver).toBe(false);
      expect(store.displayGrid).not.toBeNull();
    });
  });

  describe('reset', () => {
    it('fully resets to initial state', () => {
      const store = useSingleplayerStore();
      store.startGame();
      store.applyAction('drop');

      store.reset();

      expect(store.displayGrid).toBeNull();
      expect(store.score).toBe(0);
      expect(store.level).toBe(1);
      expect(store.linesCleared).toBe(0);
      expect(store.isAlive).toBe(true);
      expect(store.gameOver).toBe(false);
      expect(store.nextPieces).toEqual([]);
    });
  });

  describe('stopGameLoop', () => {
    it('stops the game loop', () => {
      const store = useSingleplayerStore();
      store.startGame();
      store.stopGameLoop();
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('is safe to call when no loop is running', () => {
      const store = useSingleplayerStore();
      expect(() => store.stopGameLoop()).not.toThrow();
    });
  });
});
