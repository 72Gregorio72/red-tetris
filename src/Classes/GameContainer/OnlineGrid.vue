<script setup lang="ts">
	import { computed } from 'vue';
	import { useMultiplayerStore } from '../../stores/multiplayer';
	import { useSocket } from '../../composables/useSocket';

	const multiplayerStore = useMultiplayerStore();
	const { socket } = useSocket();

	// Griglia di fallback se i dati non sono ancora caricati
	const emptyGrid = Array.from({ length: 20 }, () => Array(10).fill(0));

	// Dati reattivi dallo store
	const grid = computed(() => multiplayerStore.myDisplayGrid || emptyGrid);
	const isAlive = computed(() => multiplayerStore.isAlive);
	// Show char whenever the game state includes one (shared mode or individual platformer mode)
	const isPlatformer = computed(() => !!(multiplayerStore.player?.isPlatformer || multiplayerStore.myGameState?.platformerChar));

	// Score display
	const myPlatformerScore = computed(() => multiplayerStore.myPlatformerScore);
	const currentRound = computed(() => multiplayerStore.currentRound);
	const totalRounds = computed(() => multiplayerStore.totalRounds);
	const hasRoundInfo = computed(() => totalRounds.value > 0);

	// Bomb counter
	const myBombs = computed(() => multiplayerStore.myBombs);

	// All player scores for the HUD
	const allScores = computed(() => {
		const room = multiplayerStore.currentRoom;
		if (!room) return [];
		return room.players.map(p => ({
			id: p.id,
			name: p.name,
			score: multiplayerStore.playerScores[p.id] || 0,
			isMe: p.id === socket.value?.id,
			isPlatformer: p.isPlatformer,
		})).sort((a, b) => b.score - a.score);
	});

	// Logica per il personaggio Platformer
	const charPos = computed(() => multiplayerStore.myGameState?.platformerChar);

	const charParts = computed(() => {
		const char = charPos.value;
		if (!char || !char.shape) return [];
		
		// Calcoliamo la posizione di ogni blocco che compone il personaggio 2x1
		return char.shape.map((part: any) => ({
			x: char.x + part.dx,
			y: char.y + part.dy,
			isHead: part.dy === -1 // Il blocco superiore è la "testa"
		}));
	});

	// Funzione per assegnare le classi ai blocchi della griglia Tetris
	const getBlockClass = (cellValue: number) => {
		if (cellValue === 0) return 'empty';
		if (cellValue === 8) return 'penalty'; // Linee di disturbo grigie
		return `piece-${cellValue}`;
	};
</script>

<template>
    <div class="game-container">
        <!-- Score HUD panel on the left -->
        <div v-if="hasRoundInfo" class="score-hud">
            <div class="hud-round">
                <span class="hud-label">ROUND</span>
                <span class="hud-value">{{ currentRound }} / {{ totalRounds }}</span>
            </div>
            <div class="hud-divider"></div>

            <!-- Live score for current player -->
            <div class="hud-my-score">
                <span class="hud-label">YOUR SCORE</span>
                <span class="hud-live-score">{{ myPlatformerScore }}</span>
            </div>
            <div class="hud-divider"></div>

            <!-- Bomb counter -->
            <div class="hud-bombs">
                <span class="hud-label">BOMBS</span>
                <div class="hud-bomb-icons">
                    <span v-for="i in 3" :key="'bomb-' + i" class="bomb-icon" :class="{ 'bomb-used': i > myBombs }">&#x1F4A3;</span>
                </div>
            </div>

            <div class="hud-divider"></div>

            <div class="hud-scores">
                <div
                    v-for="entry in allScores"
                    :key="entry.id"
                    class="hud-score-entry"
                    :class="{ 'hud-me': entry.isMe, 'hud-platformer': entry.isPlatformer }"
                >
                    <span class="hud-player-name">
                        {{ entry.name }}
                        <span v-if="entry.isPlatformer" class="hud-role"> &#x1F3AE;</span>
                        <span v-else class="hud-role"> &#x1F9F1;</span>
                    </span>
                    <span class="hud-player-score">{{ entry.score }}</span>
                </div>
            </div>
        </div>

        <div class="grid-wrapper">
            <div class="grid" :class="{ 'dimmed': !isAlive }">
                <template v-for="(row, rIndex) in grid" :key="'r-' + rIndex">
                    <div
                        v-for="(cell, cIndex) in row"
                        :key="'c-' + rIndex + '-' + cIndex"
                        class="block"
                        :class="getBlockClass(cell)"
                    ></div>
                </template>

                <template v-if="isPlatformer && charParts.length">
                    <div 
                        v-for="(part, index) in charParts" 
                        :key="'char-' + index"
                        class="character-block"
                        :style="{ 
                            transform: `translate(${part.x * 30}px, ${part.y * 30}px)` 
                        }"
                    >
                        <div v-if="part.isHead" class="eyes">
                            <div class="eye"></div>
                            <div class="eye"></div>
                        </div>
                    </div>
                </template>
            </div>

            <div v-if="!isAlive" class="game-over-overlay">
                <h1 class="game-over-text">GAME OVER</h1>
            </div>
        </div>
    </div>
</template>

<style scoped>
	.game-container {
		display: flex;
		justify-content: center;
		align-items: flex-start;
		background-color: #1a1a1a;
		padding: 20px;
		border-radius: 8px;
		gap: 16px;
	}

	/* Score HUD */
	.score-hud {
		display: flex;
		flex-direction: column;
		gap: 10px;
		background: #111;
		border: 2px solid #333;
		border-radius: 10px;
		padding: 14px 16px;
		min-width: 140px;
		align-self: flex-start;
		margin-top: 4px;
	}

	.hud-round {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.hud-label {
		font-size: 0.65rem;
		color: #777;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		font-weight: bold;
	}

	.hud-value {
		font-size: 1.1rem;
		color: #fff;
		font-weight: bold;
	}

	.hud-divider {
		height: 1px;
		background: #333;
		margin: 2px 0;
	}

	.hud-my-score {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 6px 0;
	}

	.hud-live-score {
		font-size: 2rem;
		color: #4caf50;
		font-weight: bold;
		font-family: 'Courier New', monospace;
		text-shadow: 0 0 12px rgba(76, 175, 80, 0.6);
		transition: all 0.15s ease-out;
		line-height: 1;
	}

	.hud-scores {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	/* Bomb counter */
	.hud-bombs {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 4px 0;
	}

	.hud-bomb-icons {
		display: flex;
		gap: 6px;
		font-size: 1.4rem;
		margin-top: 4px;
	}

	.bomb-icon {
		transition: opacity 0.3s, filter 0.3s;
	}

	.bomb-icon.bomb-used {
		opacity: 0.2;
		filter: grayscale(1);
	}

	.hud-score-entry {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 5px 8px;
		background: #1a1a2e;
		border-radius: 6px;
		border: 1px solid #222;
		transition: border-color 0.3s;
	}

	.hud-score-entry.hud-me {
		border-color: #4caf50;
	}

	.hud-score-entry.hud-platformer {
		background: #2a1a2e;
	}

	.hud-player-name {
		color: #ccc;
		font-size: 0.8rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 85px;
	}

	.hud-me .hud-player-name {
		color: #4caf50;
	}

	.hud-role {
		font-size: 0.7rem;
	}

	.hud-player-score {
		color: #ffd700;
		font-size: 1rem;
		font-weight: bold;
		font-family: 'Courier New', monospace;
		min-width: 30px;
		text-align: right;
	}

	.grid-wrapper {
		position: relative; /* Essenziale per il posizionamento absolute del personaggio */
		border: 4px solid #333;
		background-color: #000;
		line-height: 0; /* Rimuove gap tra i div della griglia */
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(10, 30px);
		grid-template-rows: repeat(20, 30px);
		width: 300px;
		height: 600px;
	}

	.dimmed {
		opacity: 0.4;
		filter: grayscale(1);
	}

	.block {
		width: 30px;
		height: 30px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		box-sizing: border-box;
	}

	/* Classi per i pezzi Tetris */
	.empty { background-color: transparent; }
	.penalty { background-color: #444; border: 1px solid #666; }
	.piece-1 { background-color: #00FFFF; border: 2px solid #fff; border-radius: 4px; }
	.piece-2 { background-color: #FFFF00; border: 2px solid #fff; border-radius: 4px; }
	.piece-3 { background-color: #800080; border: 2px solid #fff; border-radius: 4px; }
	.piece-4 { background-color: #00FF00; border: 2px solid #fff; border-radius: 4px; }
	.piece-5 { background-color: #FF0000; border: 2px solid #fff; border-radius: 4px; }
	.piece-6 { background-color: #0000FF; border: 2px solid #fff; border-radius: 4px; }
	.piece-7 { background-color: #FFA500; border: 2px solid #fff; border-radius: 4px; }

	/* Stile Personaggio Platformer */
	.character-block {
		position: absolute;
		top: 0;
		left: 0;
		width: 30px;
		height: 30px;
		background-color: #FF00FF; /* Magenta */
		border: 2px solid #FFF;
		box-sizing: border-box;
		z-index: 100;
		transition: transform 0.05s linear; /* Movimento fluido a 60fps */
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.eyes {
		display: flex;
		justify-content: space-around;
		width: 100%;
		padding: 0 4px;
	}

	.eye {
		width: 6px;
		height: 6px;
		background-color: white;
		border-radius: 50%;
	}

	/* UI Game Over */
	.game-over-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 200;
	}

	.game-over-text {
		color: #ff4444;
		font-family: 'Arial Black', sans-serif;
		font-size: 2rem;
		text-shadow: 2px 2px #000;
		border: 3px solid #ff4444;
		padding: 10px 20px;
		transform: rotate(-5deg);
	}
</style>