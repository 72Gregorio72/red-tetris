import { useSocket } from './useSocket';
import { useMultiplayerStore } from '../stores/multiplayer';
import { usePlayerStore } from '../stores/player';
import { useGameStore } from '../stores/game';
import { useRouter } from 'vue-router';

export function useMultiplayer() {
	  const multiplayerStore = useMultiplayerStore();
	  const playerStore = usePlayerStore();
	  const gameStore = useGameStore();
	  const router = useRouter();
const { on, off, emit } = useSocket();

	  function registerListeners() {
		on('room:list', (rooms) => {
			multiplayerStore.setRooms(rooms);
		});

		on('room:joined', (room) => {
			multiplayerStore.joinRoom(room);
		});

		on('room:players_updated', (players) => {
			multiplayerStore.updatePlayers(players);
		});

		on('room:player_left', (playerId: string) => {
			multiplayerStore.removeOpponent(playerId);
		});

		on('game:start', () => {
			gameStore.setStatus('playing');
			router.push('/multiplayer');
		});

		on('game:opponent_grid', ({ playerId, grid }) => {
			multiplayerStore.setOpponentGrid(playerId, grid);
		});

		on('game:over', () => {
			gameStore.setStatus('finished');
		});

		on('player:registered', (player) => {
			playerStore.setPlayer(player);
		});
	}

	function unregisterListeners() {
		off('room:list');
		off('room:joined');
		off('room:players_updated');
		off('room:player_left');
		off('game:start');
		off('game:opponent_grid');
		off('game:over');
		off('player:registered');
	}

	function connect() {
		emit('player:register', { name: playerStore.player?.name });
		emit('room:list');
	}

	function createRoom(name: string) {
		emit('room:create', { name });
		console.log('Creating room with name:', name);
	}

	function joinRoom(roomId: string) {
		emit('room:join', { roomId });
	}

	function leaveRoom() {
		emit('room:leave');
		multiplayerStore.leaveRoom();
		router.push('/');
	}

	function toggleReady(isReady: boolean) {
		emit('player:ready', { isReady });
	}

	function startGame() {
		emit('game:start');
	}

	function fetchRooms() {
		emit('room:list');
	}

	function registerPlayer(name: string) {
		emit('player:register', { name });
	}
	  
	return { 
		registerListeners,
		unregisterListeners,
		emit,
		connect,
		createRoom,
		joinRoom,
		leaveRoom,
		toggleReady,
		startGame,
		fetchRooms,
		registerPlayer,
	};
}