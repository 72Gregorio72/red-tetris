<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import OnlinePlayer from '../Classes/Player/OnlinePlayer.vue';
import OpponentPlayer from '../Classes/Player/OpponentPlayer.vue';
import { useMultiplayer } from '../composables/useMultiplayer';

const multiplayer = useMultiplayer();

onMounted(() => {
    multiplayer.registerListeners();
});

onUnmounted(() => {
    multiplayer.unregisterListeners();
});
</script>

<template>
    <div class="multiplayer-layout">
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
</style>