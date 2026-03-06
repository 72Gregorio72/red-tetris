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

		on('game:start', ({ seed }: { seed: string; round: number; totalRounds: number }) => {
			multiplayerStore.setGameSeed(seed);
			multiplayerStore.gameFinished = false;
			multiplayerStore.gameWinner = null;
			multiplayerStore.normalGameOver = false;
			multiplayerStore.normalGameWinner = null;
			gameStore.setStatus('playing');
			router.push('/multiplayer');
		});

		on('game:round_update', ({ round, totalRounds, scores }: { round: number; totalRounds: number; scores: Record<string, number> }) => {
			multiplayerStore.currentRound = round;
			multiplayerStore.totalRounds = totalRounds;
			multiplayerStore.playerScores = scores;
		});

		on('game:finished', ({ winner, scores }: { winner: { id: string; name: string; score: number } | null; scores: Record<string, number> }) => {
			multiplayerStore.gameFinished = true;
			multiplayerStore.gameWinner = winner;
			multiplayerStore.playerScores = scores;
			gameStore.setStatus('finished');
		});

		on('game:opponent_grid', ({ playerId, grid }) => {
			multiplayerStore.setOpponentGrid(playerId, grid);
		});

		on('game:opponent_piece', ({ playerId, cells }) => {
			multiplayerStore.setOpponentPiece(playerId, cells);
		});

		on('game:over', ({ winner }: { winner: { id: string; name: string; score: number } | null }) => {
			multiplayerStore.normalGameOver = true;
			multiplayerStore.normalGameWinner = winner;
			gameStore.setStatus('finished');
		});

		on('player:registered', (player) => {
			playerStore.setPlayer(player);
		});

		on('game:attack', ({ lines }: { lines: number }) => {
			gameStore.receiveAttack(lines);
		});
	}

	function unregisterListeners() {
		off('room:list');
		off('room:joined');
		off('room:players_updated');
		off('room:player_left');
		off('game:start');
		off('game:round_update');
		off('game:finished');
		off('game:opponent_grid');
		off('game:opponent_piece');
		off('game:over');
		off('player:registered');
		off('game:attack');
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

	function setPlatformerMode(isEnabled: boolean) {
		emit('game:toggle_platformer', { enabled: isEnabled });
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
		setPlatformerMode
	};
}