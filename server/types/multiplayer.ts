import type { IPlayer } from './player';
import type { IGameState } from './game';

export interface IRoom {
	id: string;
	name: string;
	host: IPlayer;
	players: IPlayer[];
	gameState: IGameState | null;
}

export interface IRoomListItem {
	id: string;
	name: string;
	hostName: string;
	playerCount: number;
	maxPlayers: number;
}