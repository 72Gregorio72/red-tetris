import type { Server, Socket } from 'socket.io';
import type { IPlayer } from '../types/player';
import { GameEngine, type Action } from '../game/GameEngine';
import { PieceGenerator } from '../game/PieceGenerator';
import {
	createRoom,
	joinRoom,
	leaveRoom,
	getRoomByPlayer,
	getRoomList,
} from '../game/RoomManager';

const players = new Map<string, IPlayer>();
const roomGameLoops = new Map<string, NodeJS.Timeout>();
const playerEngines = new Map<string, GameEngine>();
const playerGenerators = new Map<string, PieceGenerator>();
const playerLastFall = new Map<string, number>();

export function registerSocketHandlers(io: Server, socket: Socket) {
	console.log(`[Socket] Client connected: ${socket.id}`);

	socket.on('player:register', ({ name }: { name: string }) => {
		const player: IPlayer = {
			id: socket.id,
			name,
			score: 0,
			isConnected: true,
			isAlive: true,
			isReady: false,
		};
		players.set(socket.id, player);
		console.log(`[Socket] Player registered: ${name} (${socket.id})`);

		socket.emit('player:registered', player);
	});

	socket.on('room:list', () => {
		socket.emit('room:list', getRoomList());
	});

	socket.on('room:create', ({ name }: { name: string }) => {
		const player = players.get(socket.id);
		console.log(`[Socket] ${player?.name} is creating a room with name: ${name}`);
		if (!player) return;

		const room = createRoom(name, player);
		socket.join(room.id);

		console.log(`[Socket] Room created: ${room.name} by ${player.name}`);

		socket.emit('room:joined', room);

		io.emit('room:list', getRoomList());
		console.log('Current rooms:');
	});

	socket.on('room:join', ({ roomId }: { roomId: string }) => {
		const player = players.get(socket.id);
		if (!player) return;

		const room = joinRoom(roomId, player);
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

		player.isReady = isReady;

		const room = getRoomByPlayer(socket.id);
		if (!room) return;

		io.to(room.id).emit('room:players_updated', room.players);
	});

	socket.on('game:start', () => {
		const room = getRoomByPlayer(socket.id);
		if (!room) return;
		if (room.host.id !== socket.id) return;

		console.log(`[Socket] Game starting in room ${room.name}`);
		const seed = Math.random().toString(36).substring(2, 15);

		const generator = new PieceGenerator();
		room.players.forEach(p => {
			const engine = new GameEngine();
			engine.spawnPiece(generator.next());
			playerEngines.set(p.id, engine);
			playerGenerators.set(p.id, generator);
			playerLastFall.set(p.id, Date.now());
		});

		io.to(room.id).emit('game:start', { seed });

		const initialState = room.players.map(p => {
            const engine = playerEngines.get(p.id);
            return {
                id: p.id,
                state: engine?.state,
                displayGrid: engine?.getGridWithPiece() 
            };
        });
        io.to(room.id).emit('game:state_update', initialState);

		if (roomGameLoops.has(room.id)) clearInterval(roomGameLoops.get(room.id));
		
		const loopId = setInterval(() => {
			const now = Date.now();
			let stateChanged = false;

			room.players.forEach(p => {
				const engine = playerEngines.get(p.id);
				const lastFall = playerLastFall.get(p.id) || now;

				if (engine && engine.state.isAlive) {
					if (now - lastFall > engine.getFallInterval()) {
						const result = engine.applyAction('down');
						playerLastFall.set(p.id, now);
						stateChanged = true;

						if (result.locked) {
							const gen = playerGenerators.get(p.id)!;
							engine.spawnPiece(gen.next());
							
							if (result.linesCleared >= 2) {
								const penaltyLines = result.linesCleared - 1;
								room.players.forEach(target => {
									if (target.id !== p.id) {
										const targetEngine = playerEngines.get(target.id);
										if (targetEngine && targetEngine.state.isAlive) {
											targetEngine.addPenaltyLines(penaltyLines);
										}
									}
								});
							}
						}
					}
				}
			});

			if (stateChanged) {
                const roomState = room.players.map(p => {
                    const engine = playerEngines.get(p.id);
                    return {
                        id: p.id,
                        state: engine?.state,
                        displayGrid: engine?.getGridWithPiece()
                    };
                });
                io.to(room.id).emit('game:state_update', roomState);
            }

		}, 1000 / 30);

		roomGameLoops.set(room.id, loopId);
		io.emit('room:list', getRoomList());
	});

	socket.on('game:action', ({ action }: { action: Action }) => {
		const engine = playerEngines.get(socket.id);
		const room = getRoomByPlayer(socket.id);
		if (!engine || !room || !engine.state.isAlive) return;

		const result = engine.applyAction(action);
        
		console.log(`[Socket] Action applied: ${action}`);
		if (result.locked) {
			const gen = playerGenerators.get(socket.id)!;
			engine.spawnPiece(gen.next());
			if (result.linesCleared >= 2) {
				const penaltyLines = result.linesCleared - 1;
				
				room.players.forEach(target => {
					if (target.id !== socket.id) {
						const targetEngine = playerEngines.get(target.id);
						if (targetEngine && targetEngine.state.isAlive) {
							targetEngine.addPenaltyLines(penaltyLines);
						}
					}
				});
			}
		}

		const roomState = room.players.map(p => {
			const engine = playerEngines.get(p.id);
			return {
				id: p.id,
				state: engine?.state,
				displayGrid: engine?.getGridWithPiece()
			};
		});
		io.to(room.id).emit('game:state_update', roomState);
	});

	socket.on('game:grid_update', ({ grid }: { grid: number[][] }) => {
		const room = getRoomByPlayer(socket.id);
		if (!room) return;

		socket.to(room.id).emit('game:opponent_grid', {
			playerId: socket.id,
			grid,
		});
	});

	socket.on('game:over', () => {
		const player = players.get(socket.id);
		if (!player) return;
		player.isAlive = false;

		const room = getRoomByPlayer(socket.id);
		if (!room) return;

		const alive = room.players.filter((p) => p.isAlive);
		if (alive.length <= 1) {
			io.to(room.id).emit('game:over', {
				winner: alive[0] || null,
			});
		}
	});

	socket.on('disconnect', () => {
		console.log(`[Socket] Client disconnected: ${socket.id}`);
		handleLeaveRoom(io, socket);
		players.delete(socket.id);
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
}

function handleLeaveRoom(io: Server, socket: Socket) {
	const result = leaveRoom(socket.id);
	if (!result) return;

	socket.leave(result.room.id);

	if (!result.isEmpty) {
		io.to(result.room.id).emit('room:players_updated', result.room.players);
		io.to(result.room.id).emit('room:player_left', socket.id);
	}

	io.emit('room:list', getRoomList());
}
