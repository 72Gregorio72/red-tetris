import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import LobbyView from '../views/LobbyView.vue';
import { useMultiplayerStore } from '../stores/multiplayer';
import { usePlayerStore } from '../stores/player';

// Mock Audio class
class MockAudio {
  src = ''; volume = 1; currentTime = 0;
  play() { return Promise.resolve(); }
  pause() {}
}
vi.stubGlobal('Audio', MockAudio);
vi.stubGlobal('alert', vi.fn());

// Mock composables
const mockConnect = vi.fn();
const mockRegisterListeners = vi.fn();
const mockUnregisterListeners = vi.fn();
const mockRegisterPlayer = vi.fn();
const mockCreateRoom = vi.fn();
const mockJoinRoom = vi.fn();
const mockLeaveRoom = vi.fn();
const mockToggleReady = vi.fn();
const mockStartGame = vi.fn();
const mockFetchRooms = vi.fn();
const mockSetPlatformerMode = vi.fn();

vi.mock('../composables/useMultiplayer', () => ({
  useMultiplayer: () => ({
    registerListeners: mockRegisterListeners,
    unregisterListeners: mockUnregisterListeners,
    connect: mockConnect,
    createRoom: mockCreateRoom,
    joinRoom: mockJoinRoom,
    leaveRoom: mockLeaveRoom,
    toggleReady: mockToggleReady,
    startGame: mockStartGame,
    fetchRooms: mockFetchRooms,
    registerPlayer: mockRegisterPlayer,
    setPlatformerMode: mockSetPlatformerMode,
    emit: vi.fn(),
  }),
}));

vi.mock('../composables/useSocket', () => ({
  useSocket: () => ({
    connect: mockConnect,
    socket: { value: { id: 'my-id' } },
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }),
}));

describe('LobbyView', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function mountLobby() {
    return mount(LobbyView, {
      global: { plugins: [pinia] },
    });
  }

  // ─── Registration screen ───
  describe('registration', () => {
    it('shows registration form when no player', () => {
      const wrapper = mountLobby();
      expect(wrapper.find('.register-section').exists()).toBe(true);
    });

    it('calls connect and registerListeners on mount', () => {
      mountLobby();
      expect(mockConnect).toHaveBeenCalled();
      expect(mockRegisterListeners).toHaveBeenCalled();
    });

    it('registers player when name is entered and button clicked', async () => {
      const wrapper = mountLobby();
      const input = wrapper.find('input');
      await input.setValue('TestPlayer');
      await wrapper.find('.log-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(mockRegisterPlayer).toHaveBeenCalledWith('TestPlayer');
    });

    it('does not register with empty name', async () => {
      const wrapper = mountLobby();
      await wrapper.find('.log-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(mockRegisterPlayer).not.toHaveBeenCalled();
    });

    it('shows alert for name longer than 12 chars', async () => {
      const wrapper = mountLobby();
      const input = wrapper.find('input');
      await input.setValue('VeryLongPlayerName123');
      await wrapper.find('.log-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(alert).toHaveBeenCalledWith('Player name must be 12 characters or less.');
    });

    it('registers on Enter key', async () => {
      const wrapper = mountLobby();
      const input = wrapper.find('input');
      await input.setValue('EnterPlayer');
      await input.trigger('keyup.enter');
      vi.advanceTimersByTime(300);
      expect(mockRegisterPlayer).toHaveBeenCalledWith('EnterPlayer');
    });
  });

  // ─── Rooms section ───
  describe('rooms section', () => {
    function setupWithPlayer() {
      const playerStore = usePlayerStore();
      playerStore.setPlayer({
        id: 'my-id', name: 'Me', score: 0,
        isConnected: true, isAlive: true, isReady: false,
      });
    }

    it('shows rooms section when player is registered but not in a room', () => {
      setupWithPlayer();
      const wrapper = mountLobby();
      expect(wrapper.find('.rooms-section').exists()).toBe(true);
      expect(wrapper.text()).toContain('Welcome, Me');
    });

    it('shows "NO ROOM AVAILABLE" when no rooms', () => {
      setupWithPlayer();
      const wrapper = mountLobby();
      expect(wrapper.text()).toContain('NO ROOM AVAILABLE');
    });

    it('shows room list when rooms exist', () => {
      setupWithPlayer();
      const multiStore = useMultiplayerStore();
      multiStore.setRooms([
        { id: 'r1', name: 'Room1', playerCount: 1, maxPlayers: 4 },
        { id: 'r2', name: 'Room2', playerCount: 2, maxPlayers: 4 },
      ]);
      const wrapper = mountLobby();
      expect(wrapper.text()).toContain('Room1');
      expect(wrapper.text()).toContain('Room2');
    });

    it('creates room when input filled and button clicked', async () => {
      setupWithPlayer();
      const wrapper = mountLobby();
      const inputs = wrapper.findAll('input');
      // First input is player name (hidden), second is room name
      const roomInput = inputs[0]; // Only room name input visible now
      await roomInput.setValue('NewRoom');
      await wrapper.find('.create-room-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(mockCreateRoom).toHaveBeenCalledWith('NewRoom');
    });

    it('shows alert for room name longer than 12 chars', async () => {
      setupWithPlayer();
      const wrapper = mountLobby();
      const inputs = wrapper.findAll('input');
      const roomInput = inputs[0];
      await roomInput.setValue('VeryLongRoomName123');
      await wrapper.find('.create-room-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(alert).toHaveBeenCalledWith('Room name must be 12 characters or less.');
    });

    it('joins room when join button clicked', async () => {
      setupWithPlayer();
      const multiStore = useMultiplayerStore();
      multiStore.setRooms([
        { id: 'r1', name: 'Room1', playerCount: 1, maxPlayers: 4 },
      ]);
      const wrapper = mountLobby();
      await wrapper.find('.join-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(mockJoinRoom).toHaveBeenCalledWith('r1');
    });

    it('refreshes rooms when refresh button clicked', async () => {
      setupWithPlayer();
      const wrapper = mountLobby();
      await wrapper.find('.refresh-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(mockFetchRooms).toHaveBeenCalled();
    });
  });

  // ─── Room section (in a room) ───
  describe('room section', () => {
    function setupInRoom() {
      const playerStore = usePlayerStore();
      playerStore.setPlayer({
        id: 'my-id', name: 'Me', score: 0,
        isConnected: true, isAlive: true, isReady: false,
      });
      const multiStore = useMultiplayerStore();
      multiStore.joinRoom({
        id: 'r1', name: 'TestRoom',
        host: { id: 'my-id', name: 'Me' } as any,
        players: [
          { id: 'my-id', name: 'Me', isReady: false, isConnected: true, isAlive: true, score: 0 },
          { id: 'other', name: 'Other', isReady: true, isConnected: true, isAlive: true, score: 0 },
        ],
        maxPlayers: 4,
      } as any);
    }

    it('shows room section when in a room', () => {
      setupInRoom();
      const wrapper = mountLobby();
      expect(wrapper.find('.room-section').exists()).toBe(true);
      expect(wrapper.text()).toContain('TestRoom');
    });

    it('shows player list', () => {
      setupInRoom();
      const wrapper = mountLobby();
      expect(wrapper.text()).toContain('Me');
      expect(wrapper.text()).toContain('Other');
    });

    it('shows ready/not ready status', () => {
      setupInRoom();
      const wrapper = mountLobby();
      expect(wrapper.text()).toContain('✅'); // Other is ready
      expect(wrapper.text()).toContain('⏳'); // Me is not ready
    });

    it('toggles ready when ready button clicked', async () => {
      setupInRoom();
      const wrapper = mountLobby();
      await wrapper.find('.ready-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(mockToggleReady).toHaveBeenCalled();
    });

    it('shows start game button for host', () => {
      setupInRoom();
      const wrapper = mountLobby();
      expect(wrapper.find('.start-game-button').exists()).toBe(true);
    });

    it('starts game when start button clicked with 2+ players', async () => {
      setupInRoom();
      const wrapper = mountLobby();
      await wrapper.find('.start-game-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(mockSetPlatformerMode).toHaveBeenCalled();
      expect(mockStartGame).toHaveBeenCalled();
    });

    it('shows alert when trying to start with less than 2 players', async () => {
      const playerStore = usePlayerStore();
      playerStore.setPlayer({ id: 'my-id', name: 'Me', score: 0, isConnected: true, isAlive: true, isReady: false });
      const multiStore = useMultiplayerStore();
      multiStore.joinRoom({
        id: 'r1', name: 'TestRoom',
        host: { id: 'my-id', name: 'Me' } as any,
        players: [{ id: 'my-id', name: 'Me', isReady: false, isConnected: true, isAlive: true, score: 0 }],
        maxPlayers: 4,
      } as any);
      const wrapper = mountLobby();
      await wrapper.find('.start-game-button').trigger('click');
      expect(alert).toHaveBeenCalledWith('At least 2 players are required to start the game.');
    });

    it('leaves room when leave button clicked', async () => {
      setupInRoom();
      const wrapper = mountLobby();
      await wrapper.find('.leave-room-button').trigger('click');
      vi.advanceTimersByTime(300);
      expect(mockLeaveRoom).toHaveBeenCalled();
    });

    it('shows platformer checkbox for host', () => {
      setupInRoom();
      const wrapper = mountLobby();
      expect(wrapper.find('.checkbox-label').exists()).toBe(true);
      expect(wrapper.text()).toContain('Platformer Vs Tetris Mode');
    });
  });

  // ─── Cleanup ───
  it('unregisters listeners on unmount', () => {
    const wrapper = mountLobby();
    wrapper.unmount();
    expect(mockUnregisterListeners).toHaveBeenCalled();
  });
});
