import type { PieceType } from './PieceGenerator';
import { Piece } from './Piece';

const ROWS = 20;
const COLS = 10;

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
    platformerChar: {
        x: number;
        y: number;
        vx: number;
        vy: number;
        jumpTicks: number;
        isGrounded: boolean;
        shape: { dx: number; dy: number }[];
    } | null;
}

export type Action = 'left' | 'right' | 'down' | 'rotate' | 'drop';

function createEmptyGrid(): number[][] {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(0));
}

export class GameEngine {
    state: PlayerGameState;
    private currentPieceObj: Piece | null = null;

    constructor() {
        this.state = {
            grid: createEmptyGrid(),
            score: 0,
            level: 1,
            linesCleared: 0,
            currentPiece: null,
            isAlive: true,
            pieceIndex: 0,
            platformerChar: null,
        };
    }

    spawnPiece(type: PieceType): boolean {
        const piece = new Piece(type);

        if (!this.canPlace(piece.row, piece.col, piece)) {
            this.state.isAlive = false;
            return false;
        }

        this.currentPieceObj = piece;
        this.syncPieceToState();
        this.state.pieceIndex++;
        return true;
    }

    private syncPieceToState(): void {
        if (this.currentPieceObj) {
            this.state.currentPiece = {
                type: this.currentPieceObj.type,
                row: this.currentPieceObj.row,
                col: this.currentPieceObj.col,
                rotation: this.currentPieceObj.rotation,
            };
        } else {
            this.state.currentPiece = null;
        }
    }

    private getCells(row: number, col: number, piece: Piece, rotation?: number): number[][] {
        return piece.getCells(row, col, rotation);
    }

    private canPlace(row: number, col: number, piece: Piece, rotation?: number): boolean {
        const cells = this.getCells(row, col, piece, rotation);
        for (const [r, c] of cells) {
            if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
            if (this.state.grid[r][c] !== 0) return false;
        }
        return true;
    }

    private lockPiece(): number {
        const piece = this.currentPieceObj;
        if (!piece) return 0;

        const cells = piece.getCells();
        const code = piece.getCode();

        for (const [r, c] of cells) {
            if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                this.state.grid[r][c] = code;
            }
        }

        this.currentPieceObj = null;
        this.syncPieceToState();

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

    reset(): void {
        this.state = {
            grid: createEmptyGrid(),
            score: 0,
            level: 1,
            linesCleared: 0,
            currentPiece: null,
            isAlive: true,
            pieceIndex: 0,
            platformerChar: null,
        };
        this.currentPieceObj = null;
    }

    applyAction(action: Action): { locked: boolean; linesCleared: number } {
        console.log(`[GameEngine] Applying action: ${action}`);
        const piece = this.currentPieceObj;
        if (!piece || !this.state.isAlive) return { locked: false, linesCleared: 0 };

        switch (action) {
            case 'left': {
                if (this.canPlace(piece.row, piece.col - 1, piece)) {
                    piece.move(0, -1);
                }
                this.syncPieceToState();
                return { locked: false, linesCleared: 0 };
            }
            case 'right': {
                if (this.canPlace(piece.row, piece.col + 1, piece)) {
                    piece.move(0, 1);
                }
                this.syncPieceToState();
                return { locked: false, linesCleared: 0 };
            }
            case 'down': {
                if (this.canPlace(piece.row + 1, piece.col, piece)) {
                    piece.move(1, 0);
                    this.syncPieceToState();
                    return { locked: false, linesCleared: 0 };
                } else {
                    const cleared = this.lockPiece();
                    return { locked: true, linesCleared: cleared };
                }
            }
            case 'rotate': {
                const newRot = piece.nextRotation();
                const kicks: [number, number][] = [
                    [0, 0], [0, -1], [0, 1], [0, -2], [0, 2], [1, 0],
                ];
                for (const [dr, dc] of kicks) {
                    if (this.canPlace(piece.row + dr, piece.col + dc, piece, newRot)) {
                        piece.move(dr, dc);
                        piece.setRotation(newRot);
                        break;
                    }
                }
                this.syncPieceToState();
                return { locked: false, linesCleared: 0 };
            }
            case 'drop': {
                while (this.canPlace(piece.row + 1, piece.col, piece)) {
                    piece.move(1, 0);
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

        const piece = this.currentPieceObj;
        if (piece && !this.canPlace(piece.row, piece.col, piece)) {
            this.state.isAlive = false;
            return false;
        }

        return true;
    }

    addRisingLine(_gapCount: number = 1): boolean {
        this.state.grid.pop();
        this.state.grid.unshift(Array(COLS).fill(0));

        const piece = this.currentPieceObj;
        if (piece) {
            piece.move(1, 0);
            if (piece.row >= ROWS || !this.canPlace(piece.row, piece.col, piece)) {
                piece.move(-1, 0);
            }
            this.syncPieceToState();
        }

        return true;
    }

    clearCell(targetX: number, targetY: number): void {
        if (!this.state.platformerChar) return;

        this.state.grid[targetY][targetX] = 0;
        const piece = this.currentPieceObj;
        if (piece) {
            const cells = piece.getCells();
            for (const [r, c] of cells) {
                if (r === targetY && c === targetX) {
                    this.state.grid[r][c] = 0;
                }
            }
        }
    }

    getGridWithPiece(): number[][] {
        const gridCopy = this.state.grid.map(row => [...row]);
        const piece = this.currentPieceObj;
        if (piece) {
            let ghostRow = piece.row;
            while (this.canPlace(ghostRow + 1, piece.col, piece)) {
                ghostRow++;
            }
            if (ghostRow !== piece.row) {
                const ghostCells = piece.getCells(ghostRow, piece.col);
                for (const [r, c] of ghostCells) {
                    if (r >= 0 && r < ROWS && c >= 0 && c < COLS && gridCopy[r][c] === 0) {
                        gridCopy[r][c] = 9;
                    }
                }
            }

            const cells = piece.getCells();
            const code = piece.getCode();
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