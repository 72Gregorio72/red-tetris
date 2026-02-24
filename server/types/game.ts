
import type { IPlayer } from './player';

export type GameState = 'waiting' | 'playing' | 'finished' | 'paused';

export interface IGameState {
	grid: number[][];
	score: number;
	level: number;
	linesCleared: number;
	currentPiece: string | null;
	nextPiece: string | null;
	holdPiece: string | null;
	canHold: boolean;
	players: IPlayer[];
}