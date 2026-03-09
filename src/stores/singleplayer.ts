import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { GameEngine, type Action } from '../../server/game/GameEngine';
import { PieceGenerator, type PieceType } from '../../server/game/PieceGenerator';

export const useSingleplayerStore = defineStore('singleplayer', () => {
  const engine = ref<GameEngine | null>(null);
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

  const isPlaying = computed(() => engine.value !== null && isAlive.value && !gameOver.value);

  function startGame() {
    const seed = Math.random().toString(36).substring(2, 15);
    const gen = new PieceGenerator(seed);
    const eng = new GameEngine();
    eng.spawnPiece(gen.next());

    engine.value = eng;
    generator.value = gen;
    score.value = 0;
    level.value = 1;
    linesCleared.value = 0;
    isAlive.value = true;
    gameOver.value = false;
    lastFallTime.value = Date.now();

    updateDisplayGrid();
    startGameLoop();
  }

  function updateDisplayGrid() {
    if (!engine.value) return;
    displayGrid.value = engine.value.getGridWithPiece();
    score.value = engine.value.state.score;
    level.value = engine.value.state.level;
    linesCleared.value = engine.value.state.linesCleared;
    isAlive.value = engine.value.state.isAlive;
    if (generator.value) {
      nextPieces.value = generator.value.peek(3);
    }
  }

  function startGameLoop() {
    if (gameLoopId.value !== null) return;
    const tick = () => {
      if (!engine.value || !generator.value || !isAlive.value) {
        stopGameLoop();
        return;
      }

      const now = Date.now();
      const fallInterval = engine.value.getFallInterval();

      if (now - lastFallTime.value >= fallInterval) {
        const result = engine.value.applyAction('down');
        if (result.locked) {
          const spawned = engine.value.spawnPiece(generator.value.next());
          if (!spawned) {
            isAlive.value = false;
            gameOver.value = true;
            updateDisplayGrid();
            stopGameLoop();
            return;
          }
        }
        lastFallTime.value = now;
        updateDisplayGrid();
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

  function applyAction(action: Action) {
    if (!engine.value || !generator.value || !isAlive.value) return;

    const result = engine.value.applyAction(action);
    if (result.locked) {
      const spawned = engine.value.spawnPiece(generator.value.next());
      if (!spawned) {
        isAlive.value = false;
        gameOver.value = true;
        stopGameLoop();
      }
    }
    updateDisplayGrid();
  }

  function restart() {
    stopGameLoop();
    startGame();
  }

  function reset() {
    stopGameLoop();
    engine.value = null;
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
