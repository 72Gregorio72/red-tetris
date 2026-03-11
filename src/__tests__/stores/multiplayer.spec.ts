import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMultiplayerStore } from '../../stores/multiplayer';
import type { IPlayer } from '../../../server/types/player';

function makePlayer(id: string, name: string): IPlayer {
  return {
    id, name, score: 0, isConnected: true, isAlive: true, isReady: false, isPlatformer: false, life: 0,
  };
}

describe('useMultiplayerStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('starts with no room and empty rooms list', () => {
      const store = useMultiplayerStore();
      expect(store.currentRoom).toBeNull();
      expect(store.rooms).toEqual([]);
    });

    it('isInRoom is false initially', () => {
      const store = useMultiplayerStore();
      expect(store.isInRoom).toBe(false);
    });

    it('playerCount is 0 initially', () => {
      const store = useMultiplayerStore();
      expect(store.playerCount).toBe(0);
    });

    it('gameSeed starts empty', () => {
      const store = useMultiplayerStore();
      expect(store.gameSeed).toBe('');
    });

    it('game state starts null', () => {
      const store = useMultiplayerStore();
      expect(store.myGameState).toBeNull();
      expect(store.myDisplayGrid).toBeNull();
    });

    it('game finished state is false initially', () => {
      const store = useMultiplayerStore();
      expect(store.gameFinished).toBe(false);
      expect(store.gameWinner).toBeNull();
      expect(store.normalGameOver).toBe(false);
      expect(store.normalGameWinner).toBeNull();
    });

    it('round tracking starts at 0', () => {
      const store = useMultiplayerStore();
      expect(store.currentRound).toBe(0);
      expect(store.totalRounds).toBe(0);
    });
  });

  describe('setRooms', () => {
    it('sets the rooms list', () => {
      const store = useMultiplayerStore();
      const roomList = [
        { id: 'r1', name: 'Room1', hostName: 'Host', playerCount: 1, maxPlayers: 3 },
      ];
      store.setRooms(roomList);
      expect(store.rooms).toEqual(roomList);
      expect(store.rooms.length).toBe(1);
    });
  });

  describe('joinRoom', () => {
    it('sets the current room', () => {
      const store = useMultiplayerStore();
      const host = makePlayer('p1', 'Alice');
      const room = {
        id: 'r1', name: 'TestRoom', host, players: [host], gameState: null,
      };
      store.joinRoom(room);
      expect(store.currentRoom).toEqual(room);
      expect(store.isInRoom).toBe(true);
    });
  });

  describe('leaveRoom', () => {
    it('clears the current room and opponents', () => {
      const store = useMultiplayerStore();
      const host = makePlayer('p1', 'Alice');
      store.joinRoom({ id: 'r1', name: 'Room', host, players: [host], gameState: null });
      store.setOpponentGrid('opp1', [[1]]);
      store.setOpponentPiece('opp1', [{ row: 0, col: 0 }]);

      store.leaveRoom();

      expect(store.currentRoom).toBeNull();
      expect(store.isInRoom).toBe(false);
      expect(store.opponents['opp1']).toBeUndefined();
      expect(store.opponentPieces['opp1']).toBeUndefined();
    });
  });

  describe('updatePlayers', () => {
    it('updates the players list in the current room', () => {
      const store = useMultiplayerStore();
      const host = makePlayer('p1', 'Alice');
      store.joinRoom({ id: 'r1', name: 'Room', host, players: [host], gameState: null });
      
      const newPlayers = [host, makePlayer('p2', 'Bob')];
      store.updatePlayers(newPlayers);
      
      expect(store.currentRoom!.players.length).toBe(2);
      expect(store.currentRoom!.players[1].name).toBe('Bob');
    });

    it('does nothing if no current room', () => {
      const store = useMultiplayerStore();
      store.updatePlayers([makePlayer('p1', 'Alice')]);
      expect(store.currentRoom).toBeNull();
    });
  });

  describe('opponent management', () => {
    it('setOpponentGrid stores grid for a player', () => {
      const store = useMultiplayerStore();
      const grid = [[1, 2], [3, 4]];
      store.setOpponentGrid('opp1', grid);
      expect(store.opponents['opp1']).toEqual(grid);
    });

    it('setOpponentPiece stores piece cells for a player', () => {
      const store = useMultiplayerStore();
      const cells = [{ row: 5, col: 3 }];
      store.setOpponentPiece('opp1', cells);
      expect(store.opponentPieces['opp1']).toEqual(cells);
    });

    it('removeOpponent removes grid and pieces', () => {
      const store = useMultiplayerStore();
      store.setOpponentGrid('opp1', [[1]]);
      store.setOpponentPiece('opp1', [{ row: 0, col: 0 }]);

      store.removeOpponent('opp1');
      expect(store.opponents['opp1']).toBeUndefined();
      expect(store.opponentPieces['opp1']).toBeUndefined();
    });
  });

  describe('setGameSeed', () => {
    it('stores the game seed', () => {
      const store = useMultiplayerStore();
      store.setGameSeed('abc123');
      expect(store.gameSeed).toBe('abc123');
    });
  });

  describe('isHost', () => {
    it('returns true for the host player id', () => {
      const store = useMultiplayerStore();
      const host = makePlayer('host-1', 'HostPlayer');
      store.joinRoom({ id: 'r1', name: 'Room', host, players: [host], gameState: null });
      expect(store.isHost('host-1')).toBe(true);
    });

    it('returns false for non-host player', () => {
      const store = useMultiplayerStore();
      const host = makePlayer('host-1', 'HostPlayer');
      store.joinRoom({ id: 'r1', name: 'Room', host, players: [host], gameState: null });
      expect(store.isHost('other-player')).toBe(false);
    });
  });

  describe('playerCount', () => {
    it('returns the number of players in the room', () => {
      const store = useMultiplayerStore();
      const host = makePlayer('h1', 'Host');
      const p2 = makePlayer('p2', 'P2');
      store.joinRoom({ id: 'r1', name: 'Room', host, players: [host, p2], gameState: null });
      expect(store.playerCount).toBe(2);
    });
  });

  describe('platformerMode', () => {
    it('returns false when no room', () => {
      const store = useMultiplayerStore();
      expect(store.platformerMode).toBe(false);
    });

    it('returns false when no platformer player', () => {
      const store = useMultiplayerStore();
      const host = makePlayer('h1', 'Host');
      store.joinRoom({ id: 'r1', name: 'Room', host, players: [host], gameState: null });
      expect(store.platformerMode).toBe(false);
    });

    it('returns true when room has platformer and tetris players', () => {
      const store = useMultiplayerStore();
      const host = makePlayer('h1', 'Host');
      const platformer = makePlayer('p2', 'Platformer');
      platformer.isPlatformer = true;
      store.joinRoom({
        id: 'r1', name: 'Room', host,
        players: [host, platformer], gameState: null,
      });
      expect(store.platformerMode).toBe(true);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      const store = useMultiplayerStore();
      const host = makePlayer('h1', 'Host');
      store.joinRoom({ id: 'r1', name: 'Room', host, players: [host], gameState: null });
      store.setGameSeed('seed');
      store.setOpponentGrid('opp1', [[1]]);
      store.gameFinished = true;
      store.gameWinner = { id: '1', name: 'W', score: 100 };
      store.currentRound = 5;
      store.totalRounds = 10;
      store.myPlatformerScore = 500;
      store.myBombs = 1;
      store.normalGameOver = true;
      store.normalGameWinner = { id: '2', name: 'X', score: 200 };
      store.myNextPieces = ['I', 'T'];

      store.reset();

      expect(store.currentRoom).toBeNull();
      expect(store.rooms).toEqual([]);
      expect(store.gameSeed).toBe('');
      expect(store.opponents['opp1']).toBeUndefined();
      expect(store.gameFinished).toBe(false);
      expect(store.gameWinner).toBeNull();
      expect(store.currentRound).toBe(0);
      expect(store.totalRounds).toBe(0);
      expect(store.myPlatformerScore).toBe(0);
      expect(store.myBombs).toBe(3);
      expect(store.normalGameOver).toBe(false);
      expect(store.normalGameWinner).toBeNull();
      expect(store.myNextPieces).toEqual([]);
      expect(store.myGameState).toBeNull();
      expect(store.charPos).toBeNull();
      expect(store.roundEndInfo).toBeNull();
    });
  });
});
