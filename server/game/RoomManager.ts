import type { IPlayer } from '../types/player';
import type { IRoom, IRoomListItem } from '../types/multiplayer';

let roomIdCounter = 0;

function generateRoomId(): string {
	return `room_${++roomIdCounter}`;
}

// Tutte le room attive, chiave = room.id
const rooms = new Map<string, IRoom>();

// Mappa socketId -> roomId per sapere in che room è ogni giocatore
const playerRoomMap = new Map<string, string>();

export function createRoom(name: string, host: IPlayer): IRoom {
	const room: IRoom = {
		id: generateRoomId(),
		name,
		host,
		players: [host],
		gameState: null,
	};
	rooms.set(room.id, room);
	playerRoomMap.set(host.id, room.id);
	return room;
}

export function joinRoom(roomId: string, player: IPlayer): IRoom | null {
	const room = rooms.get(roomId);
	if (!room) return null;
	if (room.players.length >= 4) return null; // max 4 giocatori
	if (room.players.find((p) => p.id === player.id)) return room; // già dentro

	room.players.push(player);
	playerRoomMap.set(player.id, roomId);
	return room;
}

export function leaveRoom(playerId: string): { room: IRoom; isEmpty: boolean } | null {
	const roomId = playerRoomMap.get(playerId);
	if (!roomId) return null;

	const room = rooms.get(roomId);
	if (!room) return null;

	room.players = room.players.filter((p) => p.id !== playerId);
	playerRoomMap.delete(playerId);

	// Se la room è vuota, la eliminiamo
	if (room.players.length === 0) {
		rooms.delete(roomId);
		return { room, isEmpty: true };
	}

	// Se l'host è uscito, assegna il nuovo host al primo giocatore
	if (room.host.id === playerId && room.players.length > 0) {
		room.host = room.players[0];
	}

	return { room, isEmpty: false };
}

export function getRoom(roomId: string): IRoom | undefined {
	return rooms.get(roomId);
}

export function getRoomByPlayer(playerId: string): IRoom | undefined {
	const roomId = playerRoomMap.get(playerId);
	if (!roomId) return undefined;
	return rooms.get(roomId);
}

export function getRoomList(): IRoomListItem[] {
	const list: IRoomListItem[] = [];
	for (const room of rooms.values()) {
		list.push({
			id: room.id,
			name: room.name,
			hostName: room.host.name,
			playerCount: room.players.length,
			maxPlayers: 3,
		});
	}
	return list;
}
