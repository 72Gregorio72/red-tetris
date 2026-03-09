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

	// Round-end transition info
	const roundEndInfo = computed(() => multiplayerStore.roundEndInfo);
	const roundEndReason = computed(() => {
		if (!roundEndInfo.value) return '';
		return roundEndInfo.value.reason === 'platformer_died' 
			? 'PLATFORMER ELIMINATED!' 
			: 'TETRIS PLAYER DOWN!';
	});
	const roundEndMyRole = computed(() => {
		if (!roundEndInfo.value || !socket.value) return '';
		const myId = socket.value.id;
		if (roundEndInfo.value.newPlatformer.id === myId) return 'PLATFORMER';
		if (roundEndInfo.value.newTetris.id === myId) return 'TETRIS';
		return '';
	});
</script>

<template>
    <div class="arcade-cabinet">
        <!-- Corner screws -->
        <div class="screw screw-tl"></div>
        <div class="screw screw-tr"></div>
        <div class="screw screw-bl"></div>
        <div class="screw screw-br"></div>

        <div class="cabinet-body">
            <!-- Top screws row -->
            <div class="screw-row screw-row-top">
                <div class="screw-inner"></div>
                <div class="screw-inner"></div>
                <div class="screw-inner"></div>
                <div class="screw-inner"></div>
            </div>

            <div class="cabinet-content">
                <!-- Score HUD panel on the left -->
                <div class="score-hud" :class="{ 'hud-visible': hasRoundInfo }">
                    <template v-if="hasRoundInfo">
                        <div class="hud-section">
                            <div class="hud-round">
                                <span class="hud-label">ROUND</span>
                                <span class="hud-value">{{ currentRound }} / {{ totalRounds }}</span>
                            </div>
                        </div>
                        <div class="hud-divider"></div>

                        <div class="hud-section">
                            <div class="hud-my-score">
                                <span class="hud-label">YOUR SCORE</span>
                                <span class="hud-live-score">{{ myPlatformerScore }}</span>
                            </div>
                        </div>
                        <div class="hud-divider"></div>

                        <div class="hud-section">
                            <div class="hud-bombs">
                                <span class="hud-label">BOMBS</span>
                                <div class="hud-bomb-icons">
                                    <img v-for="i in 3" :key="'bomb-' + i" src="/asset/GameUi/Bomb.png" class="bomb-icon" :class="{ 'bomb-used': i > myBombs }" alt="bomb" />
                                </div>
                            </div>
                        </div>
                        <div class="hud-divider"></div>

                        <div class="hud-section hud-scores">
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
                    </template>
                </div>

                <!-- Game grid area -->
                <div class="grid-frame">
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

                        <!-- Round-end transition overlay -->
                        <div v-if="roundEndInfo" class="round-end-overlay">
                            <div class="round-end-content">
                                <p class="round-end-reason">{{ roundEndReason }}</p>
                                <div class="round-end-divider"></div>
                                <p class="round-end-role">YOU ARE NOW <span class="role-highlight" :class="roundEndMyRole.toLowerCase()">{{ roundEndMyRole }}</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Bottom detail bar -->
            <div class="cabinet-bottom">
                <div class="vent-grille">
                    <div class="vent-line"></div>
                    <div class="vent-line"></div>
                    <div class="vent-line"></div>
                    <div class="vent-line"></div>
                    <div class="vent-line"></div>
                </div>
                <div class="bottom-screws">
                    <div class="screw-inner"></div>
                    <div class="screw-inner"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
	/* ===== PIXEL ART FOUNDATION ===== */
	* {
		image-rendering: pixelated;
	}

	/* ===== ARCADE CABINET OUTER SHELL ===== */
	.arcade-cabinet {
		position: relative;
		display: inline-block;
		background: #7a4e2d;
		padding: 10px;
		border: 4px solid #5a3018;
		box-shadow:
			4px 4px 0 #3a1a08,
			-2px -2px 0 #a07050,
			inset 2px 2px 0 #9a6a40,
			inset -2px -2px 0 #5a3018;
		margin-top: 60px;
	}

	/* ===== CORNER SCREWS (pixel circles) ===== */
	.screw {
		position: absolute;
		width: 12px;
		height: 12px;
		background: #8a6040;
		border: 2px solid #4a2a15;
		z-index: 10;
		box-shadow:
			inset 2px 2px 0 #b08060,
			inset -2px -2px 0 #3a1a08;
	}
	.screw::after {
		content: '';
		position: absolute;
		top: 4px;
		left: 2px;
		width: 8px;
		height: 2px;
		background: #3a1a08;
	}
	.screw-tl { top: 4px; left: 4px; }
	.screw-tr { top: 4px; right: 4px; }
	.screw-bl { bottom: 4px; left: 4px; }
	.screw-br { bottom: 4px; right: 4px; }

	/* ===== CABINET BODY (DARK PANEL) ===== */
	.cabinet-body {
		background: #2c2830;
		padding: 12px 14px 10px;
		border: 3px solid #3a3340;
		box-shadow:
			inset 2px 2px 0 #1a1620,
			inset -2px -2px 0 #4a4350;
	}

	/* ===== TOP SCREW ROW ===== */
	.screw-row {
		display: flex;
		justify-content: space-between;
		padding: 0 6px;
		margin-bottom: 10px;
	}
	.screw-inner {
		width: 8px;
		height: 8px;
		background: #7a5535;
		border: 2px solid #3a1a08;
		box-shadow:
			inset 2px 2px 0 #a08060;
	}
	.screw-inner::after {
		content: '';
		display: block;
		width: 4px;
		height: 2px;
		background: #2a0a00;
		margin: 2px auto 0;
	}

	/* ===== MAIN CONTENT AREA ===== */
	.cabinet-content {
		display: flex;
		gap: 12px;
		align-items: stretch;
	}

	/* ===== LEFT SCORE HUD (INFO PANEL) ===== */
	.score-hud {
		display: flex;
		flex-direction: column;
		gap: 0;
		background: #1e1a22;
		border: 3px solid #3a3340;
		padding: 10px 12px;
		min-width: 150px;
		max-width: 160px;
		box-shadow:
			inset 2px 2px 0 #141018,
			inset -2px -2px 0 #2a2630;
	}

	.hud-section {
		padding: 8px 0;
	}

	.hud-round {
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.hud-label {
		font-size: 0.6rem;
		color: #8a7a6a;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		font-weight: bold;
		font-family: 'Courier New', monospace;
	}

	.hud-value {
		font-size: 1.1rem;
		color: #d4a574;
		font-weight: bold;
		font-family: 'Courier New', monospace;
		text-shadow: 2px 2px 0 #1a0a00;
	}

	.hud-divider {
		height: 2px;
		background: #6b4c30;
		margin: 2px 0;
		border-top: 1px solid #8a6545;
		border-bottom: 1px solid #4a2a15;
	}

	.hud-my-score {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 4px 0;
	}

	.hud-live-score {
		font-size: 1.8rem;
		color: #d4a574;
		font-weight: bold;
		font-family: 'Courier New', monospace;
		text-shadow: 2px 2px 0 #1a0a00;
		transition: all 0.15s ease-out;
		line-height: 1;
	}

	.hud-scores {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-top: 6px;
	}

	/* Bomb counter */
	.hud-bombs {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2px 0;
	}

	.hud-bomb-icons {
		display: flex;
		gap: -100px;
		margin-top: 4px;
	}

	.bomb-icon {
		width: 100px;
		height: 50px;
		image-rendering: pixelated;
		transition: opacity 0.3s;
		margin: 0 -25px;
	}

	.bomb-icon.bomb-used {
		opacity: 0.15;
		filter: grayscale(1);
	}

	.hud-score-entry {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 3px 5px;
		background: #161218;
		border: 2px solid #3a3340;
		box-shadow: inset 1px 1px 0 #0a0610;
	}

	.hud-score-entry.hud-me {
		border-color: #8a6545;
		background: #221a28;
	}

	.hud-score-entry.hud-platformer {
		background: #221018;
	}

	.hud-player-name {
		color: #a09080;
		font-size: 0.75rem;
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 80px;
		font-family: 'Courier New', monospace;
	}

	.hud-me .hud-player-name {
		color: #d4a574;
	}

	.hud-role {
		font-size: 0.65rem;
	}

	.hud-player-score {
		color: #d4a574;
		font-size: 0.9rem;
		font-weight: bold;
		font-family: 'Courier New', monospace;
		min-width: 28px;
		text-align: right;
		text-shadow: 1px 1px 0 #1a0a00;
	}

	/* ===== GAME GRID FRAME (RIGHT PANEL) ===== */
	.grid-frame {
		background: #8a6040;
		padding: 6px;
		border: 3px solid #5a3018;
		box-shadow:
			inset 2px 2px 0 #b08868,
			inset -2px -2px 0 #4a2a10,
			3px 3px 0 #3a1a08;
	}

	.grid-wrapper {
		position: relative;
		background-color: #08080a;
		border: 3px solid #2a2630;
		line-height: 0;
		box-shadow:
			inset 2px 2px 0 #000,
			inset -2px -2px 0 #1a1620;
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
		border: 1px solid rgba(255, 255, 255, 0.02);
		box-sizing: border-box;
	}

	/* Classi per i pezzi Tetris — pixel style: no border-radius, hard inset shadows */
	.empty { background-color: transparent; }
	.penalty { background-color: #3a3340; border: 2px solid #4a4350; box-shadow: inset 2px 2px 0 #4a4350, inset -2px -2px 0 #2a2330; }
	.piece-1 { background-color: #00BBCC; border: 2px solid #00EEFF; box-shadow: inset 2px 2px 0 #44FFFF, inset -2px -2px 0 #008899; }
	.piece-2 { background-color: #CCBB00; border: 2px solid #EEDD00; box-shadow: inset 2px 2px 0 #FFFF44, inset -2px -2px 0 #998800; }
	.piece-3 { background-color: #770077; border: 2px solid #AA00AA; box-shadow: inset 2px 2px 0 #CC44CC, inset -2px -2px 0 #550055; }
	.piece-4 { background-color: #00BB00; border: 2px solid #00EE00; box-shadow: inset 2px 2px 0 #44FF44, inset -2px -2px 0 #008800; }
	.piece-5 { background-color: #BB0000; border: 2px solid #EE0000; box-shadow: inset 2px 2px 0 #FF4444, inset -2px -2px 0 #880000; }
	.piece-6 { background-color: #0000BB; border: 2px solid #0000EE; box-shadow: inset 2px 2px 0 #4444FF, inset -2px -2px 0 #000088; }
	.piece-7 { background-color: #BB7700; border: 2px solid #EE9900; box-shadow: inset 2px 2px 0 #FFBB44, inset -2px -2px 0 #885500; }

	/* Stile Personaggio Platformer — pixel style */
	.character-block {
		position: absolute;
		top: 0;
		left: 0;
		width: 30px;
		height: 30px;
		background-color: #DD00DD;
		border: 2px solid #FF44FF;
		box-sizing: border-box;
		z-index: 100;
		transition: transform 0.05s linear;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			inset 2px 2px 0 #FF88FF,
			inset -2px -2px 0 #880088;
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
		border: 1px solid #aaa;
	}

	/* UI Game Over */
	.game-over-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 200;
	}

	.game-over-text {
		color: #ee3333;
		font-family: 'Courier New', monospace;
		font-size: 1.8rem;
		font-weight: bold;
		text-shadow: 3px 3px 0 #000;
		border: 4px solid #ee3333;
		padding: 10px 20px;
		background: #0a0a0a;
		box-shadow: 4px 4px 0 #880000;
	}

	/* ===== ROUND END OVERLAY ===== */
	.round-end-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.88);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 250;
		animation: roundEndFadeIn 0.3s ease-out;
	}

	@keyframes roundEndFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	@keyframes roundEndPulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.05); }
	}

	.round-end-content {
		text-align: center;
		font-family: 'Courier New', monospace;
		padding: 16px 24px;
		background: #1a1a2e;
		border: 4px solid #00EEFF;
		box-shadow:
			0 0 20px rgba(0, 238, 255, 0.3),
			inset 0 0 20px rgba(0, 238, 255, 0.05),
			6px 6px 0 #0a0a1a;
	}

	.round-end-title {
		color: #00EEFF;
		font-size: 1.4rem;
		font-weight: bold;
		text-shadow: 2px 2px 0 #005566;
		margin: 0 0 6px 0;
		animation: roundEndPulse 1.5s ease-in-out infinite;
	}

	.round-end-reason {
		color: #ff6644;
		font-size: 0.85rem;
		font-weight: bold;
		text-shadow: 1px 1px 0 #662200;
		margin: 0 0 10px 0;
	}

	.round-end-divider {
		width: 80%;
		height: 2px;
		background: linear-gradient(90deg, transparent, #00EEFF, transparent);
		margin: 8px auto;
	}

	.round-end-swap {
		color: #EEDD00;
		font-size: 0.9rem;
		font-weight: bold;
		text-shadow: 1px 1px 0 #665500;
		margin: 8px 0 4px 0;
		letter-spacing: 2px;
	}

	.round-end-role {
		color: #cccccc;
		font-size: 0.8rem;
		margin: 4px 0 10px 0;
	}

	.role-highlight {
		font-weight: bold;
		font-size: 1rem;
		padding: 2px 8px;
		border: 2px solid;
	}

	.role-highlight.platformer {
		color: #00EE00;
		border-color: #00EE00;
		text-shadow: 1px 1px 0 #005500;
		background: rgba(0, 238, 0, 0.1);
	}

	.role-highlight.tetris {
		color: #00BBCC;
		border-color: #00BBCC;
		text-shadow: 1px 1px 0 #004455;
		background: rgba(0, 187, 204, 0.1);
	}

	.round-end-next {
		color: #aaaaaa;
		font-size: 0.75rem;
		margin-top: 4px;
		letter-spacing: 1px;
	}

	/* ===== BOTTOM DETAIL BAR ===== */
	.cabinet-bottom {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-top: 10px;
		padding: 0 6px;
	}

	.vent-grille {
		display: flex;
		gap: 3px;
	}

	.vent-line {
		width: 3px;
		height: 12px;
		background: #141018;
		border: 1px solid #2a2430;
	}

	.bottom-screws {
		display: flex;
		gap: 10px;
	}
</style>