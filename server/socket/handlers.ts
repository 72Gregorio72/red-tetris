import type { Server, Socket } from 'socket.io';
import { Player } from '../game/Player';
import { Game } from '../game/Game';
import { GameEngine, type Action } from '../game/GameEngine';
import { PieceGenerator } from '../game/PieceGenerator';
import type { IPlayer } from '../types/player';
import {
    createRoom,
    joinRoom,
    leaveRoom,
    getRoomByPlayer,
    getRoomList,
} from '../game/RoomManager';

const players = new Map<string, Player>();
const roomGames = new Map<string, Game>();

export function registerSocketHandlers(io: Server, socket: Socket) {
    console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('player:register', ({ name }: { name: string }) => {
        const player = new Player(socket.id, name);
        players.set(socket.id, player);
        console.log(`[Socket] Player registered: ${name} (${socket.id})`);
        socket.emit('player:registered', player.toJSON());
    });

    socket.on('room:list', () => {
        socket.emit('room:list', getRoomList());
    });

    socket.on('room:create', ({ name }: { name: string }) => {
        const player = players.get(socket.id);
        console.log(`[Socket] ${player?.name} is creating a room with name: ${name}`);
        if (!player) return;

        const room = createRoom(name, player.toJSON());
        socket.join(room.id);
        console.log(`[Socket] Room created: ${room.name} by ${player.name}`);
        socket.emit('room:joined', room);
        io.emit('room:list', getRoomList());
    });

    socket.on('room:join', ({ roomId }: { roomId: string }) => {
        const player = players.get(socket.id);
        if (!player) {
            socket.emit('room:error', { message: 'Player not registered' });
            return;
        }

        const room = joinRoom(roomId, player.toJSON());
        if (!room) {
            socket.emit('error', { message: 'Room not found or full' });
            return;
        }

        socket.join(room.id);
        console.log(`[Socket] ${player.name} joined room ${room.name}`);
        socket.emit('room:joined', room);
        io.to(room.id).emit('room:players_updated', room.players);
        io.emit('room:list', getRoomList());
    });

    socket.on('room:leave', () => {
        handleLeaveRoom(io, socket);
    });

    socket.on('player:ready', ({ isReady }: { isReady: boolean }) => {
        const player = players.get(socket.id);
        if (!player) return;

        player.setReady(isReady);

        const room = getRoomByPlayer(socket.id);
        if (!room) return;

        const roomPlayer = room.players.find((p: IPlayer) => p.id === socket.id);
        if (roomPlayer) roomPlayer.isReady = isReady;

        io.to(room.id).emit('room:players_updated', room.players);

        // Auto-restart if all players ready and no active game
        if (room.players.length >= 2 && room.players.every((p: IPlayer) => p.isReady) && !roomGames.has(room.id)) {
            startGameForRoom(io, room);
        }
    });

    socket.on('game:toggle_platformer', ({ enabled }: { enabled: boolean }) => {
        const room = getRoomByPlayer(socket.id);
        if (!room) return;

        room.players.forEach((p: IPlayer) => {
            if (p.id === socket.id) {
                p.isPlatformer = enabled;
                const player = players.get(p.id);
                if (player) player.setPlatformer(enabled);
            }
        });
        io.to(room.id).emit('room:players_updated', room.players);
    });

    socket.on('game:start', () => {
        const room = getRoomByPlayer(socket.id);
        if (!room) return;
        if (room.host.id !== socket.id) return;

        startGameForRoom(io, room);
    });

    function startGameForRoom(io: Server, room: any) {
        const seed = Math.random().toString(36).substring(2, 15);

        const hasPlatformer = room.players.some((p: IPlayer) => p.isPlatformer);
        const hasTetris = room.players.some((p: IPlayer) => !p.isPlatformer);
        const isShared = hasPlatformer && hasTetris;
        const mode: 'normal' | 'shared' = isShared ? 'shared' : 'normal';

        // Build Player objects from the room's player list
        const gamePlayers: Player[] = room.players.map((p: IPlayer) => {
            let player = players.get(p.id);
            if (!player) {
                player = new Player(p.id, p.name);
                players.set(p.id, player);
            }
            player.setPlatformer(p.isPlatformer);
            return player;
        });

        // Stop any existing game
        const existingGame = roomGames.get(room.id);
        if (existingGame) {
            existingGame.cleanup();
        }

        const game = new Game(room.id, gamePlayers, mode, seed);

        // Set up death callbacks
        game.setOnPlatformerDead((io: Server) => {
            platformerDead(io, game, room);
        });
        game.setOnTetrisDead((io: Server) => {
            tetrisDead(io, game, room);
        });

        game.init();
        roomGames.set(room.id, game);

        // Reset room player states
        room.players.forEach((p: IPlayer) => {
            p.score = 0;
            p.isReady = false;
            p.isAlive = true;
        });

        io.to(room.id).emit('game:start', { seed, round: 1, totalRounds: game.totalRounds });
        io.to(room.id).emit('room:players_updated', room.players);
        io.to(room.id).emit('game:round_update', {
            round: 1,
            totalRounds: game.totalRounds,
            scores: game.getScores(),
        });
        io.to(room.id).emit('game:state_update', game.buildRoomState());

        game.start(io);
        io.emit('room:list', getRoomList());
    }

    // ─── Platformer died ───
    function platformerDead(io: Server, game: Game, room: any) {
        const currentPlatformer = game.players.find(p => p.isPlatformer);
        const currentTetris = game.players.find(p => !p.isPlatformer);

        if (!currentPlatformer || !currentTetris) return;

        advanceRound(io, game, room, currentPlatformer, currentTetris, 'platformer_died');
    }

    // ─── Tetris died ───
    function tetrisDead(io: Server, game: Game, room: any) {
        const currentPlatformer = game.players.find(p => p.isPlatformer);
        const currentTetris = game.players.find(p => !p.isPlatformer);

        // Pure tetris mode (no platformer): handle as normal game over
        if (!currentPlatformer) {
            handleNormalTetrisGameOver(io, game, room);
            return;
        }

        if (!currentTetris) return;

        // Award 1000 points to the platformer for surviving
        game.addPlatformerScore(currentPlatformer.id, 1000);

        advanceRound(io, game, room, currentPlatformer, currentTetris, 'tetris_died');
    }

    // ─── Advance round (swap roles or end game) ───
    function advanceRound(
        io: Server,
        game: Game,
        room: any,
        currentPlatformer: Player,
        currentTetris: Player,
        reason: string,
    ) {
        const currentRound = game.currentRound;
        const nextRound = currentRound + 1;
        game.currentRound = nextRound;

        const scores = game.getScores();

        // Check if all rounds are done
        if (nextRound > game.totalRounds) {
            game.stop();

            io.to(room.id).emit('game:round_update', {
                round: nextRound,
                totalRounds: game.totalRounds,
                scores,
            });

            io.to(room.id).emit('game:finished', {
                winner: game.getWinner(),
                scores,
            });

            room.players.forEach((p: IPlayer) => {
                p.isReady = false;
                p.isAlive = true;
            });
            io.to(room.id).emit('room:players_updated', room.players);

            game.cleanup();
            roomGames.delete(room.id);
            return;
        }

        // Swap roles
        currentPlatformer.setPlatformer(false);
        currentTetris.setPlatformer(true);

        // Update room player data to match
        const roomPlatformer = room.players.find((p: IPlayer) => p.id === currentPlatformer.id);
        const roomTetris = room.players.find((p: IPlayer) => p.id === currentTetris.id);
        if (roomPlatformer) roomPlatformer.isPlatformer = false;
        if (roomTetris) roomTetris.isPlatformer = true;

        // Pause and show round-end feedback
        game.isPaused = true;

        io.to(room.id).emit('game:round_end', {
            round: currentRound,
            nextRound,
            totalRounds: game.totalRounds,
            scores,
            reason,
            newPlatformer: { id: currentTetris.id, name: currentTetris.name },
            newTetris: { id: currentPlatformer.id, name: currentPlatformer.name },
        });

        setTimeout(() => {
            game.isPaused = false;
            game.startNewRound(io);
            io.to(room.id).emit('room:players_updated', room.players);
            io.to(room.id).emit('game:round_update', {
                round: nextRound,
                totalRounds: game.totalRounds,
                scores,
            });
            game.broadcastState(io);
        }, 3000);
    }

    // ─── Normal tetris game over (no platformer mode) ───
    function handleNormalTetrisGameOver(io: Server, game: Game, room: any) {
        game.stop();

        const winner = game.getNormalWinner();

        room.players.forEach((p: IPlayer) => {
            p.isReady = false;
            p.isAlive = true;
        });

        io.to(room.id).emit('game:over', { winner });
        io.to(room.id).emit('room:players_updated', room.players);

        game.cleanup();
        roomGames.delete(room.id);
    }

    // ─── Game action (input from player) ───
    socket.on('game:action', ({ action }: { action: Action }) => {
        const player = players.get(socket.id);
        const room = getRoomByPlayer(socket.id);
        if (!player || !room) return;

        const game = roomGames.get(room.id);
        if (!game) return;

        const engine = game.getEngine(socket.id);
        if (!engine || !engine.state.isAlive) return;

        if (player.isPlatformer) {
            game.handlePlatformerMovement(socket.id, engine, action);
        } else {
            // Block hard drop in shared mode
            if (action === 'drop' && game.mode === 'shared') return;

            const result = engine.applyAction(action);

            // When tetris player moves left/right, also push the platformer char
            if (action === 'left' || action === 'right') {
                game.movePlatformerChar(engine, action);
            }

            if (result.locked) {
                const gen = game.getGenerator(socket.id);
                if (gen) {
                    const spawned = engine.spawnPiece(gen.next());
                    if (!spawned) {
                        tetrisDead(io, game, room);
                        return;
                    }
                }

                // Penalty lines in non-shared mode
                if (game.mode !== 'shared' && result.linesCleared >= 2) {
                    game.handlePenalty(socket.id, result.linesCleared, room);
                }
            }
        }

        game.broadcastState(io);
    });

    // ─── Game over (client reports death) ───
    socket.on('game:over', () => {
        const player = players.get(socket.id);
        if (!player) return;
        player.setAlive(false);

        const room = getRoomByPlayer(socket.id);
        if (!room) return;

        const game = roomGames.get(room.id);
        if (!game) return;

        const engine = game.getEngine(socket.id);
        if (engine) engine.state.isAlive = false;

        const alivePlayers = game.getAlivePlayers();
        if (alivePlayers.length <= 1) {
            handleNormalTetrisGameOver(io, game, room);
        }
    });

    // ─── Grid/piece sync for opponents ───
    socket.on('game:grid_update', ({ grid }: { grid: number[][] }) => {
        const room = getRoomByPlayer(socket.id);
        if (!room) return;
        socket.to(room.id).emit('game:opponent_grid', {
            playerId: socket.id,
            grid,
        });
    });

    socket.on('game:piece_move', ({ cells }: { cells: { row: number; col: number }[] }) => {
        const room = getRoomByPlayer(socket.id);
        if (!room) return;
        socket.to(room.id).emit('game:opponent_piece', {
            playerId: socket.id,
            cells,
        });
    });

    socket.on('game:attack', ({ lines }: { lines: number }) => {
        const room = getRoomByPlayer(socket.id);
        if (!room) return;
        socket.to(room.id).emit('game:attack', { lines });
    });

    // ─── Disconnect ───
    socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
        handleLeaveRoom(io, socket);
        players.delete(socket.id);
    });
}

function handleLeaveRoom(io: Server, socket: Socket) {
    const result = leaveRoom(socket.id);
    if (!result) return;

    socket.leave(result.room.id);

    if (result.isEmpty) {
        const game = roomGames.get(result.room.id);
        if (game) {
            game.cleanup();
            roomGames.delete(result.room.id);
        }
    } else {
        io.to(result.room.id).emit('room:players_updated', result.room.players);
        io.to(result.room.id).emit('room:player_left', socket.id);
    }

    io.emit('room:list', getRoomList());
}