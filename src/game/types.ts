import type { PieceType } from '../../server/game/PieceGenerator';

export type { PieceType };

export interface PieceState {
	type: PieceType;
	row: number;
	col: number;
	rotation: number;
}

export interface GameState {
	grid: number[][];
	score: number;
	level: number;
	linesCleared: number;
	currentPiece: PieceState | null;
	isAlive: boolean;
	pieceIndex: number;
}

export interface ActionResult {
	state: GameState;
	locked: boolean;
	linesCleared: number;
}

export type Action = 'left' | 'right' | 'down' | 'rotate' | 'drop';
