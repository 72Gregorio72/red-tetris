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
      <h2>Enter your name</h2>
      <input v-model="playerName" placeholder="Player name" @keyup.enter="register" />
      <button @click="register">Join</button>
    </div>

    <div v-else-if="!currentRoom" class="rooms-section">
      <h2>Welcome, {{ player?.name }}</h2>

      <div class="create-room">
        <input v-model="newRoomName" placeholder="Room name" @keyup.enter="createRoom" />
        <button @click="createRoom">Create Room</button>
      </div>

      <h3>Available Rooms</h3>
      <ul class="room-list">
        <li v-for="room in rooms" :key="room.id" class="room-item">
          <span>{{ room.name }} ({{ room.playerCount }}/{{ room.maxPlayers }})</span>
          <button
            :disabled="room.playerCount >= room.maxPlayers"
            @click="joinRoom(room.id)"
          >
            Join
          </button>
        </li>
        <li v-if="rooms.length === 0">No rooms available</li>
      </ul>

      <button @click="multiplayer.fetchRooms()">Refresh</button>
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
  max-width: 600px;
  margin: 2rem auto;
  padding: 1rem;
  text-align: center;
}

input {
  padding: 0.5rem;
  margin-right: 0.5rem;
  border: 1px solid #555;
  border-radius: 4px;
  background: #222;
  color: #fff;
}

button {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  background: #4caf50;
  color: white;
  cursor: pointer;
  margin: 0.25rem;
}

button:disabled {
  background: #666;
  cursor: not-allowed;
}

.room-list {
  list-style: none;
  padding: 0;
}

.room-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  margin: 0.25rem 0;
  background: #333;
  border-radius: 4px;
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