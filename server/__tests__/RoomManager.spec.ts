import { describe, it, expect, beforeEach } from 'vitest';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoom,
  getRoomByPlayer,
  getRoomList,
} from '../game/RoomManager';
import type { IPlayer } from '../types/player';

function makePlayer(id: string, name: string): IPlayer {
  return {
    id,
    name,
    score: 0,
    isConnected: true,
    isAlive: true,
    isReady: false,
    isPlatformer: false,
    life: 0,
  };
}

describe('RoomManager', () => {
  // Note: RoomManager uses module-level Maps, so tests may interact.
  // We'll use unique player/room names per test.

  describe('createRoom', () => {
    it('creates a room and returns it', () => {
      const host = makePlayer('p1', 'Alice');
      const room = createRoom('TestRoom1', host);

      expect(room).toBeDefined();
      expect(room.name).toBe('TestRoom1');
      expect(room.host).toBe(host);
      expect(room.players).toContain(host);
      expect(room.players.length).toBe(1);
      expect(room.gameState).toBeNull();
      expect(room.id).toBeDefined();
    });

    it('assigns unique room IDs', () => {
      const host1 = makePlayer('p2', 'Bob');
      const host2 = makePlayer('p3', 'Carol');
      const room1 = createRoom('Room-A', host1);
      const room2 = createRoom('Room-B', host2);

      expect(room1.id).not.toBe(room2.id);
    });

    it('room is retrievable via getRoom after creation', () => {
      const host = makePlayer('p4', 'Dave');
      const room = createRoom('Room-C', host);
      const fetched = getRoom(room.id);
      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(room.id);
      expect(fetched!.name).toBe('Room-C');
    });

    it('room is retrievable via getRoomByPlayer for the host', () => {
      const host = makePlayer('p5', 'Eve');
      const room = createRoom('Room-D', host);
      const fetched = getRoomByPlayer('p5');
      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(room.id);
    });
  });

  describe('joinRoom', () => {
    it('allows a player to join an existing room', () => {
      const host = makePlayer('h1', 'Host');
      const room = createRoom('JoinTest1', host);
      const player = makePlayer('j1', 'Joiner');

      const updated = joinRoom(room.id, player);
      expect(updated).not.toBeNull();
      expect(updated!.players.length).toBe(2);
      expect(updated!.players).toContain(player);
    });

    it('returns null for a non-existent room', () => {
      const player = makePlayer('j2', 'Joiner2');
      const result = joinRoom('non-existent-room', player);
      expect(result).toBeNull();
    });

    it('prevents joining a full room (max 4 players)', () => {
      const host = makePlayer('h2', 'Host2');
      const room = createRoom('FullRoom', host);

      joinRoom(room.id, makePlayer('j3', 'P2'));
      joinRoom(room.id, makePlayer('j4', 'P3'));
      joinRoom(room.id, makePlayer('j5', 'P4'));

      // Room is now full (4 players)
      const result = joinRoom(room.id, makePlayer('j6', 'P5'));
      expect(result).toBeNull();
    });

    it('returns room without re-adding if player already in room', () => {
      const host = makePlayer('h3', 'Host3');
      const room = createRoom('DupeTest', host);
      
      const result = joinRoom(room.id, host);
      expect(result).not.toBeNull();
      expect(result!.players.length).toBe(1); // Still 1, not duplicated
    });

    it('maps the joining player to the room', () => {
      const host = makePlayer('h4', 'Host4');
      const room = createRoom('MapTest', host);
      const player = makePlayer('j7', 'MapJoiner');
      joinRoom(room.id, player);

      const fetched = getRoomByPlayer('j7');
      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(room.id);
    });
  });

  describe('leaveRoom', () => {
    it('removes a player from the room', () => {
      const host = makePlayer('lh1', 'LeaveHost');
      const room = createRoom('LeaveTest1', host);
      const player = makePlayer('lp1', 'LeavePlayer');
      joinRoom(room.id, player);

      const result = leaveRoom('lp1');
      expect(result).not.toBeNull();
      expect(result!.isEmpty).toBe(false);
      expect(result!.room.players.length).toBe(1);
      expect(result!.room.players[0].id).toBe('lh1');
    });

    it('returns isEmpty=true when last player leaves', () => {
      const host = makePlayer('lh2', 'LeaveHost2');
      const room = createRoom('LeaveTest2', host);

      const result = leaveRoom('lh2');
      expect(result).not.toBeNull();
      expect(result!.isEmpty).toBe(true);
    });

    it('deletes the room when it becomes empty', () => {
      const host = makePlayer('lh3', 'LeaveHost3');
      const room = createRoom('LeaveTest3', host);

      leaveRoom('lh3');
      expect(getRoom(room.id)).toBeUndefined();
    });

    it('transfers host when host leaves and players remain', () => {
      const host = makePlayer('lh4', 'LeaveHost4');
      const room = createRoom('HostTransfer', host);
      const player = makePlayer('lp4', 'NewHost');
      joinRoom(room.id, player);

      const result = leaveRoom('lh4');
      expect(result!.isEmpty).toBe(false);
      expect(result!.room.host.id).toBe('lp4');
    });

    it('returns null for unknown player', () => {
      const result = leaveRoom('unknown-player');
      expect(result).toBeNull();
    });

    it('removes player from playerRoomMap', () => {
      const host = makePlayer('lh5', 'LeaveHost5');
      const room = createRoom('LeaveMapTest', host);
      const player = makePlayer('lp5', 'LeaveMapPlayer');
      joinRoom(room.id, player);
      
      leaveRoom('lp5');
      expect(getRoomByPlayer('lp5')).toBeUndefined();
    });
  });

  describe('getRoom', () => {
    it('returns undefined for non-existent room', () => {
      expect(getRoom('no-such-room')).toBeUndefined();
    });
  });

  describe('getRoomByPlayer', () => {
    it('returns undefined for unknown player', () => {
      expect(getRoomByPlayer('no-such-player')).toBeUndefined();
    });
  });

  describe('getRoomList', () => {
    it('returns a list of all active rooms', () => {
      const host = makePlayer('rl1', 'RoomListHost');
      const room = createRoom('ListRoom', host);

      const list = getRoomList();
      expect(Array.isArray(list)).toBe(true);
      
      const found = list.find(r => r.id === room.id);
      expect(found).toBeDefined();
      expect(found!.name).toBe('ListRoom');
      expect(found!.hostName).toBe('RoomListHost');
      expect(found!.playerCount).toBe(1);
      expect(found!.maxPlayers).toBe(3);
    });

    it('updates player count when players join', () => {
      const host = makePlayer('rl2', 'RoomListHost2');
      const room = createRoom('ListRoom2', host);
      joinRoom(room.id, makePlayer('rl3', 'Joiner'));

      const list = getRoomList();
      const found = list.find(r => r.id === room.id);
      expect(found!.playerCount).toBe(2);
    });

    it('removes room from list when empty', () => {
      const host = makePlayer('rl4', 'TempHost');
      const room = createRoom('TempRoom', host);
      const roomId = room.id;
      
      leaveRoom('rl4');
      
      const list = getRoomList();
      const found = list.find(r => r.id === roomId);
      expect(found).toBeUndefined();
    });
  });
});
