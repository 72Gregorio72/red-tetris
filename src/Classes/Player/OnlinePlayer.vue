<script setup lang="ts">
    import { onMounted, onUnmounted, computed } from 'vue';
    import OnlineGrid from '../GameContainer/OnlineGrid.vue';
    import { useMultiplayer } from '@/composables/useMultiplayer'; 
    import { useSocket } from '@/composables/useSocket';
    import { useMultiplayerStore } from '../../stores/multiplayer';

    const { emit } = useMultiplayer();
    const { socket } = useSocket();
    const multiplayerStore = useMultiplayerStore();

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

    const platformerJumpSFX = new Audio('/asset/music/platformerJump.wav');
    platformerJumpSFX.volume = 1.0;

    const bombDropSFX = new Audio('/asset/music/bombDestroyed.wav');
    bombDropSFX.volume = 0.5;

    // Track whether the local player is a platformer
    const isPlatformer = computed(() => {
        const room = multiplayerStore.currentRoom;
        if (!room || !socket.value) return false;
        const me = room.players.find(p => p.id === socket.value!.id);
        return me?.isPlatformer ?? false;
    });

    // Track previous state for detecting piece locks and line clears
    let prevLinesCleared = 0;
    let prevPieceIndex = 0;

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
            // For platformer: track key state; the interval loop handles continuous left/right
            if (!keysPressed.has(event.key)) {
                keysPressed.add(event.key);
                
            }
            // Jump / down are still single-fire from keydown
            if (event.code === 'ArrowUp') {
                emit('game:action', { action: 'rotate' });
                platformerJumpSFX.currentTime = 0;
                platformerJumpSFX.play().catch(() => {});
            }
            if (event.key === 'ArrowDown') {
                emit('game:action', { action: 'down' });
                bombDropSFX.currentTime = 0;
                bombDropSFX.play().catch(() => {});
            }
            if (event.code === 'Space' || event.key === ' ') emit('game:action', { action: 'drop' });
        } else {
            // Tetris: keep original behaviour (native key repeat)
            if (event.key === 'ArrowLeft') {
                emit('game:action', { action: 'left' });
                moveSFX.currentTime = 0;
                moveSFX.play().catch(() => {});
            }
            if (event.key === 'ArrowRight') {
                emit('game:action', { action: 'right' });
                moveSFX.currentTime = 0;
                moveSFX.play().catch(() => {});
            }
            if (event.key === 'ArrowDown') emit('game:action', { action: 'down' });
            if (event.code === 'ArrowUp') {
                emit('game:action', { action: 'rotate' });
                rotateSFX.currentTime = 0;
                rotateSFX.play().catch(() => {});
            }
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
        
        socket.value?.on('game:state_update', (roomState: Array<{ id: string; state: any; displayGrid: number[][]; platformerScore?: number; bombs?: number; nextPieces?: string[] }>) => {
            const myData = roomState.find(p => p.id === socket.value?.id);
            if (myData && socket.value?.id) {
                // Detect piece lock (pieceIndex increased = a piece was placed)
                const newPieceIndex = myData.state?.pieceIndex ?? 0;
                if (newPieceIndex > prevPieceIndex && prevPieceIndex > 0) {
                    landedSFX.currentTime = 0;
                    landedSFX.play().catch(() => {});
                }
                prevPieceIndex = newPieceIndex;

                // Detect line clears
                const newLinesCleared = myData.state?.linesCleared ?? 0;
                if (newLinesCleared > prevLinesCleared && prevLinesCleared >= 0) {
                    const diff = newLinesCleared - prevLinesCleared;
                    if (diff >= 4) {
                        fourLineClearSFX.currentTime = 0;
                        fourLineClearSFX.play().catch(() => {});
                    } else if (diff >= 1) {
                        lineClearSFX.currentTime = 0;
                        lineClearSFX.play().catch(() => {});
                    }
                }
                prevLinesCleared = newLinesCleared;

                multiplayerStore.myGameState = myData.state; 
                multiplayerStore.setOpponentGrid(socket.value.id, myData.displayGrid);
				multiplayerStore.myDisplayGrid = myData.displayGrid;
				if (myData.platformerScore !== undefined) {
					multiplayerStore.myPlatformerScore = myData.platformerScore;
				}
				if (myData.bombs !== undefined) {
					multiplayerStore.myBombs = myData.bombs;
				}
				if (myData.nextPieces) {
					multiplayerStore.myNextPieces = myData.nextPieces;
				}
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