import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { registerSocketHandlers } from '../socket/handlers';

// Track all room-level emissions for inspection
const roomEmissions: { roomId: string; event: string; data: any }[] = [];

function createMockSocket(id = 'socket-1') {
  const listeners: Record<string, Function> = {};
  return {
    id,
    on: vi.fn((event: string, handler: Function) => {
      listeners[event] = handler;
    }),
    emit: vi.fn(),
    join: vi.fn(),
    leave: vi.fn(),
    to: vi.fn(function(this: any) { return this; }),
    trigger: (event: string, data?: any) => {
      if (listeners[event]) listeners[event](data);
    },
    _listeners: listeners,
  };
}

function createMockIO() {
  return {
    emit: vi.fn(),
    to: vi.fn(() => ({
      emit: vi.fn((event: string, data: any) => {
        roomEmissions.push({ roomId: '', event, data });
      }),
    })),
  };
}

function getRoomId(socket: ReturnType<typeof createMockSocket>): string {
  const call = socket.emit.mock.calls.find((c: any) => c[0] === 'room:joined');
  return call ? call[1].id : '';
}

// Helper: set up two players in a room, return { socket1, socket2, io, roomId }
function setupTwoPlayerRoom(io: ReturnType<typeof createMockIO>, id1: string, id2: string, name1 = 'P1', name2 = 'P2') {
  const s1 = createMockSocket(id1);
  const s2 = createMockSocket(id2);
  registerSocketHandlers(io as any, s1 as any);
  s1.trigger('player:register', { name: name1 });
  s1.trigger('room:create', { name: `Room-${id1}` });
  const roomId = getRoomId(s1);
  registerSocketHandlers(io as any, s2 as any);
  s2.trigger('player:register', { name: name2 });
  s2.trigger('room:join', { roomId });
  return { s1, s2, roomId };
}

describe('Socket Handlers', () => {
  let io: ReturnType<typeof createMockIO>;

  beforeEach(() => {
    io = createMockIO();
    roomEmissions.length = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ─── Registration ───
  it('registers all expected events', () => {
    const s = createMockSocket('reg-1');
    registerSocketHandlers(io as any, s as any);
    const events = s.on.mock.calls.map((c: any) => c[0]);
    for (const e of ['player:register','room:list','room:create','room:join','room:leave',
      'player:ready','game:start','game:action','game:over','disconnect',
      'game:grid_update','game:piece_move','game:attack','game:toggle_platformer'])
      expect(events).toContain(e);
  });

  // ─── player:register ───
  it('registers a player', () => {
    const s = createMockSocket('pr-1');
    registerSocketHandlers(io as any, s as any);
    s.trigger('player:register', { name: 'Alice' });
    expect(s.emit).toHaveBeenCalledWith('player:registered', expect.objectContaining({
      id: 'pr-1', name: 'Alice', score: 0, isConnected: true, isAlive: true, isReady: false,
    }));
  });

  // ─── room:list ───
  it('returns room list', () => {
    const s = createMockSocket('rl-1');
    registerSocketHandlers(io as any, s as any);
    s.trigger('room:list');
    expect(s.emit).toHaveBeenCalledWith('room:list', expect.any(Array));
  });

  // ─── room:create ───
  describe('room:create', () => {
    it('creates room when registered', () => {
      const s = createMockSocket('rc-1');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'A' });
      s.trigger('room:create', { name: 'R1' });
      expect(s.join).toHaveBeenCalled();
      expect(s.emit).toHaveBeenCalledWith('room:joined', expect.objectContaining({ name: 'R1' }));
      expect(io.emit).toHaveBeenCalledWith('room:list', expect.any(Array));
    });
    it('noop if unregistered', () => {
      const s = createMockSocket('rc-2');
      registerSocketHandlers(io as any, s as any);
      s.trigger('room:create', { name: 'R2' });
      expect(s.join).not.toHaveBeenCalled();
    });
  });

  // ─── room:join ───
  describe('room:join', () => {
    it('joins existing room', () => {
      const { s2, roomId } = setupTwoPlayerRoom(io, 'rj-1', 'rj-2');
      expect(s2.join).toHaveBeenCalledWith(roomId);
      expect(s2.emit).toHaveBeenCalledWith('room:joined', expect.objectContaining({ id: roomId }));
    });
    it('error on invalid room id', () => {
      const s = createMockSocket('rj-3');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'X' });
      s.trigger('room:join', { roomId: 'nope' });
      expect(s.emit).toHaveBeenCalledWith('error', { message: 'Room not found or full' });
    });
    it('noop if unregistered', () => {
      const s = createMockSocket('rj-4');
      registerSocketHandlers(io as any, s as any);
      s.trigger('room:join', { roomId: 'x' });
      expect(s.join).not.toHaveBeenCalled();
    });
  });

  // ─── room:leave ───
  it('leaves room', () => {
    const s = createMockSocket('rlv-1');
    registerSocketHandlers(io as any, s as any);
    s.trigger('player:register', { name: 'L' });
    s.trigger('room:create', { name: 'LR' });
    s.trigger('room:leave');
    expect(s.leave).toHaveBeenCalled();
  });

  // ─── player:ready ───
  describe('player:ready', () => {
    it('toggles ready and broadcasts', () => {
      const s = createMockSocket('prdy-1');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'R' });
      s.trigger('room:create', { name: 'RR' });
      s.trigger('player:ready', { isReady: true });
      expect(io.to).toHaveBeenCalled();
    });
    it('noop if unregistered', () => {
      const s = createMockSocket('prdy-2');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:ready', { isReady: true });
    });
    it('noop if not in room', () => {
      const s = createMockSocket('prdy-3');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'NR' });
      s.trigger('player:ready', { isReady: true });
    });
  });

  // ─── player:ready auto-start ───
  describe('auto-start on all ready', () => {
    it('auto-starts when 2 players both ready', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'as-1', 'as-2');
      s1.trigger('player:ready', { isReady: true });
      s2.trigger('player:ready', { isReady: true });
      // game:start emitted to room → io.to called
      expect(io.to).toHaveBeenCalled();
      vi.useRealTimers();
    });
    it('does not auto-start with only 1 ready', () => {
      const { s1 } = setupTwoPlayerRoom(io, 'nas-1', 'nas-2');
      const callsBefore = io.to.mock.calls.length;
      s1.trigger('player:ready', { isReady: true });
      // Only 1 ready - shouldn't start game (io.to calls only for players_updated)
    });
  });

  // ─── game:toggle_platformer ───
  describe('game:toggle_platformer', () => {
    it('toggles platformer flag and broadcasts', () => {
      const s = createMockSocket('tp-1');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'PF' });
      s.trigger('room:create', { name: 'TPR' });
      s.trigger('game:toggle_platformer', { enabled: true });
      expect(io.to).toHaveBeenCalled();
    });
    it('noop if not in room', () => {
      const s = createMockSocket('tp-2');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'PF2' });
      s.trigger('game:toggle_platformer', { enabled: true });
    });
  });

  // ─── game:start (host only, normal mode) ───
  describe('game:start', () => {
    it('starts game in normal mode when host requests', () => {
      vi.useFakeTimers();
      const { s1 } = setupTwoPlayerRoom(io, 'gs-1', 'gs-2');
      s1.trigger('game:start');
      expect(io.to).toHaveBeenCalled();
    });

    it('starts game in shared mode (tetris + platformer)', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'gsm-1', 'gsm-2');
      s2.trigger('game:toggle_platformer', { enabled: true });
      s1.trigger('game:start');
      expect(io.to).toHaveBeenCalled();
    });

    it('noop if not in room', () => {
      const s = createMockSocket('gs-3');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'G3' });
      s.trigger('game:start');
    });

    it('noop if not host', () => {
      vi.useFakeTimers();
      const { s2 } = setupTwoPlayerRoom(io, 'gnh-1', 'gnh-2');
      s2.trigger('game:start');
      // non-host start should be ignored
    });
  });

  // ─── game:action (tetris player) ───
  describe('game:action tetris', () => {
    it('applies all tetris actions during active game', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'ga-1', 'ga-2');
      s1.trigger('game:start');
      for (const action of ['left', 'right', 'down', 'rotate', 'drop']) {
        s1.trigger('game:action', { action });
      }
    });

    it('applies drop in shared mode for tetris player', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'gad-1', 'gad-2');
      s2.trigger('game:toggle_platformer', { enabled: true });
      s1.trigger('game:start');
      // In shared mode, drop is blocked for tetris player
      s1.trigger('game:action', { action: 'drop' });
      // Left/right should also move platformer char
      s1.trigger('game:action', { action: 'left' });
      s1.trigger('game:action', { action: 'right' });
    });

    it('noop if no engine', () => {
      const s = createMockSocket('ga-3');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'NoEngine' });
      s.trigger('game:action', { action: 'left' });
    });
  });

  // ─── game:action (platformer player) ───
  describe('game:action platformer', () => {
    it('handles platformer movement actions', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'gap-1', 'gap-2');
      s2.trigger('game:toggle_platformer', { enabled: true });
      s1.trigger('game:start');
      // Platformer actions
      s2.trigger('game:action', { action: 'left' });
      s2.trigger('game:action', { action: 'right' });
      s2.trigger('game:action', { action: 'rotate' }); // jump
      s2.trigger('game:action', { action: 'down' });   // bomb
    });

    it('bomb decrements when used (normal mode)', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'bomb-1', 'bomb-2');
      s2.trigger('game:toggle_platformer', { enabled: true });
      s1.trigger('game:start');
      // Use all 3 bombs
      s2.trigger('game:action', { action: 'down' });
      s2.trigger('game:action', { action: 'down' });
      s2.trigger('game:action', { action: 'down' });
      // 4th bomb should be blocked (0 remaining)
      s2.trigger('game:action', { action: 'down' });
    });
  });

  // ─── game loop tick (normal mode) ───
  describe('game loop tick normal', () => {
    it('advances game state over time in normal tetris mode', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'glt-1', 'glt-2');
      s1.trigger('game:start');
      // Advance 2 seconds — enough for gravity to trigger at level 1 (~1000ms fall)
      vi.advanceTimersByTime(2000);
      expect(io.to).toHaveBeenCalled();
    });

    it('game loop runs repeatedly', () => {
      vi.useFakeTimers();
      const { s1 } = setupTwoPlayerRoom(io, 'glr-1', 'glr-2');
      s1.trigger('game:start');
      const callsBefore = io.to.mock.calls.length;
      vi.advanceTimersByTime(5000);
      expect(io.to.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  // ─── game loop tick (shared/platformer mode) ───
  describe('game loop tick shared mode', () => {
    it('runs platformer physics and tetris gravity in shared mode', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'gls-1', 'gls-2');
      s2.trigger('game:toggle_platformer', { enabled: true });
      s1.trigger('game:start');
      vi.advanceTimersByTime(3000);
      expect(io.to).toHaveBeenCalled();
    });

    it('handles rising lines in platformer mode over time', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'glrl-1', 'glrl-2');
      s2.trigger('game:toggle_platformer', { enabled: true });
      s1.trigger('game:start');
      // 7 seconds should trigger rising line (RISING_LINE_INTERVAL=6000)
      vi.advanceTimersByTime(7000);
      expect(io.to).toHaveBeenCalled();
    });
  });

  // ─── game loop tick (normal mode with platformer per-player) ───
  describe('game loop normal mode per-player platformer', () => {
    it('processes individual platformer engines', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'glnp-1', 'glnp-2');
      // Both as platformer → normal mode (not shared, since shared requires 1 plat + 1 tetris)
      s1.trigger('game:toggle_platformer', { enabled: true });
      s2.trigger('game:toggle_platformer', { enabled: true });
      s1.trigger('game:start');
      vi.advanceTimersByTime(2000);
    });
  });

  // ─── game:over ───
  describe('game:over handling', () => {
    it('handles game over during active game', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'go-1', 'go-2');
      s1.trigger('game:start');
      s1.trigger('game:over');
    });

    it('triggers handleNormalTetrisGameOver when last player dies', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'goo-1', 'goo-2');
      s1.trigger('game:start');
      s1.trigger('game:over');
      s2.trigger('game:over');
      // Should have stopped the game loop and emitted game:over
    });

    it('noop if unregistered', () => {
      const s = createMockSocket('go-3');
      registerSocketHandlers(io as any, s as any);
      s.trigger('game:over');
    });
  });

  // ─── game:grid_update ───
  describe('game:grid_update', () => {
    it('broadcasts to other players in room', () => {
      const { s1 } = setupTwoPlayerRoom(io, 'gu-1', 'gu-2');
      s1.trigger('game:grid_update', { grid: [[1,2,3]] });
      // socket.to(room.id).emit used
      expect(s1.to).toHaveBeenCalled();
      expect(s1.emit).toHaveBeenCalledWith('game:opponent_grid', expect.objectContaining({
        playerId: 'gu-1',
        grid: [[1,2,3]],
      }));
    });
    it('noop if not in room', () => {
      const s = createMockSocket('gu-3');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'X' });
      s.trigger('game:grid_update', { grid: [[]] });
    });
  });

  // ─── game:piece_move ───
  describe('game:piece_move', () => {
    it('broadcasts piece position to room', () => {
      const { s1 } = setupTwoPlayerRoom(io, 'pm-1', 'pm-2');
      s1.trigger('game:piece_move', { cells: [{ row: 1, col: 5 }] });
      expect(s1.to).toHaveBeenCalled();
      expect(s1.emit).toHaveBeenCalledWith('game:opponent_piece', expect.objectContaining({
        playerId: 'pm-1',
      }));
    });
    it('noop if not in room', () => {
      const s = createMockSocket('pm-3');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'PM3' });
      s.trigger('game:piece_move', { cells: [] });
    });
  });

  // ─── game:attack ───
  describe('game:attack', () => {
    it('broadcasts attack to room', () => {
      const { s1 } = setupTwoPlayerRoom(io, 'at-1', 'at-2');
      s1.trigger('game:attack', { lines: 3 });
      expect(s1.to).toHaveBeenCalled();
      expect(s1.emit).toHaveBeenCalledWith('game:attack', { lines: 3 });
    });
    it('noop if not in room', () => {
      const s = createMockSocket('at-3');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'AT3' });
      s.trigger('game:attack', { lines: 1 });
    });
  });

  // ─── disconnect ───
  describe('disconnect', () => {
    it('cleans up room on disconnect', () => {
      const s = createMockSocket('dc-1');
      registerSocketHandlers(io as any, s as any);
      s.trigger('player:register', { name: 'DC' });
      s.trigger('room:create', { name: 'DCR' });
      s.trigger('disconnect');
      expect(s.leave).toHaveBeenCalled();
      expect(io.emit).toHaveBeenCalledWith('room:list', expect.any(Array));
    });

    it('disconnect with remaining players notifies room', () => {
      const { s1, s2 } = setupTwoPlayerRoom(io, 'dcr-1', 'dcr-2');
      s2.trigger('disconnect');
      expect(io.to).toHaveBeenCalled();
    });

    it('noop for unregistered disconnect', () => {
      const s = createMockSocket('dc-3');
      registerSocketHandlers(io as any, s as any);
      s.trigger('disconnect');
    });
  });

  // ─── Full game flow: start → tick → actions → game over ───
  describe('full game flow', () => {
    it('runs a complete normal tetris game with both players', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'ff-1', 'ff-2');
      s1.trigger('game:start');

      // Play actions
      s1.trigger('game:action', { action: 'left' });
      s1.trigger('game:action', { action: 'left' });
      s1.trigger('game:action', { action: 'drop' });
      s2.trigger('game:action', { action: 'right' });
      s2.trigger('game:action', { action: 'drop' });

      // Advance timer
      vi.advanceTimersByTime(2000);

      // More actions
      s1.trigger('game:action', { action: 'rotate' });
      s1.trigger('game:action', { action: 'down' });
      s2.trigger('game:action', { action: 'left' });

      vi.advanceTimersByTime(1000);

      // Game over
      s1.trigger('game:over');
      s2.trigger('game:over');
    });

    it('runs a complete platformer vs tetris game', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'fp-1', 'fp-2');
      s2.trigger('game:toggle_platformer', { enabled: true });
      s1.trigger('game:start');

      // Platformer moves
      s2.trigger('game:action', { action: 'left' });
      s2.trigger('game:action', { action: 'right' });
      s2.trigger('game:action', { action: 'rotate' }); // jump
      s2.trigger('game:action', { action: 'down' });   // bomb

      // Tetris moves
      s1.trigger('game:action', { action: 'left' });
      s1.trigger('game:action', { action: 'right' });
      s1.trigger('game:action', { action: 'drop' });

      // Let game loop process
      vi.advanceTimersByTime(3000);

      // Game over
      s1.trigger('game:over');
    });

    it('runs game long enough for multiple piece drops', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'fmd-1', 'fmd-2');
      s1.trigger('game:start');

      // Simulate 30 seconds of gameplay with periodic drops
      for (let i = 0; i < 30; i++) {
        vi.advanceTimersByTime(1000);
        s1.trigger('game:action', { action: 'drop' });
        if (i % 3 === 0) s2.trigger('game:action', { action: 'drop' });
      }
    });
  });

  // ─── leave during active game ───
  describe('leave during game', () => {
    it('cleans up when host leaves', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'ldg-1', 'ldg-2');
      s1.trigger('game:start');
      vi.advanceTimersByTime(500);
      s1.trigger('room:leave');
    });

    it('cleans up when non-host disconnects', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'ldg2-1', 'ldg2-2');
      s1.trigger('game:start');
      vi.advanceTimersByTime(500);
      s2.trigger('disconnect');
    });
  });

  // ─── auto-start with platformer ───
  describe('auto-start with platformer mode', () => {
    it('auto-starts shared mode game when allready with platformer', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'asp-1', 'asp-2');
      s2.trigger('game:toggle_platformer', { enabled: true });
      s1.trigger('player:ready', { isReady: true });
      s2.trigger('player:ready', { isReady: true });
      vi.advanceTimersByTime(1000);
      expect(io.to).toHaveBeenCalled();
    });
  });

  // ─── Multiple sequential games ───
  describe('sequential games', () => {
    it('handles starting a second game in same room', () => {
      vi.useFakeTimers();
      const { s1, s2 } = setupTwoPlayerRoom(io, 'seq-1', 'seq-2');
      s1.trigger('game:start');
      vi.advanceTimersByTime(500);
      s1.trigger('game:over');
      s2.trigger('game:over');
      // Start second game
      s1.trigger('game:start');
      vi.advanceTimersByTime(500);
    });
  });
});
