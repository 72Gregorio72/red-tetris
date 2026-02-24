import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import type { IRoom, IRoomListItem } from '../../server/types/multiplayer';
import type { IPlayer } from '../../server/types/player';
import type { IGameState } from '../../server/types/game';

export interface IOpponentState {
	playerId: string;
	playerName: string;
	grid: number[][];
	score: number;
	level: number;
	linesCleared: number;
	isAlive: boolean;
}

export const useMultiplayerStore = defineStore('multiplayer', () => {
  const currentRoom = ref<IRoom | null>(null);

  const rooms = ref<IRoomListItem[]>([]);

  const opponents = reactive<Record<string, number[][]>>({});

  const opponentPieces = reactive<Record<string, { row: number; col: number }[]>>({});

  const gameSeed = ref<string>('');

  const isInRoom = computed(() => currentRoom.value !== null);

  const isAlive = computed(() => {
	if (!currentRoom.value) return false;
	const player = currentRoom.value.players.find(p => p.id === currentRoom.value?.host?.id);
	return player ? player.isAlive : false;
  });

  const myGameState = ref<IGameState | null>(null);
  const opponentsState = ref<{ id: string, state: IGameState }[]>([]);
  const myDisplayGrid = ref<number[][] | null>(null);

  const isHost = computed(() => {
    return (playerId: string) => currentRoom.value?.host?.id === playerId;
  });

  const playerCount = computed(() => currentRoom.value?.players.length ?? 0);

  function setRooms(roomList: IRoomListItem[]) {
    rooms.value = roomList;
  }

  function joinRoom(room: IRoom) {
    currentRoom.value = room;
  }

  function leaveRoom() {
	currentRoom.value = null;
	for (const key in opponents) {
		delete opponents[key];
	}
	for (const key in opponentPieces) {
		delete opponentPieces[key];
	}
  }

  function updatePlayers(players: IPlayer[]) {
    if (currentRoom.value) {
      currentRoom.value.players = players;
    }
  }

  const moveSpeed = ref(100);

  function updateBlockPosition() {
	const lastMoveTime = ref(Date.now());

	const update = () => {
		const now = Date.now();
		if (now - lastMoveTime.value >= moveSpeed.value) {
			lastMoveTime.value = now;
		}
		requestAnimationFrame(update);
	};

	requestAnimationFrame(update);
  }

  function setOpponentGrid(playerId: string, grid: number[][]) {
	opponents[playerId] = grid;
  }

  function setOpponentPiece(playerId: string, cells: { row: number; col: number }[]) {
	opponentPieces[playerId] = cells;
  }

  function removeOpponent(playerId: string) {
	delete opponents[playerId];
	delete opponentPieces[playerId];
  }

  function setGameSeed(seed: string) {
    gameSeed.value = seed;
  }

  function reset() {
    currentRoom.value = null;
    rooms.value = [];
    gameSeed.value = '';

	myGameState.value = null;
    opponentsState.value = [];

	for (const key in opponents) {
		delete opponents[key];
	}
	for (const key in opponentPieces) {
		delete opponentPieces[key];
	}
  }

  return {
    currentRoom, rooms, opponents, opponentPieces, gameSeed,
    isInRoom, isHost, playerCount,
    setRooms, joinRoom, leaveRoom, updatePlayers,
    setOpponentGrid, setOpponentPiece, removeOpponent, setGameSeed, reset,
	updateBlockPosition, myGameState, opponentsState, isAlive, myDisplayGrid
  };
});