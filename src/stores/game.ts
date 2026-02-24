import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { IGameState, GameState } from '../../server/types/game';
import type { PieceType } from '../../server/game/PieceGenerator';

const ROWS = 20;
const COLS = 10;

function createEmptyGrid(): number[][] {
	return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export interface IPlayerGameSnapshot {
  grid: number[][];
  score: number;
  level: number;
  linesCleared: number;
  currentPiece: PieceType | null;
  nextPieces: PieceType[];
  isAlive: boolean;
}

export const useGameStore = defineStore('game', () => {
  const grid = ref<number[][]>(createEmptyGrid());
  const score = ref(0);
  const level = ref(1);
  const linesCleared = ref(0);
  const status = ref<GameState>('waiting');

  // Sostituisce la griglia
  function setGrid(newGrid: number[][]) {
    grid.value = newGrid;
  }

  // Cambia lo stato della partita
  function setStatus(newStatus: GameState) {
    status.value = newStatus;
  }

  function updateState(state: IGameState) {
    grid.value = state.grid;
    score.value = state.score;
    level.value = state.level;
    linesCleared.value = state.linesCleared;
  }

  function reset() {
    grid.value = createEmptyGrid();
    score.value = 0;
    level.value = 1;
    linesCleared.value = 0;
    status.value = 'waiting';
  }

  const pendingAttackLines = ref(0);

  function receiveAttack(lines: number) {
	pendingAttackLines.value += lines;
  }

  function consumeAttackLines(): number {
	const lines = pendingAttackLines.value;
	pendingAttackLines.value = 0;
	return lines;
  }

  return {
    grid, score, level, linesCleared, status, pendingAttackLines,
    setGrid, setStatus, updateState, reset, receiveAttack, consumeAttackLines,
  };
});