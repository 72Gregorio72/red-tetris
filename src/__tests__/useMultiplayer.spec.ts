import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock useRouter
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock socket
const mockOn = vi.fn();
const mockOff = vi.fn();
const mockEmit = vi.fn();
vi.mock('../composables/useSocket', () => ({
  useSocket: () => ({
    on: mockOn,
    off: mockOff,
    emit: mockEmit,
    socket: { value: { id: 'test-socket' } },
  }),
}));

import { useMultiplayer } from '../composables/useMultiplayer';
import { useMultiplayerStore } from '../stores/multiplayer';
import { usePlayerStore } from '../stores/player';
import { useGameStore } from '../stores/game';

describe('useMultiplayer', () => {
  let mp: ReturnType<typeof useMultiplayer>;

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mp = useMultiplayer();
  });

  describe('registerListeners', () => {
    it('registers all socket event listeners', () => {
      mp.registerListeners();
      const events = mockOn.mock.calls.map((c: any) => c[0]);
      expect(events).toContain('room:list');
      expect(events).toContain('room:joined');
      expect(events).toContain('room:players_updated');
      expect(events).toContain('room:player_left');
      expect(events).toContain('game:start');
      expect(events).toContain('game:round_update');
      expect(events).toContain('game:finished');
      expect(events).toContain('game:opponent_grid');
      expect(events).toContain('game:opponent_piece');
      expect(events).toContain('game:over');
      expect(events).toContain('game:round_end');
      expect(events).toContain('player:registered');
      expect(events).toContain('game:attack');
    });

    it('room:list callback sets rooms', () => {
      mp.registerListeners();
      const roomListCb = mockOn.mock.calls.find((c: any) => c[0] === 'room:list')[1];
      const rooms = [{ id: '1', name: 'R1', playerCount: 1, maxPlayers: 4 }];
      roomListCb(rooms);
      const store = useMultiplayerStore();
      expect(store.rooms).toEqual(rooms);
    });

    it('room:joined callback joins room in store', () => {
      mp.registerListeners();
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'room:joined')[1];
      const room = { id: 'r1', name: 'Room1', host: { id: 'h1' }, players: [] };
      cb(room);
      const store = useMultiplayerStore();
      expect(store.currentRoom).toEqual(room);
    });

    it('room:players_updated callback updates players and syncs ready state', () => {
      mp.registerListeners();
      const playerStore = usePlayerStore();
      playerStore.setPlayer({ id: 'test-socket', name: 'Me', score: 0, isConnected: true, isAlive: true, isReady: false });

      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'room:players_updated')[1];
      const players = [
        { id: 'test-socket', name: 'Me', isReady: true },
        { id: 'other', name: 'Other', isReady: false },
      ];
      cb(players);
      expect(playerStore.player!.isReady).toBe(true);
    });

    it('room:player_left callback removes opponent', () => {
      mp.registerListeners();
      const store = useMultiplayerStore();
      store.opponents['left-player'] = [[]];
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'room:player_left')[1];
      cb('left-player');
      expect(store.opponents['left-player']).toBeUndefined();
    });

    it('game:start callback sets game state and navigates', () => {
      mp.registerListeners();
      const multiStore = useMultiplayerStore();
      const gameStore = useGameStore();
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'game:start')[1];
      cb({ seed: 'abc123', round: 1, totalRounds: 6 });
      expect(multiStore.gameSeed).toBe('abc123');
      expect(multiStore.gameFinished).toBe(false);
      expect(multiStore.gameWinner).toBe(null);
      expect(gameStore.status).toBe('playing');
      expect(mockPush).toHaveBeenCalledWith('/multiplayer');
    });

    it('game:round_update callback updates round info', () => {
      mp.registerListeners();
      const store = useMultiplayerStore();
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'game:round_update')[1];
      cb({ round: 2, totalRounds: 6, scores: { a: 100, b: 200 } });
      expect(store.currentRound).toBe(2);
      expect(store.totalRounds).toBe(6);
      expect(store.playerScores).toEqual({ a: 100, b: 200 });
      expect(store.roundEndInfo).toBeNull();
    });

    it('game:finished callback sets game finished state', () => {
      mp.registerListeners();
      const multiStore = useMultiplayerStore();
      const gameStore = useGameStore();
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'game:finished')[1];
      cb({ winner: { id: 'w1', name: 'Winner', score: 500 }, scores: { w1: 500 } });
      expect(multiStore.gameFinished).toBe(true);
      expect(multiStore.gameWinner).toEqual({ id: 'w1', name: 'Winner', score: 500 });
      expect(gameStore.status).toBe('finished');
    });

    it('game:opponent_grid callback sets opponent grid', () => {
      mp.registerListeners();
      const store = useMultiplayerStore();
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'game:opponent_grid')[1];
      cb({ playerId: 'opp1', grid: [[1, 0]] });
      expect(store.opponents['opp1']).toEqual([[1, 0]]);
    });

    it('game:opponent_piece callback sets opponent piece', () => {
      mp.registerListeners();
      const store = useMultiplayerStore();
      const opponentPieceCb = mockOn.mock.calls.find((c: any) => c[0] === 'game:opponent_piece')[1];
      opponentPieceCb({ playerId: 'opp2', cells: [{ row: 1, col: 5 }] });
      expect(store.opponentPieces['opp2']).toEqual([{ row: 1, col: 5 }]);
    });

    it('game:over callback sets normal game over state', () => {
      mp.registerListeners();
      const multiStore = useMultiplayerStore();
      const gameStore = useGameStore();
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'game:over')[1];
      cb({ winner: { id: 'w2', name: 'W2', score: 300 } });
      expect(multiStore.normalGameOver).toBe(true);
      expect(multiStore.normalGameWinner).toEqual({ id: 'w2', name: 'W2', score: 300 });
      expect(gameStore.status).toBe('finished');
    });

    it('game:round_end callback sets round end info', () => {
      mp.registerListeners();
      const store = useMultiplayerStore();
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'game:round_end')[1];
      const data = { round: 1, reason: 'platformer_died' };
      cb(data);
      expect(store.roundEndInfo).toEqual(data);
    });

    it('player:registered callback sets player', () => {
      mp.registerListeners();
      const playerStore = usePlayerStore();
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'player:registered')[1];
      const player = { id: 'p1', name: 'Test' };
      cb(player);
      expect(playerStore.player).toEqual(player);
    });

    it('game:attack callback receives attack lines', () => {
      mp.registerListeners();
      const gameStore = useGameStore();
      const cb = mockOn.mock.calls.find((c: any) => c[0] === 'game:attack')[1];
      cb({ lines: 3 });
      expect(gameStore.pendingAttackLines).toBe(3);
    });
  });

  describe('unregisterListeners', () => {
    it('unregisters all socket event listeners', () => {
      mp.unregisterListeners();
      const events = mockOff.mock.calls.map((c: any) => c[0]);
      expect(events).toContain('room:list');
      expect(events).toContain('room:joined');
      expect(events).toContain('room:players_updated');
      expect(events).toContain('room:player_left');
      expect(events).toContain('game:start');
      expect(events).toContain('game:round_update');
      expect(events).toContain('game:finished');
      expect(events).toContain('game:opponent_grid');
      expect(events).toContain('game:opponent_piece');
      expect(events).toContain('game:over');
      expect(events).toContain('game:round_end');
      expect(events).toContain('player:registered');
      expect(events).toContain('game:attack');
    });
  });

  describe('action methods', () => {
    it('connect sends register and room:list', () => {
      const playerStore = usePlayerStore();
      playerStore.setPlayer({ id: 'x', name: 'Tester', score: 0, isConnected: true, isAlive: true, isReady: false });
      mp.connect();
      expect(mockEmit).toHaveBeenCalledWith('player:register', { name: 'Tester' });
      expect(mockEmit).toHaveBeenCalledWith('room:list');
    });

    it('createRoom emits room:create', () => {
      mp.createRoom('TestRoom');
      expect(mockEmit).toHaveBeenCalledWith('room:create', { name: 'TestRoom' });
    });

    it('joinRoom emits room:join', () => {
      mp.joinRoom('room-123');
      expect(mockEmit).toHaveBeenCalledWith('room:join', { roomId: 'room-123' });
    });

    it('leaveRoom emits and navigates to /', () => {
      mp.leaveRoom();
      expect(mockEmit).toHaveBeenCalledWith('room:leave');
      expect(mockPush).toHaveBeenCalledWith('/');
    });

    it('toggleReady emits player:ready', () => {
      mp.toggleReady(true);
      expect(mockEmit).toHaveBeenCalledWith('player:ready', { isReady: true });
    });

    it('startGame emits game:start', () => {
      mp.startGame();
      expect(mockEmit).toHaveBeenCalledWith('game:start');
    });

    it('fetchRooms emits room:list', () => {
      mp.fetchRooms();
      expect(mockEmit).toHaveBeenCalledWith('room:list');
    });

    it('registerPlayer emits player:register', () => {
      mp.registerPlayer('NewPlayer');
      expect(mockEmit).toHaveBeenCalledWith('player:register', { name: 'NewPlayer' });
    });

    it('setPlatformerMode emits game:toggle_platformer', () => {
      mp.setPlatformerMode(true);
      expect(mockEmit).toHaveBeenCalledWith('game:toggle_platformer', { enabled: true });
    });
  });
});
