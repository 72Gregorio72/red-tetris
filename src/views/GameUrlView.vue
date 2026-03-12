<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useSocket } from '../composables/useSocket';
import { useMultiplayer } from '../composables/useMultiplayer';
import { useMultiplayerStore } from '../stores/multiplayer';
import { usePlayerStore } from '../stores/player';
import { storeToRefs } from 'pinia';

const props = defineProps<{
  room: string;
  playerName: string;
}>();

const route = useRoute();
const router = useRouter();
const { connect, socket, isConnected } = useSocket();
const multiplayer = useMultiplayer();
const multiplayerStore = useMultiplayerStore();
const playerStore = usePlayerStore();

const { currentRoom, rooms } = storeToRefs(multiplayerStore);
const { player } = storeToRefs(playerStore);

const status = ref<'connecting' | 'registering' | 'joining' | 'waiting' | 'playing' | 'error'>('connecting');
const errorMessage = ref('');
const platformerMode = ref(false);

const pressedReady = ref<'ready' | null>(null);
const pressedNotReady = ref<'notReady' | null>(null);
const pressedStart = ref<'start' | null>(null);
const pressedLeave = ref<'leave' | null>(null);

const sfxbutton = new Audio('/asset/music/buttonClick_SFX.wav');
sfxbutton.volume = 0.5;

console.log('[GameUrlView] Init with room:', props.room, 'playerName:', props.playerName);

function handleError(msg: string) {
  status.value = 'error';
  errorMessage.value = msg;
}

// Watch currentRoom — when it gets set (by useMultiplayer listener on 'room:joined'), we're in
watch(currentRoom, (newRoom) => {
  if (newRoom && status.value !== 'waiting' && status.value !== 'playing') {
    console.log('[GameUrlView] currentRoom changed — now in room:', newRoom.name);
    status.value = 'waiting';
  }
});

// Watch player — when registered (by useMultiplayer listener on 'player:registered'), join room
watch(player, (newPlayer) => {
  if (newPlayer && status.value === 'registering') {
    console.log('[GameUrlView] player registered:', newPlayer.name);
    status.value = 'joining';
    joinOrCreateRoom();
  }
});

// Watch rooms list — used to find/create room after fetching
watch(rooms, (newRooms) => {
  if (status.value === 'joining' && newRooms) {
    console.log('[GameUrlView] rooms list received, looking for room:', props.room);
    const roomName = decodeURIComponent(props.room).trim();
    const existingRoom = newRooms.find(r => r.name === roomName);

    if (existingRoom) {
      console.log('[GameUrlView] Room found, joining:', existingRoom.id);
      if (existingRoom.playerCount >= existingRoom.maxPlayers) {
        handleError(`Room "${roomName}" is full`);
        return;
      }
      multiplayer.joinRoom(existingRoom.id);
    } else {
      console.log('[GameUrlView] Room not found, creating:', roomName);
      multiplayer.createRoom(roomName);
    }
  }
});

onMounted(() => {
  console.log('[GameUrlView] onMounted');

  // Case 1: Already in room (came from LobbyView redirect)
  if (isConnected.value && currentRoom.value && player.value) {
    console.log('[GameUrlView] Already in room — showing waiting');
    status.value = 'waiting';
    multiplayer.registerListeners();
    setupGameStartListener();
    return;
  }

  // Case 2: Already registered but not in room
  if (isConnected.value && player.value && !currentRoom.value) {
    console.log('[GameUrlView] Already registered — joining room');
    status.value = 'joining';
    multiplayer.registerListeners();
    setupGameStartListener();
    joinOrCreateRoom();
    return;
  }

  // Case 3: Fresh connection (direct URL access)
  console.log('[GameUrlView] Fresh connection — starting from scratch');
  connect();
  multiplayer.registerListeners();
  setupGameStartListener();

  if (isConnected.value) {
    registerPlayer();
  }
});

function setupGameStartListener() {
  socket.value?.on('game:started', () => {
    console.log('[GameUrlView] game:started — redirecting to multiplayer');
    status.value = 'playing';
    router.push({ name: 'multiplayer' });
  });
}

watch(isConnected, (connected) => {
  if (connected && status.value === 'connecting') {
    console.log('[GameUrlView] Connected — registering player');
    registerPlayer();
  }
});

function registerPlayer() {
  const name = decodeURIComponent(props.playerName).trim();
  if (!name) {
    handleError('Player name is empty');
    return;
  }
  status.value = 'registering';
  multiplayer.registerPlayer(name);
}

function joinOrCreateRoom() {
  const roomName = decodeURIComponent(props.room).trim();
  if (!roomName) {
    handleError('Room name is empty');
    return;
  }
  multiplayer.fetchRooms();
}

function toggleReady() {
  if (!player.value) return;
  const goingReady = !player.value.isReady;
  if (goingReady) {
    if (pressedReady.value) return;
    pressedReady.value = 'ready';
    sfxbutton.currentTime = 0;
    sfxbutton.play().catch(() => {});
    setTimeout(() => {
      multiplayer.toggleReady(true);
      pressedReady.value = null;
    }, 200);
  } else {
    if (pressedNotReady.value) return;
    pressedNotReady.value = 'notReady';
    sfxbutton.currentTime = 0;
    sfxbutton.play().catch(() => {});
    setTimeout(() => {
      multiplayer.toggleReady(false);
      pressedNotReady.value = null;
    }, 200);
  }
}

function startGame() {
  if (!currentRoom.value) return;
  if (currentRoom.value.players.length < 2) {
    alert('At least 2 players are required to start the game.');
    return;
  }
  if (pressedStart.value) return;
  pressedStart.value = 'start';
  sfxbutton.currentTime = 0;
  sfxbutton.play().catch(() => {});
  setTimeout(() => {
    multiplayer.setPlatformerMode(platformerMode.value);
    multiplayer.startGame();
    pressedStart.value = null;
  }, 200);
}

function goToLobby() {
  if (pressedLeave.value) return;
  pressedLeave.value = 'leave';
  sfxbutton.currentTime = 0;
  sfxbutton.play().catch(() => {});
  setTimeout(() => {
    multiplayer.leaveRoom();
    pressedLeave.value = null;
    router.push({ name: 'lobby' });
  }, 200);
}

onUnmounted(() => {
  socket.value?.off('game:started');
});
</script>

<template>
  <div class="game-url-wrapper">
    <!-- Loading States -->
    <div v-if="status === 'connecting' || status === 'registering' || status === 'joining'" class="loading-section">
      <div class="loading-card">
        <div class="spinner"></div>
        <p v-if="status === 'connecting'" class="loading-text">Connecting to server...</p>
        <p v-else-if="status === 'registering'" class="loading-text">
          Registering as <span class="highlight">{{ decodeURIComponent(playerName) }}</span>...
        </p>
        <p v-else-if="status === 'joining'" class="loading-text">
          Joining room <span class="highlight">{{ decodeURIComponent(room) }}</span>...
        </p>
      </div>
    </div>

    <!-- Waiting in Room — Same style as LobbyView room-section -->
    <div v-else-if="status === 'waiting'" class="room-section">
      <img src="../../public/asset/lobbyHolder.png" alt="room title" class="lobby-image"/>
      <h2 class="room-title">{{ currentRoom?.name }}</h2>

      <ul class="player-list">
        <li v-for="p in currentRoom?.players" :key="p.id">
          {{ p.name }}
          <span v-if="p.isReady"> ✅</span>
          <span v-else> ⏳</span>
          <span v-if="currentRoom?.host?.id === p.id"> 👑</span>
        </li>
      </ul>

      <div class="room-actions">
        <button class="ready-button" @click="toggleReady">
          <img
            v-if="pressedReady ? true : pressedNotReady ? false : player?.isReady"
            :src="pressedReady
              ? '/asset/readyButton/readyButtonPressed.png'
              : '/asset/readyButton/readyButton.png'"
            alt="Ready"
            class="action-icon"
          />
          <img
            v-else
            :src="pressedNotReady
              ? '/asset/notReadyButton/notReadyButtonPressed.png'
              : '/asset/notReadyButton/notReadyButton.png'"
            alt="Not Ready"
            class="action-icon"
          />
        </button>
        <button
          v-if="currentRoom?.host?.id === player?.id"
          class="start-game-button"
          @click="startGame"
        >
          <img
            :src="pressedStart
              ? '/asset/startGameButton/startGameButtonPressed.png'
              : '/asset/startGameButton/startGameButton.png'"
            alt="Start Game"
            class="action-icon"
          />
        </button>
        <label class="checkbox-label" v-if="currentRoom?.host?.id === player?.id">
          <span class="custom-checkbox" :class="{ checked: platformerMode }">
            <span v-if="platformerMode" class="checkmark">✔</span>
          </span>
          <input type="checkbox" v-model="platformerMode" class="hidden-checkbox" />
          Platformer Vs Tetris Mode
        </label>
        <button class="leave-room-button" @click="goToLobby">
          <img
            :src="pressedLeave
              ? '/asset/leaveRoomButton/leaveRoomButtonPressed.png'
              : '/asset/leaveRoomButton/leaveRoomButton.png'"
            alt="Leave Room"
            class="action-icon"
          />
        </button>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="status === 'error'" class="error-section">
      <div class="error-card">
        <p class="error-icon">✖</p>
        <p class="error-text">{{ errorMessage }}</p>
        <button class="leave-room-button" @click="goToLobby">
          <img
            :src="pressedLeave
              ? '/asset/leaveRoomButton/leaveRoomButtonPressed.png'
              : '/asset/leaveRoomButton/leaveRoomButton.png'"
            alt="Back to Lobby"
            class="action-icon"
          />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.game-url-wrapper {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  max-width: 600px;
  min-height: 80vh;
  margin: 0 auto;
  padding: 2rem 1rem;
  text-align: center;
}

/* Loading states */
.loading-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.loading-card {
  background: #1a1a2e;
  border: 3px solid #444;
  padding: 40px;
  text-align: center;
  min-width: 350px;
  max-width: 500px;
  box-shadow: 6px 6px 0 #000;
}

.loading-text {
  color: #ccc;
  font-size: 1.1rem;
  margin-top: 16px;
}

.highlight {
  color: #00eeff;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #333;
  border-top-color: #00eeff;
  animation: spin 0.8s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Room section — matches LobbyView */
.lobby-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  justify-content: center;
  width: 30%;
  right: 35%;
  height: auto;
  z-index: -1;
}

.room-title {
  display: flex;
  position: absolute;
  top: 14%;
  left: 54%;
  font-size: 2rem;
  color: #d4a030;
  letter-spacing: 2px;
  max-width: 8ch;
  overflow-wrap: break-word;
  word-break: break-all;
  line-height: 1.2;
}

.player-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: absolute;
  left: 45%;
  transform: translateX(-15%);
  list-style: none;
  padding-top: 10rem;
  gap: 0.3rem;
}

.player-list li {
  padding: 1.25rem 3.5rem;
  margin: 0.5rem 0;
  background: #33333300;
  border-radius: 8px;
  font-size: 1.1rem;
  position: relative;
}

.player-list li::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -80px;
  right: -50px;
  border: 1px solid #000;
  border-radius: 80px;
  pointer-events: none;
}

.ready-button {
  display: flex;
  position: absolute;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  align-items: center;
  top: 54%;
  left: 39%;
}

.start-game-button {
  display: flex;
  position: absolute;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  align-items: center;
  top: 54%;
  left: 47%;
}

.leave-room-button {
  display: flex;
  position: absolute;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  align-items: center;
  top: 54%;
  left: 55%;
}

.action-icon {
  width: 130px;
  height: auto;
}

.ready-button:hover .action-icon,
.start-game-button:hover .action-icon,
.leave-room-button:hover .action-icon {
  opacity: 0.8;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem;
  cursor: pointer;
  color: #d4a030;
  padding-top: 480px;
  font-size: 1rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  user-select: none;
}

.hidden-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

.custom-checkbox {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 2px solid #7a5a3a;
  border-radius: 4px;
  background: #1a1a2e;
  box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.6), 0 0 3px rgba(122, 90, 58, 0.3);
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.custom-checkbox.checked {
  background: #d4a030;
  border-color: #d4a030;
}

.checkmark {
  color: #1a1a2e;
  font-size: 15px;
  font-weight: bold;
  line-height: 1;
}

.checkbox-label:hover .custom-checkbox {
  border-color: #d4a030;
  box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.6), 0 0 6px rgba(212, 160, 48, 0.3);
}

/* Error */
.error-section {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.error-card {
  background: #1a1a2e;
  border: 3px solid #aa0000;
  padding: 40px;
  text-align: center;
  min-width: 350px;
  max-width: 500px;
  box-shadow: 6px 6px 0 #000;
}

.error-icon {
  color: #ff4444;
  font-size: 2rem;
  margin-bottom: 8px;
}

.error-text {
  color: #ff6666;
  font-size: 1.1rem;
  margin-bottom: 20px;
}
</style>