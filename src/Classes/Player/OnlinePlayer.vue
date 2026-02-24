<script setup lang="ts">
    import { onMounted, onUnmounted } from 'vue';
    import OnlineGrid from '../GameContainer/OnlineGrid.vue';
    import { useMultiplayer } from '@/composables/useMultiplayer'; 
    import { useSocket } from '@/composables/useSocket';
    import { useMultiplayerStore } from '../../stores/multiplayer';

    const { emit } = useMultiplayer();
    const { socket } = useSocket();
    const multiplayerStore = useMultiplayerStore();

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'ArrowLeft') emit('game:action', { action: 'left' });
        if (event.key === 'ArrowRight') emit('game:action', { action: 'right' });
        if (event.key === 'ArrowDown') emit('game:action', { action: 'down' });
        if (event.code === 'ArrowUp') emit('game:action', { action: 'rotate' });
        if (event.code === 'Space' || event.key === ' ') emit('game:action', { action: 'drop' });
    }

    onMounted(() => {
        window.addEventListener('keydown', handleKeyPress);
        
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
        window.removeEventListener('keydown', handleKeyPress);
        socket.value?.off('game:state_update');
    });
</script>

<template>
    <OnlineGrid />
</template>