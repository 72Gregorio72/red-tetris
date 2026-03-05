<script setup lang="ts">
    import { onMounted, onUnmounted, computed } from 'vue';
    import OnlineGrid from '../GameContainer/OnlineGrid.vue';
    import { useMultiplayer } from '@/composables/useMultiplayer'; 
    import { useSocket } from '@/composables/useSocket';
    import { useMultiplayerStore } from '../../stores/multiplayer';

    const { emit } = useMultiplayer();
    const { socket } = useSocket();
    const multiplayerStore = useMultiplayerStore();

    // Track whether the local player is a platformer
    const isPlatformer = computed(() => {
        const room = multiplayerStore.currentRoom;
        if (!room || !socket.value) return false;
        const me = room.players.find(p => p.id === socket.value!.id);
        return me?.isPlatformer ?? false;
    });

    // --- Smooth platformer movement via key-state tracking ---
    const keysPressed = new Set<string>();
    const PLATFORMER_MOVE_INTERVAL = 50; // ms between moves while holding
    let platformerLoopId: number | null = null;

    function startPlatformerLoop() {
        if (platformerLoopId !== null) return;
        platformerLoopId = window.setInterval(() => {
            if (keysPressed.has('ArrowLeft'))  emit('game:action', { action: 'left' });
            if (keysPressed.has('ArrowRight')) emit('game:action', { action: 'right' });
        }, PLATFORMER_MOVE_INTERVAL);
    }

    function stopPlatformerLoop() {
        if (platformerLoopId !== null) {
            clearInterval(platformerLoopId);
            platformerLoopId = null;
        }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' '].includes(event.key) || event.code === 'Space') {
            event.preventDefault();
        }

        if (isPlatformer.value) {
            // For platformer: track key state; the loop handles continuous movement
            if (!keysPressed.has(event.key)) {
                keysPressed.add(event.key);
                // Send an immediate action on first press
                if (event.key === 'ArrowLeft')  emit('game:action', { action: 'left' });
                if (event.key === 'ArrowRight') emit('game:action', { action: 'right' });
            }
            // Jump / down are still single-fire from keydown
            if (event.code === 'ArrowUp') emit('game:action', { action: 'rotate' });
            if (event.key === 'ArrowDown') emit('game:action', { action: 'down' });
            if (event.code === 'Space' || event.key === ' ') emit('game:action', { action: 'drop' });
        } else {
            // Tetris: keep original behaviour (native key repeat)
            if (event.key === 'ArrowLeft') emit('game:action', { action: 'left' });
            if (event.key === 'ArrowRight') emit('game:action', { action: 'right' });
            if (event.key === 'ArrowDown') emit('game:action', { action: 'down' });
            if (event.code === 'ArrowUp') emit('game:action', { action: 'rotate' });
            if (event.code === 'Space' || event.key === ' ') emit('game:action', { action: 'drop' });
        }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
        keysPressed.delete(event.key);
    };

    onMounted(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        startPlatformerLoop();
        
        socket.value?.on('game:state_update', (roomState: Array<{ id: string; state: any; displayGrid: number[][] }>) => {
            const myData = roomState.find(p => p.id === socket.value?.id);
            if (myData && socket.value?.id) {
                multiplayerStore.myGameState = myData.state; 
                multiplayerStore.setOpponentGrid(socket.value.id, myData.displayGrid);
				multiplayerStore.myDisplayGrid = myData.displayGrid;
            }
            
            const opponents = roomState.filter(p => p.id !== socket.value?.id);
            multiplayerStore.opponentsState = opponents;
        });
    });

    onUnmounted(() => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        stopPlatformerLoop();
        keysPressed.clear();
        socket.value?.off('game:state_update');
    });
</script>

<template>
    <OnlineGrid />
</template>