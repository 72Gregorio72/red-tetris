import type { IPlayer } from '../types/player';

export class Player {
    id: string;
    name: string;
    score: number;
    isConnected: boolean;
    isAlive: boolean;
    isReady: boolean;
    isPlatformer: boolean;
    life: number;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.score = 0;
        this.isConnected = true;
        this.isAlive = true;
        this.isReady = false;
        this.isPlatformer = false;
        this.life = 0;
    }

    reset(): void {
        this.score = 0;
        this.isReady = false;
        this.isAlive = true;
    }

    setReady(ready: boolean): void {
        this.isReady = ready;
    }

    setAlive(alive: boolean): void {
        this.isAlive = alive;
    }

    setPlatformer(isPlatformer: boolean): void {
        this.isPlatformer = isPlatformer;
    }

    addScore(points: number): void {
        this.score += points;
    }

    disconnect(): void {
        this.isConnected = false;
    }

    reconnect(): void {
        this.isConnected = true;
    }

    toJSON(): IPlayer {
        return {
            id: this.id,
            name: this.name,
            score: this.score,
            isConnected: this.isConnected,
            isAlive: this.isAlive,
            isReady: this.isReady,
            isPlatformer: this.isPlatformer,
            life: this.life,
        };
    }
}