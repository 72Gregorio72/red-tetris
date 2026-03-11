/**
 * Pure functions for client-side Tetris game logic.
 *
 * Every function here is pure: it takes state as input and returns
 * a new state as output, without mutating any argument.
 */
import type { GameState, PieceState, ActionResult, Action, PieceType } from './types';

const ROWS = 20;
const COLS = 10;

// ─── Shape data (identical to server/game/Piece.ts) ───

const SHAPES: Record<PieceType, number[][][]> = {
	I: [
		[[0, 0], [0, 1], [0, 2], [0, 3]],
		[[-1, 2], [0, 2], [1, 2], [2, 2]],
	],
	O: [
		[[0, 0], [0, 1], [1, 0], [1, 1]],
	],
	T: [
		[[0, 0], [0, 1], [0, 2], [1, 1]],
		[[0, 1], [1, 0], [1, 1], [2, 1]],
		[[1, 0], [1, 1], [1, 2], [0, 1]],
		[[0, 0], [1, 0], [2, 0], [1, 1]],
	],
	S: [
		[[0, 1], [0, 2], [1, 0], [1, 1]],
		[[0, 0], [1, 0], [1, 1], [2, 1]],
	],
	Z: [
		[[0, 0], [0, 1], [1, 1], [1, 2]],
		[[0, 1], [1, 0], [1, 1], [2, 0]],
	],
	J: [
		[[0, 0], [1, 0], [2, 0], [2, 1]],
		[[0, 0], [0, 1], [0, 2], [1, 0]],
		[[0, 0], [0, 1], [1, 1], [2, 1]],
		[[0, 2], [1, 0], [1, 1], [1, 2]],
	],
	L: [
		[[0, 1], [1, 1], [2, 0], [2, 1]],
		[[0, 0], [1, 0], [1, 1], [1, 2]],
		[[0, 0], [0, 1], [1, 0], [2, 0]],
		[[0, 0], [0, 1], [0, 2], [1, 2]],
	],
};

const PIECE_CODES: Record<PieceType, number> = {
	I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7,
};

// ─── Pure helper functions ───

function cloneGrid(grid: number[][]): number[][] {
	return grid.map(row => [...row]);
}

export function createEmptyGrid(): number[][] {
	return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export function createInitialState(): GameState {
	return {
		grid: createEmptyGrid(),
		score: 0,
		level: 1,
		linesCleared: 0,
		currentPiece: null,
		isAlive: true,
		pieceIndex: 0,
	};
}

export function getPieceCells(
	piece: PieceState,
	row?: number,
	col?: number,
	rotation?: number,
): number[][] {
	const r = row ?? piece.row;
	const c = col ?? piece.col;
	const rot = rotation ?? piece.rotation;
	const rotations = SHAPES[piece.type];
	const shape = rotations[rot % rotations.length]!;
	return shape.map(offset => [r + offset[0]!, c + offset[1]!]);
}

export function getPieceCode(type: PieceType): number {
	return PIECE_CODES[type] ?? 0;
}

function getRotationCount(type: PieceType): number {
	return SHAPES[type]?.length ?? 0;
}

function canPlace(
	grid: number[][],
	piece: PieceState,
	row?: number,
	col?: number,
	rotation?: number,
): boolean {
	const cells = getPieceCells(piece, row, col, rotation);
	for (const cell of cells) {
		const r = cell[0]!;
		const c = cell[1]!;
		if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
		if (grid[r]![c]! !== 0) return false;
	}
	return true;
}

// ─── Core pure functions ───

/**
 * Spawn a new piece into the game state. Returns updated state.
 * If the piece cannot be placed, isAlive is set to false.
 */
export function spawnPiece(state: GameState, type: PieceType): GameState {
	const startCol = Math.floor(COLS / 2) - 1; // 4, same as Piece constructor
	const newPiece: PieceState = {
		type,
		row: 0,
		col: startCol,
		rotation: 0,
	};

	if (!canPlace(state.grid, newPiece)) {
		return {
			...state,
			currentPiece: null,
			isAlive: false,
			pieceIndex: state.pieceIndex + 1,
		};
	}

	return {
		...state,
		currentPiece: newPiece,
		pieceIndex: state.pieceIndex + 1,
	};
}

/**
 * Lock the current piece into the grid and return the new state.
 */
function lockPiece(state: GameState): GameState {
	const piece = state.currentPiece;
	if (!piece) return state;

	const newGrid = cloneGrid(state.grid);
	const code = getPieceCode(piece.type);
	const cells = getPieceCells(piece);

	for (const cell of cells) {
		const r = cell[0]!;
		const c = cell[1]!;
		if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
			newGrid[r]![c] = code;
		}
	}

	return {
		...state,
		grid: newGrid,
		currentPiece: null,
	};
}

/**
 * Clear completed lines and update score/level. Returns new state
 * and the number of lines that were cleared.
 */
function clearLines(state: GameState): { state: GameState; linesCleared: number } {
	const newGrid: number[][] = [];
	let cleared = 0;

	for (let r = 0; r < ROWS; r++) {
		if (state.grid[r]!.every(cell => cell !== 0)) {
			cleared++;
		} else {
			newGrid.push([...state.grid[r]!]);
		}
	}

	if (cleared === 0) {
		return { state, linesCleared: 0 };
	}

	while (newGrid.length < ROWS) {
		newGrid.unshift(Array(COLS).fill(0));
	}

	const totalLines = state.linesCleared + cleared;
	const newLevel = Math.floor(totalLines / 10) + 1;

	const points = [0, 100, 300, 500, 800];
	const scoreGain = (points[cleared] || 0) * state.level;

	return {
		state: {
			...state,
			grid: newGrid,
			score: state.score + scoreGain,
			level: newLevel,
			linesCleared: totalLines,
		},
		linesCleared: cleared,
	};
}

/**
 * Move the current piece by (dRow, dCol). If moving down and blocked,
 * locks the piece and clears lines.
 */
function movePiece(state: GameState, dRow: number, dCol: number): ActionResult {
	const piece = state.currentPiece;
	if (!piece) return { state, locked: false, linesCleared: 0 };

	const newRow = piece.row + dRow;
	const newCol = piece.col + dCol;

	if (canPlace(state.grid, piece, newRow, newCol)) {
		return {
			state: {
				...state,
				currentPiece: { ...piece, row: newRow, col: newCol },
			},
			locked: false,
			linesCleared: 0,
		};
	}

	// Moving down and blocked → lock
	if (dRow > 0) {
		const locked = lockPiece(state);
		const cleared = clearLines(locked);
		return {
			state: cleared.state,
			locked: true,
			linesCleared: cleared.linesCleared,
		};
	}

	// Horizontal move blocked — no change
	return { state, locked: false, linesCleared: 0 };
}

/**
 * Rotate the current piece. Applies wall-kick offsets if needed.
 */
function rotatePiece(state: GameState): ActionResult {
	const piece = state.currentPiece;
	if (!piece) return { state, locked: false, linesCleared: 0 };

	const nextRot = (piece.rotation + 1) % getRotationCount(piece.type);

	// Wall-kick offsets (same as GameEngine)
	const kicks: [number, number][] = [
		[0, 0], [0, -1], [0, 1], [0, -2], [0, 2], [1, 0],
	];

	for (const [dr, dc] of kicks) {
		if (canPlace(state.grid, piece, piece.row + dr, piece.col + dc, nextRot)) {
			return {
				state: {
					...state,
					currentPiece: {
						...piece,
						row: piece.row + dr,
						col: piece.col + dc,
						rotation: nextRot,
					},
				},
				locked: false,
				linesCleared: 0,
			};
		}
	}

	// No valid rotation found — no change
	return { state, locked: false, linesCleared: 0 };
}

/**
 * Hard-drop the piece to the lowest valid position, lock, and clear lines.
 */
function hardDrop(state: GameState): ActionResult {
	const piece = state.currentPiece;
	if (!piece) return { state, locked: false, linesCleared: 0 };

	let dropRow = piece.row;
	while (canPlace(state.grid, piece, dropRow + 1, piece.col)) {
		dropRow++;
	}

	const droppedState: GameState = {
		...state,
		currentPiece: { ...piece, row: dropRow },
	};

	const locked = lockPiece(droppedState);
	const cleared = clearLines(locked);

	return {
		state: cleared.state,
		locked: true,
		linesCleared: cleared.linesCleared,
	};
}

// ─── Main action dispatcher (pure) ───

/**
 * Apply a player action to the game state. Returns a new state
 * plus metadata about whether the piece locked and how many lines cleared.
 */
export function applyAction(state: GameState, action: Action): ActionResult {
	if (!state.isAlive || !state.currentPiece) {
		return { state, locked: false, linesCleared: 0 };
	}

	switch (action) {
		case 'left':
			return movePiece(state, 0, -1);
		case 'right':
			return movePiece(state, 0, 1);
		case 'down':
			return movePiece(state, 1, 0);
		case 'rotate':
			return rotatePiece(state);
		case 'drop':
			return hardDrop(state);
		default:
			return { state, locked: false, linesCleared: 0 };
	}
}

// ─── Grid with piece overlay for display (pure) ───

/**
 * Build a display grid that includes the locked cells, a ghost piece
 * (code 9), and the current piece.
 */
export function getGridWithPiece(state: GameState): number[][] {
	const grid = cloneGrid(state.grid);
	const piece = state.currentPiece;
	if (!piece) return grid;

	// Ghost piece
	let ghostRow = piece.row;
	while (canPlace(state.grid, piece, ghostRow + 1, piece.col)) {
		ghostRow++;
	}
	if (ghostRow !== piece.row) {
		const ghostCells = getPieceCells(piece, ghostRow, piece.col);
		for (const cell of ghostCells) {
			const r = cell[0]!;
			const c = cell[1]!;
			if (r >= 0 && r < ROWS && c >= 0 && c < COLS && grid[r]![c]! === 0) {
				grid[r]![c] = 9;
			}
		}
	}

	// Active piece
	const code = getPieceCode(piece.type);
	const cells = getPieceCells(piece);
	for (const cell of cells) {
		const r = cell[0]!;
		const c = cell[1]!;
		if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
			grid[r]![c] = code;
		}
	}

	return grid;
}

// ─── Fall interval calculation (pure) ───

/**
 * Calculate the fall interval in milliseconds for a given level.
 * Matches the server-side GameEngine.getFallInterval().
 */
export function getFallInterval(level: number): number {
	return Math.max(100, 1000 - (level - 1) * 80);
}
