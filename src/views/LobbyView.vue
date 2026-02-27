<!-- filepath: /home/gpicchio/Desktop/red-tetris/red-tetrisGit/src/views/LobbyView.vue -->
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

onMounted(() => {
	connect();
	multiplayer.registerListeners();
});

onUnmounted(() => {
	multiplayer.unregisterListeners();
});

function register() {
	if (playerName.value.trim()) {
		multiplayer.registerPlayer(playerName.value.trim());
	}
}

function createRoom() {
  if (newRoomName.value.trim()) {
    multiplayer.createRoom(newRoomName.value.trim());
    newRoomName.value = '';
  }
}

function joinRoom(roomId: string) {
  multiplayer.joinRoom(roomId);
}

function toggleReady() {
  if (player.value) {
    multiplayer.toggleReady(!player.value.isReady);
  }
}

function startGame() {
  multiplayer.startGame();
}
</script>

<template>
  <div class="lobby">
    <div v-if="!player" class="register-section">
      <img src="../../public/asset/enter_your_name.png" alt="enter your name" class="enter-image"/>  
      <div class="input-container">
        <div class="textured-input">
          <input v-model="playerName" placeholder="Player name" @keyup.enter="register" />
        </div>
        <button @click="register" class="register-button">
          <img src="../../public/asset/go_button.png" alt="Login" class="register-icon"/>
        </button>
      </div>
    </div>

    <div v-else-if="!currentRoom" class="rooms-section">
      <h2>Welcome, {{ player?.name }}</h2>

      <div class="create-room">
        <input v-model="newRoomName" placeholder="Room name" @keyup.enter="createRoom" />
        <button @click="createRoom" class="create-room-button">
          <img src="../../public/asset/create_room_button.png" alt="Create Room" class="create-room-icon"/>
        </button>
      </div>
      <img src="../../public/asset/available_rooms.png" alt="Available rooms" class="available-image"/>
      <div class="rooms-container">
        <ul class="room-list">
          <li v-for="room in rooms" :key="room.id" class="room-item">
            <span>{{ room.name }} ({{ room.playerCount }}/{{ room.maxPlayers }})</span>
            <button
              :disabled="room.playerCount >= room.maxPlayers" 
              @click="joinRoom(room.id)"
              class="join-button"
            >
              <img src="../../public/asset/join-button.png" alt="Join Room" class="join-icon"/>
            </button>
          </li>
        </ul>
        <div v-if="rooms.length === 0" class="no-rooms-wrapper">
          <img src="../../public/asset/no_rooms_available.png" alt="No rooms available" class="no-rooms-image"/>
        </div>
      </div>

      <button @click="multiplayer.fetchRooms()" class="refresh-button">
        <img src="../../public/asset/refresh_button.png" alt="Refresh Rooms" class="refresh-icon"/>
      </button>
    </div>

    <div v-else class="room-section">
      <h2>Room: {{ currentRoom.name }}</h2>

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
  display: flex;
  flex-direction: column;
  align-items: center;
}

input {
  padding: 0.5rem;
  margin-right: 0.5rem;
  border: 1px solid #555;
  border-radius: 4px;
  background: #222;
  color: #fff;
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
  width: 500px;
  height: auto;
  margin-bottom: 1rem;
}

.register-section {
  display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
  
	width: 100%;
}

.input-container {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.textured-input {
  position: relative;
  background-image: url('../../public/asset/text_box.png');
  background-size: cover;
  background-position: center;
  width: 300px;
  height: 150px;
  display: flex;
  align-items: center;
}

.textured-input input {
  position: relative;
  bottom: 7px;
  background: transparent;
  border: none;
  outline: none;
  width: 100%;
  height: 100%;
  padding: 0 2.5rem;
  color: #000000;
  font-size: 2rem;
  margin-right: 0;
}

.register-button {
  display: flex;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  align-items: center;
}

.register-icon {
  width: 200px;
  height: auto;
}

.create-room-button, .refresh-button {
  display: flex;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  align-items: center;
}

.refresh-button {
  margin-top: -3rem;
}

.create-room-icon, .refresh-icon {
  width: 150px;
  height: auto;
}

.create-room, .refresh-section {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.create-room input {
  margin-right: 0;
  max-width: 300px;
  width: 100%;
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

.register-button:hover, .create-room-button:hover, .refresh-button:hover {
	transform: scale(1.05);
}

.register-button:active, .create-room-button:active, .refresh-button:active {
	transform: scale(0.95);
}

.join-button:hover {
  transform: scale(1.02);
}

.join-button:active {
  transform: scale(0.98);
}

.rooms-container{
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 1.5rem;
  border: 50px solid transparent; 
  image-rendering: pixelated;
  margin-top: 0rem;
}

.available-image {
  display: flex;
  width: 400px;
  height: auto;
  margin-bottom: -5rem;
}

.no-rooms-image {
  display: flex;
  width: 350px;
  height: auto;
  margin: -6rem 8rem;
  }

button:disabled {
  background: #666;
  cursor: not-allowed;
}

.room-list {
  display: flex;
  flex-direction: column;
  width: 100%;
  list-style: none;
  padding: 0;
  max-height: 300px;
  overflow-y: scroll;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.1rem 1.5rem;
  margin: 0.5rem auto;
  background: #333;
  border-radius: 8px;
  width: 80%;
  max-width: 500px;
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
</style>