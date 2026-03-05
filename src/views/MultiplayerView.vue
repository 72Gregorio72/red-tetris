<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import OnlinePlayer from '../Classes/Player/OnlinePlayer.vue';
import OpponentPlayer from '../Classes/Player/OpponentPlayer.vue';
import { useMultiplayer } from '../composables/useMultiplayer';
import { useMultiplayerStore } from '../stores/multiplayer';
import { useSocket } from '../composables/useSocket';
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';

const multiplayer = useMultiplayer();
const multiplayerStore = useMultiplayerStore();
const { socket } = useSocket();
const router = useRouter();
const { platformerMode, playerScores, gameFinished, gameWinner } = storeToRefs(multiplayerStore);

const scoreBoard = computed(() => {
    const room = multiplayerStore.currentRoom;
    if (!room) return [];
    return room.players.map(p => ({
        id: p.id,
        name: p.name,
        score: playerScores.value[p.id] || 0,
        isMe: p.id === socket.value?.id,
    })).sort((a, b) => b.score - a.score);
});

function backToLobby() {
    multiplayerStore.gameFinished = false;
    multiplayerStore.gameWinner = null;
    multiplayer.leaveRoom();
}

onMounted(() => {
    multiplayer.registerListeners();
});

onUnmounted(() => {
    multiplayer.unregisterListeners();
});
</script>

<template>
    <!-- Game Finished Overlay -->
    <div v-if="gameFinished" class="game-finished-overlay">
        <div class="finished-card">
            <h1 class="finished-title">GAME OVER</h1>
            <div v-if="gameWinner" class="winner-section">
                <h2 class="winner-text">🏆 {{ gameWinner.name }} wins!</h2>
                <p class="winner-score">Score: {{ gameWinner.score }}</p>
            </div>
            <div class="scoreboard">
                <h3>Final Scores</h3>
                <ul>
                    <li v-for="entry in scoreBoard" :key="entry.id" :class="{ 'is-me': entry.isMe, 'is-winner': entry.id === gameWinner?.id }">
                        <span class="player-name">{{ entry.name }}</span>
                        <span class="player-score">{{ entry.score }} pts</span>
                    </li>
                </ul>
            </div>
            <button class="back-button" @click="backToLobby">Back to Lobby</button>
        </div>
    </div>

    <!-- Shared mode: one grid for both players -->
    <div v-if="platformerMode && !gameFinished" class="multiplayer-layout shared">
        <div class="shared-game">
            <p class="shared-label">Shared Grid — Platformer vs Tetris</p>
            <OnlinePlayer />
        </div>
    </div>

    <!-- Normal mode: each player has their own grid -->
    <div v-else-if="!gameFinished" class="multiplayer-layout">
        <div class="main-game">
            <OnlinePlayer />
        </div>
        <div class="opponents-side">
            <OpponentPlayer />
        </div>
    </div>
</template>

<style scoped>
.multiplayer-layout {
    display: flex;
    gap: 30px;
    justify-content: center;
    align-items: flex-start;
    padding: 20px;
    min-height: 100vh;
    flex-wrap: wrap;
}

.main-game {
    flex-shrink: 0;
}

.opponents-side {
    flex-shrink: 0;
}

.multiplayer-layout.shared {
    flex-direction: column;
    align-items: center;
}

.shared-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.shared-label {
    color: #aaa;
    font-size: 0.85rem;
    letter-spacing: 0.05em;
    margin: 0;
}

/* Game Finished Overlay */
.game-finished-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.finished-card {
    background: #1a1a2e;
    border: 3px solid #e94560;
    border-radius: 16px;
    padding: 40px;
    text-align: center;
    min-width: 350px;
    max-width: 500px;
}

.finished-title {
    color: #e94560;
    font-size: 2.5rem;
    margin: 0 0 20px;
    text-shadow: 0 0 20px rgba(233, 69, 96, 0.5);
}

.winner-section {
    margin-bottom: 20px;
}

.winner-text {
    color: #ffd700;
    font-size: 1.5rem;
    margin: 0 0 8px;
}

.winner-score {
    color: #ccc;
    font-size: 1.1rem;
    margin: 0;
}

.scoreboard {
    margin: 20px 0;
}

.scoreboard h3 {
    color: #aaa;
    margin: 0 0 12px;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.scoreboard ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.scoreboard li {
    display: flex;
    justify-content: space-between;
    padding: 8px 16px;
    margin: 4px 0;
    background: #222;
    border-radius: 8px;
    color: #ccc;
    font-size: 1rem;
}

.scoreboard li.is-me {
    color: #4caf50;
    border: 1px solid #4caf50;
}

.scoreboard li.is-winner {
    color: #ffd700;
    border: 1px solid #ffd700;
    background: #2a2a1e;
}

.player-name {
    font-weight: bold;
}

.back-button {
    margin-top: 20px;
    padding: 10px 30px;
    background: #e94560;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    cursor: pointer;
    transition: background 0.2s;
}

.back-button:hover {
    background: #c73e54;
}
</style>