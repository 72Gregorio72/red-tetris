<!-- filepath: /home/ftersill/Desktop/red-tetris/src/views/LobbyView.vue -->
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useSocket } from '../composables/useSocket';
import { useMultiplayer } from '../composables/useMultiplayer';
import { useMultiplayerStore } from '../stores/multiplayer';
import { usePlayerStore } from '../stores/player';
import { storeToRefs } from 'pinia';

const { connect } = useSocket();
const multiplayer = useMultiplayer();
const multiplayerStore = useMultiplayerStore();
const playerStore = usePlayerStore();

const { rooms, currentRoom } = storeToRefs(multiplayerStore);
const { player } = storeToRefs(playerStore);

const playerName = ref('');
const newRoomName = ref('');
const platformerMode = ref(false);

const pressedLog = ref< 'log' | null >(null);
const pressedCreate = ref< 'create' | null >(null);
const pressedRefresh = ref< 'refresh' | null >(null);
const pressedJoin = ref< string | null >(null);

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
    if (newRoomName.value.length > 12) {
      alert('Room name must be 12 characters or less.');
      return;
    }
    multiplayer.createRoom(newRoomName.value.trim());
    newRoomName.value = '';
  }
}

function joinRoom(roomId: string) {
  if (pressedJoin.value) return;
  pressedJoin.value = roomId;
  setTimeout(() => {
    multiplayer.joinRoom(roomId);
    pressedJoin.value = null;
  }, 200);
}

function toggleReady() {
  if (player.value) {
    multiplayer.toggleReady(!player.value.isReady);
  }
}

function startGame() {
  multiplayer.setPlatformerMode(platformerMode.value);
  multiplayer.startGame();
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
          @mousedown="pressedLog = 'log'"
          @mouseup="pressedLog = null"
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
              @mousedown="pressedCreate = 'create'"
              @mouseup="pressedCreate = null"
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
                @mousedown="pressedJoin = room.id"
                @mouseup="pressedJoin = null"
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
          @mousedown="pressedRefresh = 'refresh'"
          @mouseup="pressedRefresh = null"
          @click="multiplayer.fetchRooms()"
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
        <button @click="toggleReady">
          {{ player?.isReady ? 'Not Ready' : 'Ready' }}
        </button>
        <button
          v-if="currentRoom.host.id === player?.id"
          @click="startGame"
        >
          Start Game
        </button>
		<label class="checkbox-label">
          <input type="checkbox" v-model="platformerMode" />
          Platformer Vs Tetris Mode
        </label>
        <button @click="multiplayer.leaveRoom()">Leave Room</button>
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
  position: relative;
  top: 18%;
  left: 77%;
  font-size: 1.5rem;
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

/* before crea uno pseudo elemento prima di caricare l`elemento effettivo senza l`uso di html capite eh*/
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
  list-style: none;
  padding: 0;
}

.player-list li {
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: #333;
  border-radius: 4px;
}

.checkbox-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  cursor: pointer;
  color: #fff;
}

.checkbox-label input[type='checkbox'] {
  width: 1rem;
  height: 1rem;
  cursor: pointer;
}
</style>