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
const roomRound = new Map<string, number>();
const roomTotalRounds = new Map<string, number>();
const playerPlatformerScore = new Map<string, number>();
const playerLastScoreIncrement = new Map<string, number>();
const roomLastRisingLine = new Map<string, number>();
const playerBombs = new Map<string, number>();
const roomSeed = new Map<string, string>();
const roomPaused = new Map<string, boolean>();
const INITIAL_BOMBS = 3;
const ROUND_END_PAUSE_MS = 3000;

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
			life: 0,
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

		// If all players are ready and there's no active game loop, auto-restart
		if (room.players.length >= 2 && room.players.every((p: IPlayer) => p.isReady) && !roomGameLoops.has(room.id)) {
			// Trigger game start from the host
			const seed = Math.random().toString(36).substring(2, 15);
			roomSeed.set(room.id, seed);

			const hasPlatformer = room.players.some((p: IPlayer) => p.isPlatformer);
			const hasTetris = room.players.some((p: IPlayer) => !p.isPlatformer);
			const isShared = hasPlatformer && hasTetris;
			roomMode.set(room.id, isShared ? 'shared' : 'normal');

			const totalRounds = room.players.length * 3;
			roomRound.set(room.id, 1);
			roomTotalRounds.set(room.id, totalRounds);

			room.players.forEach((p: IPlayer) => {
				p.score = 0;
				p.isReady = false;
				p.isAlive = true;
				playerPlatformerScore.set(p.id, 0);
				playerLastScoreIncrement.set(p.id, Date.now());
				if (p.isPlatformer) playerBombs.set(p.id, INITIAL_BOMBS);
			});
			roomLastRisingLine.set(room.id, Date.now());

			// Create engines for each player
			if (isShared) {
				const generator = new PieceGenerator(seed);
				const sharedEngine = new GameEngine();
				sharedEngine.spawnPiece(generator.next());
				sharedEngine.state.platformerChar = {
					x: 5, y: 10, vx: 0, vy: 0,
					jumpTicks: 0, isGrounded: false,
					shape: [{ dx: 0, dy: 0 }]
				};
				room.players.forEach((p: IPlayer) => {
					playerEngines.set(p.id, sharedEngine);
					playerGenerators.set(p.id, generator);
					playerLastFall.set(p.id, Date.now());
					playerLastPlatformerFall.set(p.id, Date.now());
				});
			} else {
				room.players.forEach((p: IPlayer) => {
					const generator = new PieceGenerator(seed);
					const engine = new GameEngine();
					engine.spawnPiece(generator.next());
					if (p.isPlatformer) {
						engine.state.platformerChar = {
							x: 5, y: 10, vx: 0, vy: 0,
							jumpTicks: 0, isGrounded: false,
							shape: [{ dx: 0, dy: 0 }]
						};
					}
					playerEngines.set(p.id, engine);
					playerGenerators.set(p.id, generator);
					playerLastFall.set(p.id, Date.now());
					playerLastPlatformerFall.set(p.id, Date.now());
				});
			}

			io.to(room.id).emit('game:start', { seed, round: 1, totalRounds });
			io.to(room.id).emit('room:players_updated', room.players);

			const initialState = room.players.map((p: IPlayer) => {
				const engine = playerEngines.get(p.id);
				return { id: p.id, state: engine?.state, displayGrid: engine?.getGridWithPiece() };
			});
			io.to(room.id).emit('game:state_update', initialState);

			// Start the game loop (same as game:start)
			const loopId = setInterval(() => gameLoopTick(room), 1000 / 60);
			roomGameLoops.set(room.id, loopId);
			io.emit('room:list', getRoomList());
		}
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
		roomSeed.set(room.id, seed);

		const hasPlatformer = room.players.some((p: IPlayer) => p.isPlatformer);
		const hasTetris = room.players.some((p: IPlayer) => !p.isPlatformer);
		const isShared = hasPlatformer && hasTetris;
		roomMode.set(room.id, isShared ? 'shared' : 'normal');

		// Initialize round tracking: 3 rounds per player
		const totalRounds = room.players.length * 3;
		roomRound.set(room.id, 1);
		roomTotalRounds.set(room.id, totalRounds);
		// Reset platformer scores and bombs for all players
		room.players.forEach((p: IPlayer) => {
			p.score = 0;
			playerPlatformerScore.set(p.id, 0);
			playerLastScoreIncrement.set(p.id, Date.now());
			if (p.isPlatformer) playerBombs.set(p.id, INITIAL_BOMBS);
		});
		roomLastRisingLine.set(room.id, Date.now());

		if (isShared) {
			// Shared mode: one engine for the grid, platformer char lives inside it
			const generator = new PieceGenerator(seed);
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
			// Normal mode: each player gets their own engine and generator (same seed)
			room.players.forEach((p: IPlayer) => {
				const generator = new PieceGenerator(seed);
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

		io.to(room.id).emit('game:start', { seed, round: 1, totalRounds });
		io.to(room.id).emit('game:round_update', {
			round: 1,
			totalRounds,
			scores: Object.fromEntries(room.players.map((p: IPlayer) => [p.id, 0]))
		});

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
		
		const loopId = setInterval(() => gameLoopTick(room), 1000 / 60);

		roomGameLoops.set(room.id, loopId);
		io.emit('room:list', getRoomList());
	});

	function gameLoopTick(room: any) {
			if (roomPaused.get(room.id)) return;
			const now = Date.now();
			let globalStateChanged = false;

			const SCORE_INCREMENT_INTERVAL = 1000;
			const SCORE_POINTS_PER_TICK = 10;

			const RISING_LINE_INTERVAL = 6000;
			const RISING_GAP_SIZE = 0;

			// Rising lines only apply when there is a platformer in the room
			const hasPlatformerInRoom = room.players.some((p: IPlayer) => p.isPlatformer);

			if (hasPlatformerInRoom) {
			const lastRisingLine = roomLastRisingLine.get(room.id) || now;
			if (now - lastRisingLine >= RISING_LINE_INTERVAL) {
				roomLastRisingLine.set(room.id, now);

				if (roomMode.get(room.id) === 'shared') {
					const anyEngine = playerEngines.get(room.players[0]?.id);
					if (anyEngine && anyEngine.state.isAlive) {
						const alive = anyEngine.addRisingLine(RISING_GAP_SIZE);
						if (!alive) {
							platformerDead();
							return;
						}
						globalStateChanged = true;
					}
				} else {
					let someoneDied = false;
					room.players.forEach((p: IPlayer) => {
						const engine = playerEngines.get(p.id);
						if (engine && engine.state.isAlive) {
							const alive = engine.addRisingLine(RISING_GAP_SIZE);
							if (!alive && p.isPlatformer) {
								someoneDied = true;
							}
						}
					});
					if (someoneDied) {
						platformerDead();
						return;
					}
					globalStateChanged = true;
				}
			}
			} // end hasPlatformerInRoom

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
					// Increment platformer score over time
					if (platformerPlayer) {
						const lastScoreInc = playerLastScoreIncrement.get(platformerPlayer.id) || now;
						if (now - lastScoreInc >= SCORE_INCREMENT_INTERVAL) {
							const currentScore = playerPlatformerScore.get(platformerPlayer.id) || 0;
							playerPlatformerScore.set(platformerPlayer.id, currentScore + SCORE_POINTS_PER_TICK);
							platformerPlayer.score = playerPlatformerScore.get(platformerPlayer.id)!;
							playerLastScoreIncrement.set(platformerPlayer.id, now);
							globalStateChanged = true;
						}
					}

					// Tetris gravity
					if (tetrisPlayer) {
						checkTetrisCollision(sharedEngine);
						const lastFall = playerLastFall.get(tetrisPlayer.id) || now;
						if (now - lastFall > sharedEngine.getFallInterval()) {
							const result = sharedEngine.applyAction('down');
							if (result.locked) {
								const spawned = sharedEngine.spawnPiece(playerGenerators.get(tetrisPlayer.id)!.next());
								if (!spawned) {
									tetrisDead();
									return;
								}
							}
							playerLastFall.set(tetrisPlayer.id, now);
							globalStateChanged = true;
						}
					}
					// Platformer char moves at double the tetris fall rate
					if (platformerPlayer) {
						checkPlatformerCollision(sharedEngine);
						const platformerInterval = sharedEngine.getFallInterval() / 10;
						const lastPlatformerFall = playerLastPlatformerFall.get(platformerPlayer.id) || now;
						const fallinterval = sharedEngine.getFallInterval();
						const jumpInterval = fallinterval / 10;
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

					// Increment platformer score over time
					if (p.isPlatformer) {
						const lastScoreInc = playerLastScoreIncrement.get(p.id) || now;
						if (now - lastScoreInc >= SCORE_INCREMENT_INTERVAL) {
							const currentScore = playerPlatformerScore.get(p.id) || 0;
							playerPlatformerScore.set(p.id, currentScore + SCORE_POINTS_PER_TICK);
							p.score = playerPlatformerScore.get(p.id)!;
							playerLastScoreIncrement.set(p.id, now);
							globalStateChanged = true;
						}
					}

					if (now - lastFall > fallInterval) {
						if (!p.isPlatformer) {
							const result = engine.applyAction('down');
							if (result.locked) {
								const spawned = engine.spawnPiece(playerGenerators.get(p.id)!.next());
								handlePenaltyLogic(result.linesCleared, p, room);
								if (!spawned) {
									tetrisDead();
									return;
								}
							}
							playerLastFall.set(p.id, now);
							globalStateChanged = true;
						}
					}

					if (p.isPlatformer) {
						checkPlatformerCollision(engine);
						const platformerInterval = fallInterval / 10;
						const jumpInterval = fallInterval / 10;
						const lastPlatformerFall = playerLastPlatformerFall.get(p.id) || now;
						const char = engine.state.platformerChar;
						if (!(char && char.jumpTicks !== undefined))
							return;
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
	}

	function checkTetrisCollision(engine: GameEngine) {
		const char = engine.state.platformerChar;
		if (!char) return;

		if (checkCollision(engine, char.x, char.y)) {
			if (canMoveTo(engine, char.x, char.y + 1)) {
				char.y++;
			} else {
				engine.state.isAlive = false;
				platformerDead();
			}
		}
	}

	function platformerDead() {
		const room = getRoomByPlayer(socket.id);
		if (!room) return;

		// Find current platformer and tetris players
		const currentPlatformer = room.players.find((p: IPlayer) => p.isPlatformer);
		const currentTetris = room.players.find((p: IPlayer) => !p.isPlatformer);

		if (!currentPlatformer || !currentTetris) return;

		// Increment round counter
		const currentRound = (roomRound.get(room.id) || 1);
		const totalRounds = roomTotalRounds.get(room.id) || 6;
		const nextRound = currentRound + 1;
		roomRound.set(room.id, nextRound);

		// Send round update with scores
		const scores: Record<string, number> = {};
		room.players.forEach((p: IPlayer) => {
			scores[p.id] = playerPlatformerScore.get(p.id) || 0;
		});

		// Check if all rounds are done
		if (nextRound > totalRounds) {
			// Game finished — determine winner
			let winnerInfo: { id: string; name: string; score: number } | null = null;
			let highestScore = -1;
			room.players.forEach((p: IPlayer) => {
				const pScore = playerPlatformerScore.get(p.id) || 0;
				if (pScore > highestScore) {
					highestScore = pScore;
					winnerInfo = { id: p.id, name: p.name, score: pScore };
				}
			});

			// Stop the game loop
			const loopId = roomGameLoops.get(room.id);
			if (loopId) {
				clearInterval(loopId);
				roomGameLoops.delete(room.id);
			}

			io.to(room.id).emit('game:round_update', {
				round: nextRound,
				totalRounds,
				scores,
			});

			io.to(room.id).emit('game:finished', {
				winner: winnerInfo,
				scores,
			});

			// Clean up round tracking
			roomRound.delete(room.id);
			roomTotalRounds.delete(room.id);
			roomLastRisingLine.delete(room.id);
			roomSeed.delete(room.id);
			roomPaused.delete(room.id);
			room.players.forEach((p: IPlayer) => {
					playerPlatformerScore.delete(p.id);
				playerLastScoreIncrement.delete(p.id);
				playerBombs.delete(p.id);
			});

			return;
		}

		// Swap roles: old platformer becomes tetris, old tetris becomes platformer
		currentPlatformer.isPlatformer = false;
		currentTetris.isPlatformer = true;

		// Reset score increment timer for new platformer
		playerLastScoreIncrement.set(currentTetris.id, Date.now());

		// Reset bombs for the new platformer
		playerBombs.set(currentTetris.id, INITIAL_BOMBS);

		// Reset rising line timer for new round
		roomLastRisingLine.set(room.id, Date.now());

		const isShared = roomMode.get(room.id) === 'shared';

		if (isShared) {
			// Shared mode: both players share a single engine — reset it and set up fresh
			const sharedEngine = playerEngines.get(currentPlatformer.id) || playerEngines.get(currentTetris.id);
			if (!sharedEngine) return;

			sharedEngine.reset();
			sharedEngine.state.isAlive = true;

			// Fresh generator for the new round
			const generator = new PieceGenerator(roomSeed.get(room.id));
			sharedEngine.spawnPiece(generator.next());

			// Set up platformer char for the new platformer (was tetris)
			sharedEngine.state.platformerChar = {
				x: 5,
				y: 10,
				vx: 0,
				vy: 0,
				jumpTicks: 0,
				isGrounded: false,
				shape: [{ dx: 0, dy: 0 }]
			};

			// Update references for all players
			room.players.forEach((p: IPlayer) => {
				playerEngines.set(p.id, sharedEngine);
				playerGenerators.set(p.id, generator);
				playerLastFall.set(p.id, Date.now());
				playerLastPlatformerFall.set(p.id, Date.now());
			});
		} else {
			// Normal mode: each player has their own engine and generator (same seed)
			const currentSeed = roomSeed.get(room.id);

			room.players.forEach((p: IPlayer) => {
				const generator = new PieceGenerator(currentSeed);
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

		// Pause the game loop and show round-end feedback
		roomPaused.set(room.id, true);

		// Determine who died (the old platformer) and who is the new platformer
		io.to(room.id).emit('game:round_end', {
			round: currentRound,
			nextRound,
			totalRounds,
			scores,
			reason: 'platformer_died',
			newPlatformer: { id: currentTetris.id, name: currentTetris.name },
			newTetris: { id: currentPlatformer.id, name: currentPlatformer.name },
		});

		setTimeout(() => {
			roomPaused.set(room.id, false);
			io.to(room.id).emit('room:players_updated', room.players);
			io.to(room.id).emit('game:round_update', {
				round: nextRound,
				totalRounds,
				scores,
			});
			broadcastRoomState(io, room);
		}, ROUND_END_PAUSE_MS);
	}

	function tetrisDead() {
		const room = getRoomByPlayer(socket.id);
		if (!room) return;

		// Find current platformer and tetris players
		const currentPlatformer = room.players.find((p: IPlayer) => p.isPlatformer);
		const currentTetris = room.players.find((p: IPlayer) => !p.isPlatformer);

		// Pure tetris mode (no platformer): handle as normal game over
		if (!currentPlatformer) {
			handleNormalTetrisGameOver(room);
			return;
		}

		if (!currentTetris) return;

		// Award 1000 points to the platformer for surviving
		const currentScore = playerPlatformerScore.get(currentPlatformer.id) || 0;
		playerPlatformerScore.set(currentPlatformer.id, currentScore + 1000);
		currentPlatformer.score = playerPlatformerScore.get(currentPlatformer.id)!;

		// Increment round counter
		const currentRound = (roomRound.get(room.id) || 1);
		const totalRounds = roomTotalRounds.get(room.id) || 6;
		const nextRound = currentRound + 1;
		roomRound.set(room.id, nextRound);

		// Send round update with scores
		const scores: Record<string, number> = {};
		room.players.forEach((p: IPlayer) => {
			scores[p.id] = playerPlatformerScore.get(p.id) || 0;
		});

		// Check if all rounds are done
		if (nextRound > totalRounds) {
			let winnerInfo: { id: string; name: string; score: number } | null = null;
			let highestScore = -1;
			room.players.forEach((p: IPlayer) => {
				const pScore = playerPlatformerScore.get(p.id) || 0;
				if (pScore > highestScore) {
					highestScore = pScore;
					winnerInfo = { id: p.id, name: p.name, score: pScore };
				}
			});

			const loopId = roomGameLoops.get(room.id);
			if (loopId) {
				clearInterval(loopId);
				roomGameLoops.delete(room.id);
			}

			io.to(room.id).emit('game:round_update', {
				round: nextRound,
				totalRounds,
				scores,
			});

			io.to(room.id).emit('game:finished', {
				winner: winnerInfo,
				scores,
			});

			roomRound.delete(room.id);
			roomTotalRounds.delete(room.id);
			roomLastRisingLine.delete(room.id);
			roomSeed.delete(room.id);
			roomPaused.delete(room.id);
			room.players.forEach((p: IPlayer) => {
				playerPlatformerScore.delete(p.id);
				playerLastScoreIncrement.delete(p.id);
				playerBombs.delete(p.id);
			});

			return;
		}

		// Swap roles: old platformer becomes tetris, old tetris becomes platformer
		currentPlatformer.isPlatformer = false;
		currentTetris.isPlatformer = true;

		playerLastScoreIncrement.set(currentTetris.id, Date.now());
		playerBombs.set(currentTetris.id, INITIAL_BOMBS);
		roomLastRisingLine.set(room.id, Date.now());

		const isShared = roomMode.get(room.id) === 'shared';

		if (isShared) {
			const sharedEngine = playerEngines.get(currentPlatformer.id) || playerEngines.get(currentTetris.id);
			if (!sharedEngine) return;

			sharedEngine.reset();
			sharedEngine.state.isAlive = true;

			const generator = new PieceGenerator(roomSeed.get(room.id));
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

			room.players.forEach((p: IPlayer) => {
				playerEngines.set(p.id, sharedEngine);
				playerGenerators.set(p.id, generator);
				playerLastFall.set(p.id, Date.now());
				playerLastPlatformerFall.set(p.id, Date.now());
			});
		} else {
			const currentSeed = roomSeed.get(room.id);

			room.players.forEach((p: IPlayer) => {
				const generator = new PieceGenerator(currentSeed);
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

		// Pause the game loop and show round-end feedback
		roomPaused.set(room.id, true);

		io.to(room.id).emit('game:round_end', {
			round: currentRound,
			nextRound,
			totalRounds,
			scores,
			reason: 'tetris_died',
			newPlatformer: { id: currentTetris.id, name: currentTetris.name },
			newTetris: { id: currentPlatformer.id, name: currentPlatformer.name },
		});

		setTimeout(() => {
			roomPaused.set(room.id, false);
			io.to(room.id).emit('room:players_updated', room.players);
			io.to(room.id).emit('game:round_update', {
				round: nextRound,
				totalRounds,
				scores,
			});
			broadcastRoomState(io, room);
		}, ROUND_END_PAUSE_MS);
	}

	function handleNormalTetrisGameOver(room: any) {
		// Stop game loop
		const loopId = roomGameLoops.get(room.id);
		if (loopId) {
			clearInterval(loopId);
			roomGameLoops.delete(room.id);
		}

		// Find the winner: the last alive player, or if all dead pick the one with highest score
		const alivePlayers = room.players.filter((p: IPlayer) => {
			const engine = playerEngines.get(p.id);
			return engine && engine.state.isAlive;
		});

		let winner: IPlayer | null = alivePlayers[0] || null;
		if (!winner) {
			// All dead — pick highest score
			let best: IPlayer | null = null;
			let bestScore = -1;
			room.players.forEach((p: IPlayer) => {
				const engine = playerEngines.get(p.id);
				if (engine && engine.state.score > bestScore) {
					bestScore = engine.state.score;
					best = p;
				}
			});
			winner = best;
		}

		// Reset ready state for all players
		room.players.forEach((p: IPlayer) => {
			p.isReady = false;
			p.isAlive = true;
		});

		io.to(room.id).emit('game:over', {
			winner: winner ? { id: winner.id, name: winner.name, score: playerEngines.get(winner.id)?.state.score || 0 } : null,
		});

		io.to(room.id).emit('room:players_updated', room.players);

		// Clean up engine state
		room.players.forEach((p: IPlayer) => {
			playerEngines.delete(p.id);
			playerGenerators.delete(p.id);
			playerLastFall.delete(p.id);
			playerLastPlatformerFall.delete(p.id);
		});
		roomSeed.delete(room.id);
		roomMode.delete(room.id);
	}

	function movePlaformerChar(engine: GameEngine, action: string) {
		const char = engine.state.platformerChar;
		if (!char) return;

		if (checkCollision(engine, char.x, char.y)) {
			if (action === 'left' && canMoveTo(engine, char.x - 1, char.y)) {
				char.x--;
			} else if (action === 'right' && canMoveTo(engine, char.x + 1, char.y)) {
				char.x++;
			}
		}
	}

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

			if (action === 'left' || action === 'right')
				movePlaformerChar(engine, action);

			if (result.locked) {
				const gen = playerGenerators.get(socket.id)!;
				const spawned = engine.spawnPiece(gen.next());
				if (!spawned) {
					tetrisDead();
					return;
				}
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
			case 'down':
				placeBomb(engine);
				break;
		}
	}

	function placeBomb(engine: any) {
		const char = engine.state.platformerChar;
		if (!char) return;

		const currentBombs = playerBombs.get(socket.id) || 0;
		if (currentBombs <= 0) return;
		playerBombs.set(socket.id, currentBombs - 1);
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

	function checkPlatformerCollision(engine: any) {
		const char = engine.state.platformerChar;
		if (!char) return;
		// if (checkCollision(engine, char.x, char.y))
		// 	engine.state.isAlive = false;
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

		const engine = playerEngines.get(socket.id);
		if (engine) engine.state.isAlive = false;

		// Check if game is over (only 1 or 0 alive)
		const alivePlayers = room.players.filter((p) => {
			const eng = playerEngines.get(p.id);
			return eng && eng.state.isAlive;
		});
		if (alivePlayers.length <= 1) {
			handleNormalTetrisGameOver(room);
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
            displayGrid: sharedGrid,
            platformerScore: playerPlatformerScore.get(p.id) || 0,
            bombs: playerBombs.get(p.id) ?? 0
        }));
        io.to(room.id).emit('game:state_update', roomState);
    } else {
        const roomState = room.players.map((p: IPlayer) => {
            const engine = playerEngines.get(p.id);
            return {
                id: p.id,
                state: engine?.state,
                displayGrid: engine?.getGridWithPiece(),
                platformerScore: playerPlatformerScore.get(p.id) || 0,
                bombs: playerBombs.get(p.id) ?? 0
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
		roomRound.delete(result.room.id);
		roomTotalRounds.delete(result.room.id);
		roomLastRisingLine.delete(result.room.id);
		roomSeed.delete(result.room.id);
		roomPaused.delete(result.room.id);
	} else {
		io.to(result.room.id).emit('room:players_updated', result.room.players);
		io.to(result.room.id).emit('room:player_left', socket.id);
	}

	io.emit('room:list', getRoomList());
}
