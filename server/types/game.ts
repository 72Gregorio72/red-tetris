
import type { IPlayer } from './player';

export type GameState = 'waiting' | 'playing' | 'finished' | 'paused';

export interface IGameState {
    grid: number[][];
    score: number;
    level: number;
    linesCleared: number;
    currentPiece: {
        type: string;
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