import type { Server, Socket } from 'socket.io';
import type { IPlayer } from '../types/player';
import {
	createRoom,
	joinRoom,
	leaveRoom,
	getRoomByPlayer,
	getRoomList,
} from '../game/RoomManager';

// Mappa socketId -> IPlayer per tenere traccia dei giocatori connessi
const players = new Map<string, IPlayer>();

export function registerSocketHandlers(io: Server, socket: Socket) {
	console.log(`[Socket] Client connected: ${socket.id}`);

	// ─── player:register ─────────────────────────────────────────
	// Il client invia { name } per registrarsi
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

		// Conferma al client con i suoi dati
		socket.emit('player:registered', player);
	});

	// ─── room:list ───────────────────────────────────────────────
	// Il client chiede la lista delle room
	socket.on('room:list', () => {
		socket.emit('room:list', getRoomList());
	});

	// ─── room:create ─────────────────────────────────────────────
	// Il client crea una room con { name }
	socket.on('room:create', ({ name }: { name: string }) => {
		const player = players.get(socket.id);
		console.log(`[Socket] ${player?.name} is creating a room with name: ${name}`);
		if (!player) return;

		const room = createRoom(name, player);
		socket.join(room.id); // Entra nella "stanza" Socket.io

		console.log(`[Socket] Room created: ${room.name} by ${player.name}`);

		// Conferma al creatore
		socket.emit('room:joined', room);

		// Aggiorna la lista room per tutti
		io.emit('room:list', getRoomList());
		console.log('Current rooms:');
	});

	// ─── room:join ───────────────────────────────────────────────
	// Il client entra in una room esistente con { roomId }
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

		// Conferma al giocatore
		socket.emit('room:joined', room);

		// Notifica tutti nella room che la lista giocatori è cambiata
		io.to(room.id).emit('room:players_updated', room.players);

		// Aggiorna la lista room per tutti
		io.emit('room:list', getRoomList());
	});

	// ─── room:leave ──────────────────────────────────────────────
	socket.on('room:leave', () => {
		handleLeaveRoom(io, socket);
	});

	// ─── player:ready ────────────────────────────────────────────
	socket.on('player:ready', ({ isReady }: { isReady: boolean }) => {
		const player = players.get(socket.id);
		if (!player) return;

		player.isReady = isReady;

		const room = getRoomByPlayer(socket.id);
		if (!room) return;

		// Aggiorna tutti nella room
		io.to(room.id).emit('room:players_updated', room.players);
	});

	// ─── game:start ──────────────────────────────────────────────
	// Solo l'host può avviare la partita
	socket.on('game:start', () => {
		const room = getRoomByPlayer(socket.id);
		if (!room) return;
		if (room.host.id !== socket.id) return; // Solo l'host

		console.log(`[Socket] Game starting in room ${room.name}`);

		// Notifica tutti nella room
		io.to(room.id).emit('game:start');

		// Aggiorna la lista room (stato cambiato)
		io.emit('room:list', getRoomList());
	});

	// ─── game:grid_update ────────────────────────────────────────
	// Un giocatore manda la propria griglia aggiornata
	socket.on('game:grid_update', ({ grid }: { grid: number[][] }) => {
		const room = getRoomByPlayer(socket.id);
		if (!room) return;

		// Invia la griglia a tutti gli ALTRI nella room
		socket.to(room.id).emit('game:opponent_grid', {
			playerId: socket.id,
			grid,
		});
	});

	// ─── game:over ───────────────────────────────────────────────
	// Un giocatore ha perso
	socket.on('game:over', () => {
		const player = players.get(socket.id);
		if (!player) return;
		player.isAlive = false;

		const room = getRoomByPlayer(socket.id);
		if (!room) return;

		// Controlla quanti sono ancora vivi
		const alive = room.players.filter((p) => p.isAlive);
		if (alive.length <= 1) {
			// Partita finita, notifica tutti
			io.to(room.id).emit('game:over', {
				winner: alive[0] || null,
			});
		}
	});

	// ─── disconnect ──────────────────────────────────────────────
	socket.on('disconnect', () => {
		console.log(`[Socket] Client disconnected: ${socket.id}`);
		handleLeaveRoom(io, socket);
		players.delete(socket.id);
	});
}

// Gestisce l'uscita da una room (usata sia da room:leave che da disconnect)
function handleLeaveRoom(io: Server, socket: Socket) {
	const result = leaveRoom(socket.id);
	if (!result) return;

	socket.leave(result.room.id);

	if (!result.isEmpty) {
		// Notifica i rimasti
		io.to(result.room.id).emit('room:players_updated', result.room.players);
		io.to(result.room.id).emit('room:player_left', socket.id);
	}

	// Aggiorna la lista room per tutti
	io.emit('room:list', getRoomList());
}
