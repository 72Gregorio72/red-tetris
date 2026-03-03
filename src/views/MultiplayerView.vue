<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import OnlinePlayer from '../Classes/Player/OnlinePlayer.vue';
import OpponentPlayer from '../Classes/Player/OpponentPlayer.vue';
import { useMultiplayer } from '../composables/useMultiplayer';
import { useMultiplayerStore } from '../stores/multiplayer';
import { storeToRefs } from 'pinia';

const multiplayer = useMultiplayer();
const multiplayerStore = useMultiplayerStore();
const { platformerMode } = storeToRefs(multiplayerStore);

onMounted(() => {
    multiplayer.registerListeners();
});

onUnmounted(() => {
    multiplayer.unregisterListeners();
});
</script>

<template>
    <!-- Shared mode: one grid for both players -->
    <div v-if="platformerMode" class="multiplayer-layout shared">
        <div class="shared-game">
            <p class="shared-label">Shared Grid — Platformer vs Tetris</p>
            <OnlinePlayer />
        </div>
    </div>

    <!-- Normal mode: each player has their own grid -->
    <div v-else class="multiplayer-layout">
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
</style>