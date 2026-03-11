<script setup lang="ts">
    import { onMounted, onUnmounted } from 'vue';
    import SinglePlayerGrid from '../GameContainer/SinglePlayerGrid.vue';
    import { useSingleplayerStore } from '../../stores/singleplayer';
    import type { Action } from '../../game/types';

    const store = useSingleplayerStore();

    const rotateSFX = new Audio('/asset/music/rotatePiece_SFX.wav');
    rotateSFX.volume = 0.5;

    const moveSFX = new Audio('/asset/music/pieceMove_SFX.wav');
    moveSFX.volume = 0.5;

    const landedSFX = new Audio('/asset/music/pieceLanded_SFX.wav');
    landedSFX.volume = 0.5;

    const lineClearSFX = new Audio('/asset/music/lineClear_SFX.wav');
    lineClearSFX.volume = 0.5;

    const fourLineClearSFX = new Audio('/asset/music/4LineClear_SFX.wav');
    fourLineClearSFX.volume = 0.5;

    function playResultSFX(result: { locked: boolean; linesCleared: number } | undefined) {
        if (!result) return;
        if (result.linesCleared >= 4) {
            fourLineClearSFX.currentTime = 0;
            fourLineClearSFX.play().catch(() => {});
        } else if (result.linesCleared > 0) {
            lineClearSFX.currentTime = 0;
            lineClearSFX.play().catch(() => {});
        } else if (result.locked) {
            landedSFX.currentTime = 0;
            landedSFX.play().catch(() => {});
        }
    }

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
            const action = actionMap[event.key]!;
            const result = store.applyAction(action);
            if (action === 'left' || action === 'right') {
                moveSFX.currentTime = 0;
                moveSFX.play().catch(() => {});
            }
            playResultSFX(result);
        }

        if (event.code === 'ArrowUp') {
            rotateSFX.currentTime = 0;
            rotateSFX.play().catch(() => {});
            store.applyAction('rotate');
        }

        if (event.code === 'Space' || event.key === ' ') {
            const result = store.applyAction('drop');
            playResultSFX(result);
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
