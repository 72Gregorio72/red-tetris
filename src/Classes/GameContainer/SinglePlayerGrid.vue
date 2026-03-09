<script setup lang="ts">
	import { computed } from 'vue';
	import { useSingleplayerStore } from '../../stores/singleplayer';
	import type { PieceType } from '../../../server/game/PieceGenerator';

	const store = useSingleplayerStore();

	const emptyGrid = Array.from({ length: 20 }, () => Array(10).fill(0));

	const grid = computed(() => store.displayGrid || emptyGrid);
	const isAlive = computed(() => store.isAlive);
	const score = computed(() => store.score);
	const level = computed(() => store.level);
	const linesCleared = computed(() => store.linesCleared);
	const gameOver = computed(() => store.gameOver);

	// Piece shapes for preview rendering (first rotation only)
	const PREVIEW_SHAPES: Record<PieceType, [number, number][]> = {
		I: [[0,0],[0,1],[0,2],[0,3]],
		O: [[0,0],[0,1],[1,0],[1,1]],
		T: [[0,0],[0,1],[0,2],[1,1]],
		S: [[0,1],[0,2],[1,0],[1,1]],
		Z: [[0,0],[0,1],[1,1],[1,2]],
		J: [[0,0],[1,0],[2,0],[2,1]],
		L: [[0,1],[1,1],[2,0],[2,1]],
	};

	const PIECE_CODES: Record<PieceType, number> = {
		I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7,
	};

	// Build a mini grid (4x4) for each preview piece
	function buildPreviewGrid(type: PieceType): number[][] {
		const g: number[][] = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
		const cells = PREVIEW_SHAPES[type];
		const code = PIECE_CODES[type];
		cells.forEach(cell => {
			g[cell[0]]![cell[1]!] = code;
		});
		return g;
	}

	const previewGrids = computed(() => {
		return store.nextPieces.map(type => ({
			type,
			grid: buildPreviewGrid(type),
		}));
	});

	const getBlockClass = (cellValue: number) => {
		if (cellValue === 0) return 'empty';
		if (cellValue === 8) return 'penalty';
		if (cellValue === 9) return 'ghost';
		return `piece-${cellValue}`;
	};
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
                <div class="score-hud hud-visible">
                    <div class="hud-section">
                        <div class="hud-round">
                            <span class="hud-label">SCORE</span>
                            <span class="hud-value">{{ score }}</span>
                        </div>
                    </div>
                    <div class="hud-divider"></div>

                    <div class="hud-section">
                        <div class="hud-round">
                            <span class="hud-label">LEVEL</span>
                            <span class="hud-value">{{ level }}</span>
                        </div>
                    </div>
                    <div class="hud-divider"></div>

                    <div class="hud-section">
                        <div class="hud-round">
                            <span class="hud-label">LINES</span>
                            <span class="hud-value">{{ linesCleared }}</span>
                        </div>
                    </div>
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
                        </div>

                        <div v-if="gameOver" class="game-over-overlay">
                            <div class="game-over-content">
                                <h1 class="game-over-text">GAME OVER</h1>
                                <div class="game-over-stats">
                                    <p class="stat-line">SCORE: <span class="stat-value">{{ score }}</span></p>
                                    <p class="stat-line">LEVEL: <span class="stat-value">{{ level }}</span></p>
                                    <p class="stat-line">LINES: <span class="stat-value">{{ linesCleared }}</span></p>
                                </div>
                                <p class="restart-hint">PRESS ENTER TO RESTART</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Next pieces preview panel -->
                <div class="preview-panel">
                    <span class="hud-label">NEXT</span>
                    <div class="hud-divider"></div>
                    <div 
                        v-for="(preview, idx) in previewGrids" 
                        :key="'preview-' + idx"
                        class="preview-piece"
                    >
                        <div class="preview-grid">
                            <template v-for="(row, rIdx) in preview.grid" :key="'pr-' + idx + '-' + rIdx">
                                <div
                                    v-for="(cell, cIdx) in row"
                                    :key="'pc-' + idx + '-' + rIdx + '-' + cIdx"
                                    class="preview-block"
                                    :class="getBlockClass(cell)"
                                ></div>
                            </template>
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

	/* Classi per i pezzi Tetris — pixel style */
	.empty { background-color: transparent; }
	.penalty { background-color: #3a3340; border: 2px solid #4a4350; box-shadow: inset 2px 2px 0 #4a4350, inset -2px -2px 0 #2a2330; }
	.piece-1 { background-color: #00BBCC; border: 2px solid #00EEFF; box-shadow: inset 2px 2px 0 #44FFFF, inset -2px -2px 0 #008899; }
	.piece-2 { background-color: #CCBB00; border: 2px solid #EEDD00; box-shadow: inset 2px 2px 0 #FFFF44, inset -2px -2px 0 #998800; }
	.piece-3 { background-color: #770077; border: 2px solid #AA00AA; box-shadow: inset 2px 2px 0 #CC44CC, inset -2px -2px 0 #550055; }
	.piece-4 { background-color: #00BB00; border: 2px solid #00EE00; box-shadow: inset 2px 2px 0 #44FF44, inset -2px -2px 0 #008800; }
	.piece-5 { background-color: #BB0000; border: 2px solid #EE0000; box-shadow: inset 2px 2px 0 #FF4444, inset -2px -2px 0 #880000; }
	.piece-6 { background-color: #0000BB; border: 2px solid #0000EE; box-shadow: inset 2px 2px 0 #4444FF, inset -2px -2px 0 #000088; }
	.piece-7 { background-color: #BB7700; border: 2px solid #EE9900; box-shadow: inset 2px 2px 0 #FFBB44, inset -2px -2px 0 #885500; }
	.ghost {
		background-color: rgba(255, 255, 255, 0.06);
		border: 2px dashed rgba(255, 255, 255, 0.25);
		box-shadow: none;
	}

	/* UI Game Over */
	.game-over-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background: rgba(0, 0, 0, 0.85);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 200;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}

	.game-over-content {
		text-align: center;
		font-family: 'Courier New', monospace;
	}

	.game-over-text {
		color: #ee3333;
		font-size: 1.8rem;
		font-weight: bold;
		text-shadow: 3px 3px 0 #000;
		border: 4px solid #ee3333;
		padding: 10px 20px;
		background: #0a0a0a;
		box-shadow: 4px 4px 0 #880000;
		margin: 0 0 16px 0;
	}

	.game-over-stats {
		margin-bottom: 16px;
	}

	.stat-line {
		color: #aaa;
		font-size: 0.85rem;
		margin: 4px 0;
		letter-spacing: 1px;
	}

	.stat-value {
		color: #d4a574;
		font-weight: bold;
	}

	.restart-hint {
		color: #00EEFF;
		font-size: 0.75rem;
		letter-spacing: 2px;
		animation: blink 1.2s ease-in-out infinite;
	}

	@keyframes blink {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.3; }
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

	/* ===== NEXT PIECES PREVIEW PANEL ===== */
	.preview-panel {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		background: #1e1a22;
		border: 3px solid #3a3340;
		padding: 10px 12px;
		min-width: 80px;
		box-shadow:
			inset 2px 2px 0 #141018,
			inset -2px -2px 0 #2a2630;
	}

	.preview-piece {
		padding: 6px 0;
	}

	.preview-grid {
		display: grid;
		grid-template-columns: repeat(4, 16px);
		grid-template-rows: repeat(4, 16px);
		gap: 0;
	}

	.preview-block {
		width: 16px;
		height: 16px;
		border: 1px solid rgba(255, 255, 255, 0.02);
		box-sizing: border-box;
	}

	.preview-block.empty {
		background-color: transparent;
		border-color: transparent;
	}
</style>
