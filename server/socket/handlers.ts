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
const playerLastPlatformerFall = new Map<string, number>();
const roomMode = new Map<string, 'normal' | 'shared'>();

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
			isPlatformer: false,
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

	socket.on('game:toggle_platformer', ({ enabled }: { enabled: boolean }) => {
		const room = getRoomByPlayer(socket.id);
		if (!room) return;
		room.players.forEach(p => {
			if (p.id === socket.id) {
				p.isPlatformer = enabled;
			}
		});
		io.to(room.id).emit('room:players_updated', room.players);
	});

	socket.on('game:start', () => {
		const room = getRoomByPlayer(socket.id);
		if (!room) return;
		if (room.host.id !== socket.id) return;

		const seed = Math.random().toString(36).substring(2, 15);

		const hasPlatformer = room.players.some((p: IPlayer) => p.isPlatformer);
		const hasTetris = room.players.some((p: IPlayer) => !p.isPlatformer);
		const isShared = hasPlatformer && hasTetris;
		roomMode.set(room.id, isShared ? 'shared' : 'normal');

		if (isShared) {
			// Shared mode: one engine for the grid, platformer char lives inside it
			const generator = new PieceGenerator();
			const sharedEngine = new GameEngine();
			sharedEngine.spawnPiece(generator.next());
			sharedEngine.state.platformerChar = {
				x: 5,
				y: 10,
				vx: 0,
				vy: 0,
				jumpTicks: 0,
				isGrounded: false,
				shape: [{ dx: 0, dy: 0 }]
			};
			// Both players reference the same engine and generator
			room.players.forEach((p: IPlayer) => {
				playerEngines.set(p.id, sharedEngine);
				playerGenerators.set(p.id, generator);
				playerLastFall.set(p.id, Date.now());
				playerLastPlatformerFall.set(p.id, Date.now());
			});
		} else {
			// Normal mode: each player gets their own engine
			const generator = new PieceGenerator();
			room.players.forEach((p: IPlayer) => {
				const engine = new GameEngine();
				engine.spawnPiece(generator.next());
				if (p.isPlatformer) {
					engine.state.platformerChar = {
						x: 5,
						y: 10,
						vx: 0,
						vy: 0,
						jumpTicks: 0,
						isGrounded: false,
						shape: [{ dx: 0, dy: 0 }]
					};
				}
				playerEngines.set(p.id, engine);
				playerGenerators.set(p.id, generator);
				playerLastFall.set(p.id, Date.now());
				playerLastPlatformerFall.set(p.id, Date.now());
			});
		}

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
			let globalStateChanged = false;

			if (roomMode.get(room.id) === 'shared') {
				// Shared mode: process tetris gravity and platformer physics on the single shared engine
				const tetrisPlayer = room.players.find((p: IPlayer) => !p.isPlatformer);
				const platformerPlayer = room.players.find((p: IPlayer) => p.isPlatformer);
				// Both point to the same engine, just pick one
				const sharedEngine = tetrisPlayer
					? playerEngines.get(tetrisPlayer.id)
					: platformerPlayer
						? playerEngines.get(platformerPlayer.id)
						: undefined;

				if (sharedEngine && sharedEngine.state.isAlive) {
					// Tetris gravity
					if (tetrisPlayer) {
						const lastFall = playerLastFall.get(tetrisPlayer.id) || now;
						if (now - lastFall > sharedEngine.getFallInterval()) {
							const result = sharedEngine.applyAction('down');
							if (result.locked) {
								sharedEngine.spawnPiece(playerGenerators.get(tetrisPlayer.id)!.next());
							}
							playerLastFall.set(tetrisPlayer.id, now);
							globalStateChanged = true;
						}
					}
					// Platformer char moves at double the tetris fall rate
					if (platformerPlayer) {
						checkPlatformerCollision(sharedEngine);
						const platformerInterval = sharedEngine.getFallInterval() / 2;
						const lastPlatformerFall = playerLastPlatformerFall.get(platformerPlayer.id) || now;
						const fallinterval = sharedEngine.getFallInterval();
						const jumpInterval = fallinterval / 4;
						const char = sharedEngine.state.platformerChar;
						const jt = char?.jumpTicks || 0;
						if (now - lastPlatformerFall > jumpInterval) {
							if (jt > 0) {
								if (canMoveTo(sharedEngine, char.x, char.y - 1)) char.y--;
								char.jumpTicks = jt - 1;
							}
						}
						if (now - lastPlatformerFall > platformerInterval) {
							if (char) {
								if (jt > 0) {
									//if (canMoveTo(sharedEngine, char.x, char.y - 1)) char.y-= 4;
									char.jumpTicks = jt - 1;
								} else {
									if (canMoveTo(sharedEngine, char.x, char.y + 1)) {
										char.y++;
										char.isGrounded = false;
									} else {
										char.isGrounded = true;
									}
								}
								if (char.y >= 20) sharedEngine.state.isAlive = false;
							}
							playerLastPlatformerFall.set(platformerPlayer.id, now);
							globalStateChanged = true;
						}
					}
				}
			} else {
				room.players.forEach((p: IPlayer) => {
					const engine = playerEngines.get(p.id);
					if (!engine || !engine.state.isAlive) return;

					const lastFall = playerLastFall.get(p.id) || now;
					const fallInterval = engine.getFallInterval();

					if (now - lastFall > fallInterval) {
						if (!p.isPlatformer) {
							const result = engine.applyAction('down');
							if (result.locked) {
								engine.spawnPiece(playerGenerators.get(p.id)!.next());
								handlePenaltyLogic(result.linesCleared, p, room);
							}
							playerLastFall.set(p.id, now);
							globalStateChanged = true;
						}
					}

					if (p.isPlatformer) {
						checkPlatformerCollision(engine);
						const platformerInterval = fallInterval / 2;
						const jumpInterval = fallinterval / 4;
						const lastPlatformerFall = playerLastPlatformerFall.get(p.id) || now;
						const char = engine.state.platformerChar;
						const jt = char.jumpTicks || 0;
						if (now - lastPlatformerFall > jumpInterval) {
							if (jt > 0) {
								if (canMoveTo(engine, char.x, char.y - 1)) char.y--;
								char.jumpTicks = jt - 1;
							}
						}
						if (now - lastPlatformerFall > platformerInterval) {
							if (char) {
								if (jt > 0) {
									//if (canMoveTo(engine, char.x, char.y - 1)) char.y-= 4;
									char.jumpTicks = jt - 1;
								} else {
									if (canMoveTo(engine, char.x, char.y + 1)) {
										char.y++;
										char.isGrounded = false;
									} else {
										char.isGrounded = true;
									}
								}
								if (char.y >= 20) engine.state.isAlive = false;
							}
							playerLastPlatformerFall.set(p.id, now);
							globalStateChanged = true;
						}
					}
				});
			}

			if (globalStateChanged) {
				broadcastRoomState(io, room);
			}
		}, 1000 / 60);

		roomGameLoops.set(room.id, loopId);
		io.emit('room:list', getRoomList());
	});

	function handlePenaltyLogic(linesCleared: number, player: IPlayer, room: any) {
		if (linesCleared >= 2) {
			const penaltyLines = linesCleared - 1;
			
			room.players.forEach(target => {
				if (target.id !== player.id) {
					const targetEngine = playerEngines.get(target.id);
					if (targetEngine && targetEngine.state.isAlive) {
						targetEngine.addPenaltyLines(penaltyLines);
					}
				}
			});
		}
	}

	socket.on('game:action', ({ action }: { action: Action }) => {
		const player = players.get(socket.id);
		const engine = playerEngines.get(socket.id);
		const room = getRoomByPlayer(socket.id);
		if (!engine || !room || !engine.state.isAlive) return;

		if (player.isPlatformer) 
			handlePlatformerMovement(engine, action);
		else{
			const result = engine.applyAction(action);

				if (result.locked) {
				const gen = playerGenerators.get(socket.id)!;
				engine.spawnPiece(gen.next());
				if (roomMode.get(room.id) !== 'shared' && result.linesCleared >= 2) {
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

	function handlePlatformerMovement(engine: any, action: string) {
		const char = engine.state.platformerChar;
		
		if (!char) return;

		switch(action) {
			case 'left':
				if (canMoveTo(engine, char.x - 1, char.y)) char.x--;
				break;
			case 'right':
				if (canMoveTo(engine, char.x + 1, char.y)) char.x++;
				break;
			case 'rotate':
				jump();
				break;
		}
	}

	function checkPlatformerCollision(engine: any) {
		const char = engine.state.platformerChar;
		if (!char) return;
		if (checkCollision(engine, char.x, char.y))
			engine.state.isAlive = false;
	}

	function jump() {
		const engine = playerEngines.get(socket.id);
		const char = engine?.state.platformerChar;
		
		if (char && char.isGrounded) {
			char.jumpTicks = 4;
			char.isGrounded = false;
		}
	}

	function canMoveTo(engine: any, x: number, y: number): boolean {
		const gridX = Math.floor(x);
		const gridY = Math.floor(y);

		if (gridX < 0 || gridX >= 10 || gridY >= 20) return false;
		if (gridY < 0) return true;

		const grid = engine.getGridWithPiece();
		return grid[gridY][gridX] === 0;
	}

	function isOnGround(engine: any, char: any): boolean {
		return !canMoveTo(engine, char.x, char.y + 1);
	}

	function checkCollision(engine: any, x: number, y: number): boolean {
		const char = engine.state.platformerChar;
		if (!char || !char.shape) return false;

		const grid = engine.getGridWithPiece();
		return char.shape.some((part: any) => {
			const gridX = Math.floor(x + part.dx);
			const gridY = Math.floor(y + part.dy);
			
			if (gridX < 0 || gridX >= 10) return true;
			if (gridY >= 20) return true;
			if (gridY < 0) return false;

			return grid[gridY][gridX] !== 0;
		});
	}

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

function broadcastRoomState(io: Server, room: any) {
    if (roomMode.get(room.id) === 'shared') {
        const anyPlayer = room.players[0];
        const sharedEngine = anyPlayer ? playerEngines.get(anyPlayer.id) : undefined;
        const sharedState = sharedEngine?.state ?? null;
        const sharedGrid = sharedEngine?.getGridWithPiece() ?? null;
        const roomState = room.players.map((p: IPlayer) => ({
            id: p.id,
            state: sharedState,
            displayGrid: sharedGrid
        }));
        io.to(room.id).emit('game:state_update', roomState);
    } else {
        const roomState = room.players.map((p: IPlayer) => {
            const engine = playerEngines.get(p.id);
            return {
                id: p.id,
                state: engine?.state,
                displayGrid: engine?.getGridWithPiece()
            };
        });
        io.to(room.id).emit('game:state_update', roomState);
    }
}

function handleLeaveRoom(io: Server, socket: Socket) {
	const result = leaveRoom(socket.id);
	if (!result) return;

	socket.leave(result.room.id);

	if (result.isEmpty) {
		roomMode.delete(result.room.id);
	} else {
		io.to(result.room.id).emit('room:players_updated', result.room.players);
		io.to(result.room.id).emit('room:player_left', socket.id);
	}

	io.emit('room:list', getRoomList());
}
