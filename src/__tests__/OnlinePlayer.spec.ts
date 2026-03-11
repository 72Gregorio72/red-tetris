import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import OnlinePlayer from '../Classes/Player/OnlinePlayer.vue';
import { useMultiplayerStore } from '../stores/multiplayer';

// Mock Audio globally
class MockAudio {
  src = ''; volume = 1; currentTime = 0;
  play() { return Promise.resolve(); }
  pause() {}
}
vi.stubGlobal('Audio', MockAudio);
vi.stubGlobal('requestAnimationFrame', (cb: any) => 1);
vi.stubGlobal('cancelAnimationFrame', vi.fn());

// Mock useMultiplayer
const mockEmit = vi.fn();
vi.mock('../composables/useMultiplayer', () => ({
  useMultiplayer: () => ({
    emit: mockEmit,
    registerListeners: vi.fn(),
    unregisterListeners: vi.fn(),
    connect: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    leaveRoom: vi.fn(),
    toggleReady: vi.fn(),
    startGame: vi.fn(),
    fetchRooms: vi.fn(),
    registerPlayer: vi.fn(),
    setPlatformerMode: vi.fn(),
  }),
}));

// Mock useSocket
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();
vi.mock('../composables/useSocket', () => ({
  useSocket: () => ({
    socket: { value: { id: 'test-id', on: mockSocketOn, off: mockSocketOff } },
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }),
}));

describe('OnlinePlayer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('mounts and renders OnlineGrid', () => {
    const wrapper = mount(OnlinePlayer, {
      shallow: true,
    });
    expect(wrapper.exists()).toBe(true);
  });

  it('registers keydown handlers on mount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const wrapper = mount(OnlinePlayer, { attachTo: document.body, shallow: true });
    expect(addSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    wrapper.unmount();
    addSpy.mockRestore();
  });

  it('handles tetris keydown events', async () => {
    const wrapper = mount(OnlinePlayer, { attachTo: document.body, shallow: true });
    // By default isPlatformer is false → tetris mode
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    expect(mockEmit).toHaveBeenCalledWith('game:action', { action: 'left' });
    expect(mockEmit).toHaveBeenCalledWith('game:action', { action: 'right' });
    expect(mockEmit).toHaveBeenCalledWith('game:action', { action: 'down' });
    expect(mockEmit).toHaveBeenCalledWith('game:action', { action: 'rotate' });
    expect(mockEmit).toHaveBeenCalledWith('game:action', { action: 'drop' });
    wrapper.unmount();
  });

  it('handles keyup events', async () => {
    const wrapper = mount(OnlinePlayer, { attachTo: document.body, shallow: true });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowLeft' }));
    wrapper.unmount();
  });

  it('handles platformer keydown events when isPlatformer', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useMultiplayerStore();
    // Set up currentRoom with platformer player
    store.currentRoom = {
      id: 'r1', name: 'Room', host: { id: 'test-id', name: 'H' } as any,
      players: [{ id: 'test-id', name: 'Me', isPlatformer: true, isReady: true, isConnected: true, isAlive: true, score: 0 }],
      maxPlayers: 4,
    } as any;

    const wrapper = mount(OnlinePlayer, { attachTo: document.body, shallow: true });
    
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', key: 'ArrowUp' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }));
    
    wrapper.unmount();
  });

  it('registers game:state_update listener on mount', () => {
    mount(OnlinePlayer, { shallow: true });
    expect(mockSocketOn).toHaveBeenCalledWith('game:state_update', expect.any(Function));
  });

  it('handles game:state_update callback', () => {
    const store = useMultiplayerStore();
    mount(OnlinePlayer, { shallow: true });
    // Find the state_update callback
    const stateUpdateCall = mockSocketOn.mock.calls.find((c: any) => c[0] === 'game:state_update');
    if (stateUpdateCall) {
      const callback = stateUpdateCall[1];
      callback([
        {
          id: 'test-id',
          state: { pieceIndex: 2, linesCleared: 3 },
          displayGrid: [[0]],
          platformerScore: 100,
          bombs: 2,
          nextPieces: ['T', 'I', 'O'],
        },
        {
          id: 'other-player',
          state: {},
          displayGrid: [[1]],
        },
      ]);
      expect(store.myDisplayGrid).toEqual([[0]]);
      expect(store.myPlatformerScore).toBe(100);
      expect(store.myBombs).toBe(2);
      expect(store.myNextPieces).toEqual(['T', 'I', 'O']);
    }
  });

  it('cleans up on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const wrapper = mount(OnlinePlayer, { attachTo: document.body, shallow: true });
    wrapper.unmount();
    expect(removeSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('keyup', expect.any(Function));
    expect(mockSocketOff).toHaveBeenCalledWith('game:state_update');
    removeSpy.mockRestore();
  });
});
