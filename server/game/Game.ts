import { GameEngine, type Action } from './GameEngine';
import { PieceGenerator } from './PieceGenerator';
import { Player } from './Player';
import type { Server } from 'socket.io';

const INITIAL_BOMBS = 3;
const ROUND_END_PAUSE_MS = 3000;
const SCORE_INCREMENT_INTERVAL = 1000;
const SCORE_POINTS_PER_TICK = 10;
const RISING_LINE_INTERVAL = 6000;
const RISING_GAP_SIZE = 0;

export class Game {
    roomId: string;
    players: Player[];
    mode: 'normal' | 'shared';
    seed: string;
    currentRound: number;
    totalRounds: number;
    isPaused: boolean;
    isRunning: boolean;

    private engines: Map<string, GameEngine> = new Map();
    private generators: Map<string, PieceGenerator> = new Map();
    private lastFall: Map<string, number> = new Map();
    private lastPlatformerFall: Map<string, number> = new Map();
    private platformerScores: Map<string, number> = new Map();
    private lastScoreIncrement: Map<string, number> = new Map();
    private bombs: Map<string, number> = new Map();
    private lastRisingLine: number = Date.now();
    private loopId: NodeJS.Timeout | null = null;

    constructor(roomId: string, players: Player[], mode: 'normal' | 'shared', seed: string) {
        this.roomId = roomId;
        this.players = players;
        this.mode = mode;
        this.seed = seed;
        this.currentRound = 1;
        this.totalRounds = players.length * 3;
        this.isPaused = false;
        this.isRunning = false;
    }

    private static createPlatformerChar() {
        return {
            x: 5,
            y: 10,
            vx: 0,
            vy: 0,
            jumpTicks: 0,
            isGrounded: false,
            shape: [{ dx: 0, dy: 0 }],
        };
    }

    init(): void {
        const now = Date.now();
        this.lastRisingLine = now;

        this.players.forEach(player => {
            player.reset();
            this.platformerScores.set(player.id, 0);
            this.lastScoreIncrement.set(player.id, now);
            if (player.isPlatformer) {
                this.bombs.set(player.id, INITIAL_BOMBS);
            }
        });

        if (this.mode === 'shared') {
            this.initSharedMode();
        } else {
            this.initNormalMode();
        }
    }

    private initSharedMode(): void {
        const now = Date.now();
        const generator = new PieceGenerator(this.seed);
        const sharedEngine = new GameEngine();
        sharedEngine.spawnPiece(generator.next());
        sharedEngine.state.platformerChar = Game.createPlatformerChar();

        this.players.forEach(player => {
            this.engines.set(player.id, sharedEngine);
            this.generators.set(player.id, generator);
            this.lastFall.set(player.id, now);
            this.lastPlatformerFall.set(player.id, now);
        });
    }

    private initNormalMode(): void {
        const now = Date.now();
        this.players.forEach(player => {
            const generator = new PieceGenerator(this.seed);
            const engine = new GameEngine();
            engine.spawnPiece(generator.next());

            if (player.isPlatformer) {
                engine.state.platformerChar = Game.createPlatformerChar();
            }

            this.engines.set(player.id, engine);
            this.generators.set(player.id, generator);
            this.lastFall.set(player.id, now);
            this.lastPlatformerFall.set(player.id, now);
        });
    }

    start(io: Server): void {
        if (this.loopId) clearInterval(this.loopId);
        this.isRunning = true;
        this.loopId = setInterval(() => this.tick(io), 1000 / 60);
    }

    stop(): void {
        if (this.loopId) {
            clearInterval(this.loopId);
            this.loopId = null;
        }
        this.isRunning = false;
    }

    getEngine(playerId: string): GameEngine | undefined {
        return this.engines.get(playerId);
    }

    getGenerator(playerId: string): PieceGenerator | undefined {
        return this.generators.get(playerId);
    }

    getPlatformerScore(playerId: string): number {
        return this.platformerScores.get(playerId) || 0;
    }

    setPlatformerScore(playerId: string, score: number): void {
        this.platformerScores.set(playerId, score);
        const player = this.getPlayer(playerId);
        if (player) player.score = score;
    }

    addPlatformerScore(playerId: string, points: number): void {
        const current = this.getPlatformerScore(playerId);
        this.setPlatformerScore(playerId, current + points);
    }

    getBombs(playerId: string): number {
        return this.bombs.get(playerId) ?? 0;
    }

    useBomb(playerId: string): boolean {
        const current = this.getBombs(playerId);
        if (current <= 0) return false;
        this.bombs.set(playerId, current - 1);
        return true;
    }

    getPlayer(playerId: string): Player | undefined {
        return this.players.find(p => p.id === playerId);
    }

    getScores(): Record<string, number> {
        const scores: Record<string, number> = {};
        this.players.forEach(p => {
            scores[p.id] = this.getPlatformerScore(p.id);
        });
        return scores;
    }

    getAlivePlayers(): Player[] {
        return this.players.filter(p => {
            const engine = this.engines.get(p.id);
            return engine && engine.state.isAlive;
        });
    }

    /** Check if the platformer char collides with blocks at (x, y). */
    checkCollision(engine: GameEngine, x: number, y: number): boolean {
        const char = engine.state.platformerChar;
        if (!char || !char.shape) return false;

        const grid = engine.getGridWithPiece();
        return char.shape.some((part: any) => {
            const gridX = Math.floor(x + part.dx);
            const gridY = Math.floor(y + part.dy);

            if (gridX < 0 || gridX >= 10) return true;
            if (gridY >= 20) return true;
            if (gridY < 0) return false;

            return grid[gridY][gridX] !== 0 && grid[gridY][gridX] !== 9;
        });
    }

    /** Check if platformer can move to (x, y). */
    canMoveTo(engine: GameEngine, x: number, y: number): boolean {
        const gridX = Math.floor(x);
        const gridY = Math.floor(y);

        if (gridX < 0 || gridX >= 10 || gridY >= 20) return false;
        if (gridY < 0) return true;

        const grid = engine.getGridWithPiece();
        return grid[gridY][gridX] === 0 || grid[gridY][gridX] === 9;
    }

    /** Push the platformer char when a tetris piece collides with it. */
    checkTetrisCollision(engine: GameEngine): boolean {
        const char = engine.state.platformerChar;
        if (!char) return false;

        if (this.checkCollision(engine, char.x, char.y)) {
            if (this.canMoveTo(engine, char.x, char.y + 1)) {
                char.y++;
            } else {
                engine.state.isAlive = false;
                return true; // platformer died
            }
        }
        return false;
    }

    /** Move the platformer char when tetris piece moves left/right. */
    movePlatformerChar(engine: GameEngine, action: string): void {
        const char = engine.state.platformerChar;
        if (!char) return;

        if (this.checkCollision(engine, char.x, char.y)) {
            if (action === 'left' && this.canMoveTo(engine, char.x - 1, char.y)) {
                char.x--;
            } else if (action === 'right' && this.canMoveTo(engine, char.x + 1, char.y)) {
                char.x++;
            }
        }
    }

    /** Handle platformer movement from player input. */
    handlePlatformerMovement(playerId: string, engine: GameEngine, action: string): void {
        const char = engine.state.platformerChar;
        if (!char) return;

        switch (action) {
            case 'left':
                if (this.canMoveTo(engine, char.x - 1, char.y)) char.x--;
                break;
            case 'right':
                if (this.canMoveTo(engine, char.x + 1, char.y)) char.x++;
                break;
            case 'rotate': // Jump
                if (char.isGrounded) {
                    char.jumpTicks = 4;
                    char.isGrounded = false;
                }
                break;
            case 'down': // Bomb
                this.placeBomb(playerId, engine);
                break;
        }
    }

    /** Place a bomb around the platformer char. */
    placeBomb(playerId: string, engine: GameEngine): void {
        const char = engine.state.platformerChar;
        if (!char) return;

        if (!this.useBomb(playerId)) return;

        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const targetX = Math.floor(char.x + dx);
                const targetY = Math.floor(char.y + dy);
                if (targetX >= 0 && targetX < 10 && targetY >= 0 && targetY < 20) {
                    engine.clearCell(targetX, targetY);
                }
            }
        }
    }

    /** Handle penalty lines when a player clears multiple lines. */
    handlePenalty(attackerId: string, linesCleared: number, room: any): void {
        if (linesCleared < 2) return;
        const penaltyLines = linesCleared - 1;

        room.players.forEach((target: any) => {
            if (target.id !== attackerId) {
                const engine = this.engines.get(target.id);
                if (engine && engine.state.isAlive) {
                    engine.addPenaltyLines(penaltyLines);
                }
            }
        });
    }

    buildRoomState(): Array<{
        id: string;
        state: any;
        displayGrid: number[][] | null;
        platformerScore: number;
        bombs: number;
        nextPieces: string[];
    }> {
        if (this.mode === 'shared') {
            const anyPlayer = this.players[0];
            const sharedEngine = anyPlayer ? this.engines.get(anyPlayer.id) : undefined;
            const sharedState = sharedEngine?.state ?? null;
            const sharedGrid = sharedEngine?.getGridWithPiece() ?? null;
            const sharedGenerator = anyPlayer ? this.generators.get(anyPlayer.id) : undefined;
            const sharedNextPieces = sharedGenerator?.peek(3) ?? [];

            return this.players.map(p => ({
                id: p.id,
                state: sharedState,
                displayGrid: sharedGrid,
                platformerScore: this.getPlatformerScore(p.id),
                bombs: this.getBombs(p.id),
                nextPieces: sharedNextPieces,
            }));
        }

        return this.players.map(p => {
            const engine = this.engines.get(p.id);
            const generator = this.generators.get(p.id);
            return {
                id: p.id,
                state: engine?.state,
                displayGrid: engine?.getGridWithPiece() ?? null,
                platformerScore: this.getPlatformerScore(p.id),
                bombs: this.getBombs(p.id),
                nextPieces: generator?.peek(3) ?? [],
            };
        });
    }

    broadcastState(io: Server): void {
        io.to(this.roomId).emit('game:state_update', this.buildRoomState());
    }

    /** Start a new round after role swap. */
    startNewRound(io: Server): void {
        const newSeed = Math.random().toString(36).substring(2, 15);
        this.seed = newSeed;
        this.lastRisingLine = Date.now();

        const newPlatformer = this.players.find(p => p.isPlatformer);
        if (newPlatformer) {
            this.lastScoreIncrement.set(newPlatformer.id, Date.now());
            this.bombs.set(newPlatformer.id, INITIAL_BOMBS);
        }

        this.players.forEach(player => {
            player.setAlive(true);
        });

        if (this.mode === 'shared') {
            this.initSharedMode();
        } else {
            this.initNormalMode();
        }
    }

    isGameFinished(): boolean {
        return this.currentRound > this.totalRounds;
    }

    getWinner(): { id: string; name: string; score: number } | null {
        let winner: Player | null = null;
        let highestScore = -1;

        this.players.forEach(p => {
            const score = this.getPlatformerScore(p.id);
            if (score > highestScore) {
                highestScore = score;
                winner = p;
            }
        });

        return winner ? { id: winner.id, name: winner.name, score: highestScore } : null;
    }

    getNormalWinner(): { id: string; name: string; score: number } | null {
        const alivePlayers = this.getAlivePlayers();
        let winner: Player | null = alivePlayers[0] || null;

        if (!winner) {
            let best: Player | null = null;
            let bestScore = -1;
            this.players.forEach(p => {
                const engine = this.engines.get(p.id);
                const score = engine?.state.score || 0;
                if (score > bestScore) {
                    bestScore = score;
                    best = p;
                }
            });
            winner = best;
        }

        if (!winner) return null;
        const engine = this.engines.get(winner.id);
        return { id: winner.id, name: winner.name, score: engine?.state.score || 0 };
    }

    cleanup(): void {
        this.stop();
        this.engines.clear();
        this.generators.clear();
        this.lastFall.clear();
        this.lastPlatformerFall.clear();
        this.platformerScores.clear();
        this.lastScoreIncrement.clear();
        this.bombs.clear();
    }

    /** The main game loop tick — identical logic to old gameLoopTick. */
    private tick(io: Server): void {
        if (this.isPaused) return;
        const now = Date.now();
        let globalStateChanged = false;

        const hasPlatformerInRoom = this.players.some(p => p.isPlatformer);

        // ─── Rising lines (only when platformer is in room) ───
        if (hasPlatformerInRoom) {
            if (now - this.lastRisingLine >= RISING_LINE_INTERVAL) {
                this.lastRisingLine = now;

                if (this.mode === 'shared') {
                    const anyEngine = this.engines.get(this.players[0]?.id ?? '');
                    if (anyEngine && anyEngine.state.isAlive) {
                        const alive = anyEngine.addRisingLine(RISING_GAP_SIZE);
                        if (!alive) {
                            this.onPlatformerDead(io);
                            return;
                        }
                        globalStateChanged = true;
                    }
                } else {
                    let someoneDied = false;
                    this.players.forEach(p => {
                        const engine = this.engines.get(p.id);
                        if (engine && engine.state.isAlive) {
                            const alive = engine.addRisingLine(RISING_GAP_SIZE);
                            if (!alive && p.isPlatformer) {
                                someoneDied = true;
                            }
                        }
                    });
                    if (someoneDied) {
                        this.onPlatformerDead(io);
                        return;
                    }
                    globalStateChanged = true;
                }
            }
        }

        // ─── Shared mode tick ───
        if (this.mode === 'shared') {
            const tetrisPlayer = this.players.find(p => !p.isPlatformer);
            const platformerPlayer = this.players.find(p => p.isPlatformer);
            const sharedEngine = tetrisPlayer
                ? this.engines.get(tetrisPlayer.id)
                : platformerPlayer
                    ? this.engines.get(platformerPlayer.id)
                    : undefined;

            if (sharedEngine && sharedEngine.state.isAlive) {
                // Increment platformer score over time
                if (platformerPlayer) {
                    const lastScoreInc = this.lastScoreIncrement.get(platformerPlayer.id) || now;
                    if (now - lastScoreInc >= SCORE_INCREMENT_INTERVAL) {
                        this.addPlatformerScore(platformerPlayer.id, SCORE_POINTS_PER_TICK);
                        this.lastScoreIncrement.set(platformerPlayer.id, now);
                        globalStateChanged = true;
                    }
                }

                // Tetris gravity
                if (tetrisPlayer) {
                    const died = this.checkTetrisCollision(sharedEngine);
                    if (died) {
                        this.onPlatformerDead(io);
                        return;
                    }

                    const lastFall = this.lastFall.get(tetrisPlayer.id) || now;
                    if (now - lastFall > sharedEngine.getFallInterval()) {
                        const result = sharedEngine.applyAction('down');
                        if (result.locked) {
                            const gen = this.generators.get(tetrisPlayer.id);
                            if (gen) {
                                const spawned = sharedEngine.spawnPiece(gen.next());
                                if (!spawned) {
                                    this.onTetrisDead(io);
                                    return;
                                }
                            }
                        }
                        this.lastFall.set(tetrisPlayer.id, now);
                        globalStateChanged = true;
                    }
                }

                // Platformer physics
                if (platformerPlayer) {
                    const char = sharedEngine.state.platformerChar;
                    if (char && char.jumpTicks !== undefined) {
                        const fallInterval = sharedEngine.getFallInterval();
                        const platformerInterval = fallInterval / 10;
                        const jumpInterval = fallInterval / 10;
                        const lastPFall = this.lastPlatformerFall.get(platformerPlayer.id) || now;
                        const jt = char.jumpTicks || 0;

                        if (now - lastPFall > jumpInterval) {
                            if (jt > 0) {
                                if (this.canMoveTo(sharedEngine, char.x, char.y - 1)) char.y--;
                                char.jumpTicks = jt - 1;
                            }
                        }

                        if (now - lastPFall > platformerInterval) {
                            if (jt > 0) {
                                char.jumpTicks = jt - 1;
                            } else {
                                if (this.canMoveTo(sharedEngine, char.x, char.y + 1)) {
                                    char.y++;
                                    char.isGrounded = false;
                                } else {
                                    char.isGrounded = true;
                                }
                            }
                            if (char.y >= 20) {
                                sharedEngine.state.isAlive = false;
                                this.onPlatformerDead(io);
                                return;
                            }
                            this.lastPlatformerFall.set(platformerPlayer.id, now);
                            globalStateChanged = true;
                        }
                    }
                }
            }
        } else {
            // ─── Normal mode tick ───
            this.players.forEach(p => {
                const engine = this.engines.get(p.id);
                if (!engine || !engine.state.isAlive) return;

                const fallInterval = engine.getFallInterval();

                // Increment platformer score over time
                if (p.isPlatformer) {
                    const lastScoreInc = this.lastScoreIncrement.get(p.id) || now;
                    if (now - lastScoreInc >= SCORE_INCREMENT_INTERVAL) {
                        this.addPlatformerScore(p.id, SCORE_POINTS_PER_TICK);
                        this.lastScoreIncrement.set(p.id, now);
                        globalStateChanged = true;
                    }
                }

                // Tetris gravity
                if (now - (this.lastFall.get(p.id) || now) > fallInterval) {
                    if (!p.isPlatformer) {
                        const result = engine.applyAction('down');
                        if (result.locked) {
                            const gen = this.generators.get(p.id);
                            if (gen) {
                                const spawned = engine.spawnPiece(gen.next());
                                if (!spawned) {
                                    this.onTetrisDead(io);
                                    return;
                                }
                            }
                        }
                        this.lastFall.set(p.id, now);
                        globalStateChanged = true;
                    }
                }

                // Platformer physics
                if (p.isPlatformer) {
                    const char = engine.state.platformerChar;
                    if (!(char && char.jumpTicks !== undefined)) return;

                    const platformerInterval = fallInterval / 10;
                    const jumpInterval = fallInterval / 10;
                    const lastPFall = this.lastPlatformerFall.get(p.id) || now;
                    const jt = char.jumpTicks || 0;

                    if (now - lastPFall > jumpInterval) {
                        if (jt > 0) {
                            if (this.canMoveTo(engine, char.x, char.y - 1)) char.y--;
                            char.jumpTicks = jt - 1;
                        }
                    }

                    if (now - lastPFall > platformerInterval) {
                        if (jt > 0) {
                            char.jumpTicks = jt - 1;
                        } else {
                            if (this.canMoveTo(engine, char.x, char.y + 1)) {
                                char.y++;
                                char.isGrounded = false;
                            } else {
                                char.isGrounded = true;
                            }
                        }
                        if (char.y >= 20) {
                            engine.state.isAlive = false;
                            this.onPlatformerDead(io);
                            return;
                        }
                        this.lastPlatformerFall.set(p.id, now);
                        globalStateChanged = true;
                    }
                }
            });
        }

        if (globalStateChanged) {
            this.broadcastState(io);
        }
    }

    // ─── Callbacks for death events (set by handlers.ts) ───
    private onPlatformerDeadCb: ((io: Server) => void) | null = null;
    private onTetrisDeadCb: ((io: Server) => void) | null = null;

    setOnPlatformerDead(cb: (io: Server) => void): void {
        this.onPlatformerDeadCb = cb;
    }

    setOnTetrisDead(cb: (io: Server) => void): void {
        this.onTetrisDeadCb = cb;
    }

    private onPlatformerDead(io: Server): void {
        if (this.onPlatformerDeadCb) this.onPlatformerDeadCb(io);
    }

    private onTetrisDead(io: Server): void {
        if (this.onTetrisDeadCb) this.onTetrisDeadCb(io);
    }
}