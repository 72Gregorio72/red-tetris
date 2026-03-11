import type { PieceType } from './PieceGenerator';

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

const COLS = 10;

export class Piece {
    type: PieceType;
    row: number;
    col: number;
    rotation: number;

    constructor(type: PieceType, startCol?: number) {
        this.type = type;
        this.row = 0;
        this.col = startCol ?? Math.floor(COLS / 2) - 1;
        this.rotation = 0;
    }

    /** Get the code number associated with this piece type (used in the grid). */
    getCode(): number {
        return PIECE_CODES[this.type];
    }

    /** Get all the cell positions occupied by this piece at a given (or current) position/rotation. */
    getCells(row?: number, col?: number, rotation?: number): number[][] {
        const r = row ?? this.row;
        const c = col ?? this.col;
        const rot = rotation ?? this.rotation;
        const rotations = Piece.getRotations(this.type);
        const shape = rotations[rot % rotations.length];
        return shape.map(([dr, dc]) => [r + dr, c + dc]);
    }

    /** Get the number of rotations available for this piece type. */
    getRotationCount(): number {
        return Piece.getRotations(this.type).length;
    }

    /** Move the piece by delta row/col. Does NOT check collision — caller must verify first. */
    move(dRow: number, dCol: number): void {
        this.row += dRow;
        this.col += dCol;
    }

    /** Apply a rotation index. */
    setRotation(rotation: number): void {
        this.rotation = rotation % this.getRotationCount();
    }

    /** Get the next rotation index. */
    nextRotation(): number {
        return (this.rotation + 1) % this.getRotationCount();
    }

    /** Clone the piece (useful for hypothetical placement checks). */
    clone(): Piece {
        const p = new Piece(this.type, this.col);
        p.row = this.row;
        p.rotation = this.rotation;
        return p;
    }

    /** Static: get all rotations for a piece type. */
    static getRotations(type: PieceType): number[][][] {
        return SHAPES[type];
    }

    /** Static: get the code for a piece type. */
    static getCodeFor(type: PieceType): number {
        return PIECE_CODES[type];
    }

    /** Static: get all shapes (for external use). */
    static getAllShapes(): Record<PieceType, number[][][]> {
        return SHAPES;
    }
}