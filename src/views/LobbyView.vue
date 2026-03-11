<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useSocket } from '../composables/useSocket';
import { useMultiplayer } from '../composables/useMultiplayer';
import { useMultiplayerStore } from '../stores/multiplayer';
import { usePlayerStore } from '../stores/player';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

const { connect } = useSocket();
const multiplayer = useMultiplayer();
const multiplayerStore = useMultiplayerStore();
const playerStore = usePlayerStore();
const router = useRouter();

const { rooms, currentRoom } = storeToRefs(multiplayerStore);
const { player } = storeToRefs(playerStore);

const playerName = ref('');
const newRoomName = ref('');
const platformerMode = ref(false);

const pressedLog = ref< 'log' | null >(null);
const pressedCreate = ref< 'create' | null >(null);
const pressedRefresh = ref< 'refresh' | null >(null);
const pressedJoin = ref< string | null >(null);
const pressedReady = ref< 'ready' | null >(null);
const pressedNotReady = ref< 'notReady' | null >(null);
const pressedStart = ref< 'start' | null >(null);
const pressedLeave = ref< 'leave' | null >(null);

const sfxbutton = new Audio('/asset/music/buttonClick_SFX.wav') 

sfxbutton.volume = 0.5;

// When we join a room, redirect to the URL-based view
watch(currentRoom, (newRoom) => {
  if (newRoom && player.value) {
    router.push({
      name: 'game-url',
      params: {
        room: newRoom.name,
        playerName: player.value.name,
      },
    });
  }
});

onMounted(() => {
    connect();
    multiplayer.registerListeners();
});

onUnmounted(() => {
    multiplayer.unregisterListeners();
});

function register(button: 'log' | null = null) {
  if (playerName.value.trim()) {
    if (pressedLog.value) return;
    pressedLog.value = button;
    sfxbutton.currentTime = 0;
    sfxbutton.play().catch(() => {});

    if (playerName.value.length > 12) {
      alert('Player name must be 12 characters or less.');
      pressedLog.value = null;
      return;
    }
    setTimeout(() => {
          multiplayer.registerPlayer(playerName.value.trim());
      }, 200);
    }
}

function createRoom() {
  if (newRoomName.value.trim()) {
    if (pressedCreate.value) return;
    pressedCreate.value = 'create';
    sfxbutton.currentTime = 0;
    sfxbutton.play().catch(() => {});
    if (newRoomName.value.length > 12) {
      alert('Room name must be 12 characters or less.');
      pressedCreate.value = null;
      return;
    }
    const roomName = newRoomName.value.trim();
    newRoomName.value = '';
    setTimeout(() => {
      multiplayer.createRoom(roomName);
      pressedCreate.value = null;
    }, 200);
  }
}

function joinRoom(roomId: string) {
  if (pressedJoin.value) return;
  pressedJoin.value = roomId;
  sfxbutton.currentTime = 0;
  sfxbutton.play().catch(() => {});
  setTimeout(() => {
    multiplayer.joinRoom(roomId);
    pressedJoin.value = null;
  }, 200);
}

function refreshRooms() {
  if (pressedRefresh.value) return;
  pressedRefresh.value = 'refresh';
  sfxbutton.currentTime = 0;
  sfxbutton.play().catch(() => {});
  setTimeout(() => {
    multiplayer.fetchRooms();
    pressedRefresh.value = null;
  }, 200);
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
  multiplayer.setPlatformerMode(platformerMode.value);
  multiplayer.startGame();
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

function leaveRoom() {
  if (pressedLeave.value) return;
  pressedLeave.value = 'leave';
  sfxbutton.currentTime = 0;
  sfxbutton.play().catch(() => {});
  setTimeout(() => {
    multiplayer.leaveRoom();
    pressedLeave.value = null;
  }, 200);
}
</script>

<template>
  <div class="lobby">
    <div v-if="!player" class="register-section">
      <img src="../../public/asset/enterYourNameHolder.png" alt="enter your name" class="enter-image"/>

      <div class="input-container">
        <div class="textured-input">
          <input v-model="playerName" placeholder="Player name" @keyup.enter="register('log')" />
        </div>

        <button
          class="log-button"
          @click="register('log')"
        >
          <img
            :src="pressedLog
              ? '/asset/logButton/logButtonPressed.png'
              : '/asset/logButton/logButton.png'"
            alt="Login"
            class="log-image"
          />
        </button>
      </div>
    </div>

    <div v-else-if="!currentRoom" class="rooms-section">
      <img src="../../public/asset/roomHolder.png" alt="lobby title" class="enter-image"/>
      <div class="rooms-overlay">
        <h2 class="welcome-title">Welcome, {{ player?.name }}</h2>
        <div class="create-room">
          <div class="textured-input2">
            <input v-model="newRoomName" placeholder="Room name" @keyup.enter="createRoom" />
          </div>
            <button
              class="create-room-button"
              @click="createRoom"
            >
              <img
                :src="pressedCreate
                  ? '/asset/createRoomButton/createRoomButtonPressed.png'
                  : '/asset/createRoomButton/createRoomButton.png'"
                alt="Create Room"
                class="create-room-icon"
              />
            </button>
        </div>

        <div class="rooms-container">
          <ul v-if="rooms.length > 0" class="room-list">
            <li v-for="room in rooms" :key="room.id" class="room-item">
              <span>{{ room.name }} ({{ room.playerCount }}/{{ room.maxPlayers }})</span>
              <button
                :disabled="room.playerCount >= room.maxPlayers"
                class="join-button"
                @click="joinRoom(room.id)"
              >
                <img
                  :src="pressedJoin === room.id
                    ? '/asset/joinButton/joinButtonPressed.png'
                    : '/asset/joinButton/joinButton.png'"
                  alt="Join Room"
                  class="join-icon"
                />
              </button>
            </li>
          </ul>
          <p v-else class="no-rooms-text">NO ROOM AVAILABLE</p>
        </div>
        <button
          class="refresh-button"
          @click="refreshRooms()"
        >
          <img
            :src="pressedRefresh
              ? '/asset/refreshButton/refreshButtonPressed.png'
              : '/asset/refreshButton/refreshButton.png'"
            alt="Refresh Rooms"
            class="refresh-icon"
          />
        </button>
      </div>
    </div>

    <div v-else class="room-section">
      <img src="../../public/asset/lobbyHolder.png" alt="room title" class="lobby-image"/>
      <h2 class="room-title">{{ currentRoom.name }}</h2>

      <ul class="player-list">
        <li v-for="p in currentRoom.players" :key="p.id">
          {{ p.name }}
          <span v-if="p.isReady"> ✅</span>
          <span v-else> ⏳</span>
          <span v-if="currentRoom.host.id === player?.id"> 👑</span>
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
          v-if="currentRoom.host.id === player?.id"
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
        <label class="checkbox-label">
          <span class="custom-checkbox" :class="{ checked: platformerMode }">
            <span v-if="platformerMode" class="checkmark">✔</span>
          </span>
          <input type="checkbox" v-model="platformerMode" class="hidden-checkbox" />
          Platformer Vs Tetris Mode
        </label>
        <button class="leave-room-button" @click="leaveRoom()">
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
  </div>
</template>

<style scoped>
.lobby {
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

.rooms-section {
  width: 100%;
  max-width: 520px;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.rooms-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2.25rem 1.5rem;
  z-index: 2;
  gap: 0.5rem;
}

.welcome-title {
  font-size: 1.8rem;
  color: #d4a030;
  letter-spacing: 2px;
  margin: 0 0 1rem 0;
  padding-right: 30px;
}

.available-rooms-title {
  font-size: 1.4rem;
  color: #d4a030;
  text-transform: uppercase;
  letter-spacing: 2px;
  margin: 0 0 0.8rem 0;
}

.no-rooms-text {
  font-size: 2rem;
  color: #ccc;
  letter-spacing: 1px;
  margin: 1rem 0;
  padding-top: 30px;
}

.room-title {
  display: flex;
  position: absolute;
  top: 12%;
  left: 54%;
  font-size: 3rem;
  color: #d4a030;
  letter-spacing: 2px;
  max-width: 20px;
}

input {
  padding: 0.5rem 0.75rem;
  color: #ff0000;
  background-color: #bbaa1600;
  font-size: 1rem;
}

.button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  cursor: pointer;
  margin: 0.25rem;
}

.enter-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: auto;
    z-index: 1;
}

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

.register-section {
  display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 100%;
    position: relative;
    max-width: 520px;
}

.log-button {
  display: flex;
  background: none;
  border: none;
  cursor: pointer;
  width: 170px;
  margin: 0;
  padding: 0;
  position: static;
  padding-top: 30px;
}

.log-image {
  display: block;
  width: 100%;
  height: auto;
}

.log-button:hover .log-image {
  opacity: 0.8;
}

.input-container {
  position: absolute;
  left: 50%;
  top: 63%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 2;
}

.textured-input {
  width: 220px;
  height: 56px;
  display: flex;
  align-items: center;
  padding: 10px 10px;
  background: none;
  padding-top: 40px;
}

.textured-input2 {
  width: 220px;
  height: 56px;
  display: flex;
  align-items: center;
  padding: 10px 10px;
  background: none;
  padding-top: 20px;
  padding-right: 270px;
}

.textured-input input , 
.textured-input2 input {
  position: static;
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #bbaa16c4;
  font-size: 1.6rem;
}

.create-room-button, .refresh-button {
  display: flex;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  align-items: center;
}

.create-room-button {
  position: absolute;
  top: 18%;
  right: 14%;
  padding-right: 50px;
}

.refresh-button {
  position: absolute;
  bottom: 23%;
  left: 35%;  
}

.create-room-icon {
  width: 110px;
  height: auto;
}

.refresh-icon {
  width: 130px;
  height: auto;
  padding-right: 45px;
}

.create-room {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 100%;
}

.create-room input {
  margin-right: 0;
  flex: 1;
  max-width: 250px;
}


.join-button {
  display: flex;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  align-items: center;
  width: 85px;
  height: 85px;
}

.join-icon {
  width: 85px;
  height: auto;
}

.rooms-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 0.5rem 1rem;
  min-height: 300px;
  padding-top: 90px;
  padding-right: 70px;
}

button:disabled {
  background: #666;
  cursor: not-allowed;
}

.room-list {
  display: flex;
  flex-direction: column;
  width: 68%;
  height: 30%;
  list-style: decimal;
  padding-bottom: -10px;
  max-height: 300px;
  overflow-y: scroll;
  scrollbar-width: thin;
  scrollbar-color: #7a5a3a #14141454;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 0.5rem auto;
  background: none;
  border-radius: 8px;
  height: 50%;
  width: 80%;
  max-width: 300px;
  position: relative;
}

.room-item::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -8px;
  right: -8px;
  border: 1px solid #000;
  border-radius: 8px;
  pointer-events: none;
}

.player-list {
  display: flex;
  position: absolute;
  list-style: none;
  padding-top: 10rem;
}

.player-list li {
  padding: 1.25rem 3.5rem;
  margin: 0.5rem 0;
  background: #33333300;
  border-radius: 8px;
  font-size: 1.4rem;
  position: relative;
}

.player-list li::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -80px;
  right: -80px;
  border: 1px solid #000;
  border-radius: 8px;
  pointer-events: none;
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

.ready-button {
  display: flex;
  position:absolute;
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
</style>