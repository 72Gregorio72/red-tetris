import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { PieceGenerator, type PieceType } from '../../server/game/PieceGenerator';
import {
  createInitialState,
  spawnPiece as spawnPiecePure,
  applyAction as applyActionPure,
  getGridWithPiece,
  getFallInterval,
} from '../game/board';
import type { GameState, Action } from '../game/types';

export const useSingleplayerStore = defineStore('singleplayer', () => {
  const gameState = ref<GameState>(createInitialState());
  const generator = ref<PieceGenerator | null>(null);
  const displayGrid = ref<number[][] | null>(null);
  const score = ref(0);
  const level = ref(1);
  const linesCleared = ref(0);
  const isAlive = ref(true);
  const gameOver = ref(false);
  const gameLoopId = ref<number | null>(null);
  const lastFallTime = ref(0);
  const nextPieces = ref<PieceType[]>([]);

  const isPlaying = computed(() => generator.value !== null && isAlive.value && !gameOver.value);

  function syncFromState() {
    const state = gameState.value;
    displayGrid.value = getGridWithPiece(state);
    score.value = state.score;
    level.value = state.level;
    linesCleared.value = state.linesCleared;
    isAlive.value = state.isAlive;
    if (generator.value) {
      nextPieces.value = generator.value.peek(3);
    }
  }

  function startGame() {
    const seed = Math.random().toString(36).substring(2, 15);
    const gen = new PieceGenerator(seed);

    let state = createInitialState();
    state = spawnPiecePure(state, gen.next());

    gameState.value = state;
    generator.value = gen;
    gameOver.value = false;
    lastFallTime.value = Date.now();

    syncFromState();
    startGameLoop();
  }

  function startGameLoop() {
    if (gameLoopId.value !== null) return;
    const tick = () => {
      if (!generator.value || !isAlive.value) {
        stopGameLoop();
        return;
      }

      const now = Date.now();
      const interval = getFallInterval(gameState.value.level);

      if (now - lastFallTime.value >= interval) {
        const result = applyActionPure(gameState.value, 'down');
        let newState = result.state;

        if (result.locked) {
          newState = spawnPiecePure(newState, generator.value.next());
          if (!newState.isAlive) {
            gameState.value = newState;
            gameOver.value = true;
            syncFromState();
            stopGameLoop();
            return;
          }
        }

        gameState.value = newState;
        lastFallTime.value = now;
        syncFromState();
      }

      gameLoopId.value = requestAnimationFrame(tick);
    };
    gameLoopId.value = requestAnimationFrame(tick);
  }

  function stopGameLoop() {
    if (gameLoopId.value !== null) {
      cancelAnimationFrame(gameLoopId.value);
      gameLoopId.value = null;
    }
  }

  function applyAction(action: Action): { locked: boolean; linesCleared: number } {
    if (!generator.value || !isAlive.value) return { locked: false, linesCleared: 0 };

    const result = applyActionPure(gameState.value, action);
    let newState = result.state;

    if (result.locked) {
      newState = spawnPiecePure(newState, generator.value.next());
      if (!newState.isAlive) {
        gameState.value = newState;
        gameOver.value = true;
        syncFromState();
        stopGameLoop();
        return { locked: result.locked, linesCleared: result.linesCleared };
      }
    }

    gameState.value = newState;
    syncFromState();
    return { locked: result.locked, linesCleared: result.linesCleared };
  }

  function restart() {
    stopGameLoop();
    startGame();
  }

  function reset() {
    stopGameLoop();
    gameState.value = createInitialState();
    generator.value = null;
    displayGrid.value = null;
    score.value = 0;
    level.value = 1;
    linesCleared.value = 0;
    isAlive.value = true;
    gameOver.value = false;
    nextPieces.value = [];
  }

  return {
    displayGrid, score, level, linesCleared, isAlive, gameOver, isPlaying, nextPieces,
    startGame, applyAction, restart, reset, stopGameLoop,
  };
});
