import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia, storeToRefs } from 'pinia';
import MultiplayerView from '../views/MultiplayerView.vue';
import { useMultiplayerStore } from '../stores/multiplayer';
import { usePlayerStore } from '../stores/player';

// Mock Audio
class MockAudio {
  src = ''; volume = 1; currentTime = 0;
  play() { return Promise.resolve(); }
  pause() {}
}
vi.stubGlobal('Audio', MockAudio);
vi.stubGlobal('requestAnimationFrame', (cb: any) => 1);
vi.stubGlobal('cancelAnimationFrame', vi.fn());

const mockRouterPush = vi.fn();

// Mock composables
vi.mock('../composables/useMultiplayer', () => ({
  useMultiplayer: () => ({
    registerListeners: vi.fn(),
    unregisterListeners: vi.fn(),
    leaveRoom: vi.fn(),
    toggleReady: vi.fn(),
    emit: vi.fn(),
    connect: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    startGame: vi.fn(),
    fetchRooms: vi.fn(),
    registerPlayer: vi.fn(),
    setPlatformerMode: vi.fn(),
  }),
}));

vi.mock('../composables/useSocket', () => ({
  useSocket: () => ({
    socket: { value: { id: 'my-id', on: vi.fn(), off: vi.fn() } },
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}));

describe('MultiplayerView', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
  });

  function setupActiveGame() {
    const multiStore = useMultiplayerStore();
    multiStore.currentRoom = {
      id: 'r1', name: 'Room1',
      host: { id: 'my-id', name: 'Me' } as any,
      players: [
        { id: 'my-id', name: 'Me', isReady: true, isConnected: true, isAlive: true, score: 0, isPlatformer: false },
        { id: 'opp', name: 'Opponent', isReady: true, isConnected: true, isAlive: true, score: 0, isPlatformer: false },
      ],
      maxPlayers: 4,
    } as any;
    return multiStore;
  }

  it('renders normal mode layout with active game', () => {
    setupActiveGame();
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    expect(wrapper.find('.multiplayer-layout').exists()).toBe(true);
  });

  it('renders shared layout in platformer mode', () => {
    const store = setupActiveGame();
    store.currentRoom!.players[1].isPlatformer = true;
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    expect(wrapper.find('.shared').exists()).toBe(true);
    expect(wrapper.text()).toContain('Shared Grid');
  });

  it('shows normal game over overlay with winner', async () => {
    const store = setupActiveGame();
    store.normalGameOver = true;
    store.normalGameWinner = { id: 'my-id', name: 'Me', score: 500 };
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    expect(wrapper.find('.game-finished-overlay').exists()).toBe(true);
    expect(wrapper.text()).toContain('VICTORY!');
    expect(wrapper.text()).toContain('Me wins!');
    expect(wrapper.text()).toContain('500');
  });

  it('shows DEFEAT when opponent wins', async () => {
    const store = setupActiveGame();
    store.normalGameOver = true;
    store.normalGameWinner = { id: 'opp', name: 'Opponent', score: 800 };
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    expect(wrapper.text()).toContain('DEFEAT');
  });

  it('has leave button that calls backToLobby', async () => {
    const store = setupActiveGame();
    store.normalGameOver = true;
    store.normalGameWinner = { id: 'my-id', name: 'Me', score: 500 };
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    const leaveBtn = wrapper.find('.leave-button');
    expect(leaveBtn.exists()).toBe(true);
    await leaveBtn.trigger('click');
    expect(store.gameFinished).toBe(false);
  });

  it('has ready button for rematch toggle', async () => {
    const store = setupActiveGame();
    store.normalGameOver = true;
    store.normalGameWinner = { id: 'my-id', name: 'Me', score: 500 };
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    const readyBtn = wrapper.find('.ready-button');
    expect(readyBtn.exists()).toBe(true);
    await readyBtn.trigger('click');
    expect(wrapper.text()).toContain('Waiting for opponent');
  });

  it('shows platformer game finished overlay', async () => {
    const store = setupActiveGame();
    store.gameFinished = true;
    store.gameWinner = { id: 'my-id', name: 'Me', score: 1000 };
    store.playerScores = { 'my-id': 1000, 'opp': 500 };
    
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    expect(wrapper.find('.game-finished-overlay').exists()).toBe(true);
    expect(wrapper.text()).toContain('Me wins!');
    expect(wrapper.text()).toContain('1000');
  });

  it('shows DEFEAT in platformer mode when I lose', () => {
    const store = setupActiveGame();
    store.gameFinished = true;
    store.gameWinner = { id: 'opp', name: 'Opponent', score: 1500 };
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    expect(wrapper.text()).toContain('DEFEAT');
  });

  it('back to lobby hides overlays', async () => {
    const store = setupActiveGame();
    store.gameFinished = true;
    store.gameWinner = { id: 'my-id', name: 'Me', score: 1000 };
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    await wrapper.find('.back-button').trigger('click');
    expect(store.gameFinished).toBe(false);
    expect(store.normalGameOver).toBe(false);
  });

  it('shows scoreboard in platformer finished overlay', () => {
    const store = setupActiveGame();
    store.gameFinished = true;
    store.gameWinner = { id: 'my-id', name: 'Me', score: 1000 };
    store.playerScores = { 'my-id': 1000, 'opp': 500 };
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    expect(wrapper.text()).toContain('Final Scores');
    expect(wrapper.text()).toContain('Me');
    expect(wrapper.text()).toContain('Opponent');
  });

  it('shows player ready status dots in normal game over', () => {
    const store = setupActiveGame();
    store.normalGameOver = true;
    store.normalGameWinner = { id: 'my-id', name: 'Me', score: 500 };
    const wrapper = mount(MultiplayerView, {
      global: { plugins: [pinia] },
      shallow: true,
    });
    const dots = wrapper.findAll('.ready-dot');
    expect(dots.length).toBeGreaterThan(0);
  });
});
