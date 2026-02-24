import type { PieceType } from './PieceGenerator';

const ROWS = 20;
const COLS = 10;

const SHAPES: Record<PieceType, number[][][]> = {
	I: [
		[[0, 0], [0, 1], [0, 2], [0, 3]],
		[[0, 0], [1, 0], [2, 0], [3, 0]],
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

export interface PlayerGameState {
	grid: number[][];
	score: number;
	level: number;
	linesCleared: number;
	currentPiece: {
		type: PieceType;
		row: number;
		col: number;
		rotation: number;
	} | null;
	isAlive: boolean;
	pieceIndex: number;
}

export type Action = 'left' | 'right' | 'down' | 'rotate' | 'drop';

function createEmptyGrid(): number[][] {
	return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

const PIECE_CODES: Record<PieceType, number> = {
	I: 1,
	O: 2,
	T: 3,
	S: 4,
	Z: 5,
	J: 6,
	L: 7,
};

export class GameEngine {
	state: PlayerGameState;

	constructor() {
		this.state = {
			grid: createEmptyGrid(),
			score: 0,
			level: 1,
			linesCleared: 0,
			currentPiece: null,
			isAlive: true,
			pieceIndex: 0,
		};
	}

  spawnPiece(type: PieceType): boolean {
    const piece = {
      type,
      row: 0,
      col: Math.floor(COLS / 2) - 1,
      rotation: 0,
    };

	if (!this.canPlace(piece.row, piece.col, piece.type, piece.rotation)) {
      this.state.isAlive = false;
      return false;
    } 

    this.state.currentPiece = piece;
    this.state.pieceIndex++;
    return true;
  }

	private getCells(row: number, col: number, type: PieceType, rotation: number): number[][] {
		const rotations = SHAPES[type];
		const shape = rotations[rotation % rotations.length];
		return shape.map(([dr, dc]) => [row + dr, col + dc]);
	}

	private canPlace(row: number, col: number, type: PieceType, rotation: number): boolean {
		const cells = this.getCells(row, col, type, rotation);
		for (const [r, c] of cells) {
		if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
		if (this.state.grid[r][c] !== 0) return false;
		}
		return true;
	}

	private lockPiece(): number {
    const p = this.state.currentPiece;
    if (!p) return 0;

    const cells = this.getCells(p.row, p.col, p.type, p.rotation);
    const code = PIECE_CODES[p.type];

    for (const [r, c] of cells) {
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
        this.state.grid[r][c] = code;
      }
    }

    this.state.currentPiece = null;

    const cleared = this.clearLines();
    return cleared;
  }

  private clearLines(): number {
    const newGrid: number[][] = [];
    let cleared = 0;

    for (let r = 0; r < ROWS; r++) {
      if (this.state.grid[r].every(cell => cell !== 0)) {
        cleared++;
      } else {
        newGrid.push(this.state.grid[r]);
      }
    }

    while (newGrid.length < ROWS) {
      newGrid.unshift(Array(COLS).fill(0));
    }

    this.state.grid = newGrid;
    this.state.linesCleared += cleared;

    const points = [0, 100, 300, 500, 800];
    this.state.score += (points[cleared] || 0) * this.state.level;

    this.state.level = Math.floor(this.state.linesCleared / 10) + 1;

    return cleared;
  }

  applyAction(action: Action): { locked: boolean; linesCleared: number } {
	console.log(`[GameEngine] Applying action: ${action}`);
    const p = this.state.currentPiece;
    if (!p || !this.state.isAlive) return { locked: false, linesCleared: 0 };

    switch (action) {
      case 'left': {
        if (this.canPlace(p.row, p.col - 1, p.type, p.rotation)) {
          p.col--;
        }
        return { locked: false, linesCleared: 0 };
      }
      case 'right': {
        if (this.canPlace(p.row, p.col + 1, p.type, p.rotation)) {
          p.col++;
        }
        return { locked: false, linesCleared: 0 };
      }
      case 'down': {
        if (this.canPlace(p.row + 1, p.col, p.type, p.rotation)) {
          p.row++;
          return { locked: false, linesCleared: 0 };
        } else {
          const cleared = this.lockPiece();
          return { locked: true, linesCleared: cleared };
        }
      }
      case 'rotate': {
        const rotations = SHAPES[p.type].length;
        const newRot = (p.rotation + 1) % rotations;
        if (this.canPlace(p.row, p.col, p.type, newRot)) {
          p.rotation = newRot;
        }
        return { locked: false, linesCleared: 0 };
      }
      case 'drop': {
        while (this.canPlace(p.row + 1, p.col, p.type, p.rotation)) {
          p.row++;
        }
        const cleared = this.lockPiece();
        return { locked: true, linesCleared: cleared };
      }
    }
  }

  addPenaltyLines(count: number): boolean {
    this.state.grid.splice(0, count);

    for (let i = 0; i < count; i++) {
      const row = Array(COLS).fill(8);
      this.state.grid.push(row);
    }

    const p = this.state.currentPiece;
    if (p && !this.canPlace(p.row, p.col, p.type, p.rotation)) {
      this.state.isAlive = false;
      return false;
    }

    return true;
  }

  getGridWithPiece(): number[][] {
    const gridCopy = this.state.grid.map(row => [...row]);
    const p = this.state.currentPiece;
    if (p) {
      const cells = this.getCells(p.row, p.col, p.type, p.rotation);
      const code = PIECE_CODES[p.type];
      for (const [r, c] of cells) {
        if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
          gridCopy[r][c] = code;
        }
      }
    }
    return gridCopy;
  }

  getFallInterval(): number {
    return Math.max(100, 1000 - (this.state.level - 1) * 80);
  }
}