<script setup lang="ts">
    import { onMounted, onUnmounted } from 'vue';
    import SinglePlayerGrid from '../GameContainer/SinglePlayerGrid.vue';
    import { useSingleplayerStore } from '../../stores/singleplayer';
    import type { Action } from '../../../server/game/GameEngine';

    const store = useSingleplayerStore();

    const handleKeyDown = (event: KeyboardEvent) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(event.key) || event.code === 'Space') {
            event.preventDefault();
        }

        if (store.gameOver) {
            if (event.key === 'Enter') {
                store.restart();
            }
            return;
        }

        if (!store.isPlaying) return;

        const actionMap: Record<string, Action> = {
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'ArrowDown': 'down',
        };

        if (actionMap[event.key]) {
            store.applyAction(actionMap[event.key]!);
        }

        if (event.code === 'ArrowUp') {
            store.applyAction('rotate');
        }

        if (event.code === 'Space' || event.key === ' ') {
            store.applyAction('drop');
        }
    };

    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown);
        store.startGame();
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
        store.stopGameLoop();
    });
</script>

<template>
    <SinglePlayerGrid />
</template>
