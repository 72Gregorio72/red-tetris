<script setup lang="ts">
	import { computed } from 'vue';
	import { useMultiplayerStore } from '../../stores/multiplayer';

	const multiplayerStore = useMultiplayerStore();

	// Griglia di fallback se i dati non sono ancora caricati
	const emptyGrid = Array.from({ length: 20 }, () => Array(10).fill(0));

	// Dati reattivi dallo store
	const grid = computed(() => multiplayerStore.myDisplayGrid || emptyGrid);
	const isAlive = computed(() => multiplayerStore.isAlive);
	const isPlatformer = computed(() => multiplayerStore.player?.isPlatformer || false);

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
		align-items: center;
		background-color: #1a1a1a;
		padding: 20px;
		border-radius: 8px;
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