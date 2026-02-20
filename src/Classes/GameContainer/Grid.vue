<script setup lang="ts">
	import { ref } from 'vue';
	import BlockTemplate from '../Block/BlockTemplate.vue';
	import Player from '../Player/Player.vue';

	const blocks = ref<{ row: number; col: number }[]>([]);
	const activeBlockId = ref(0);

	const linesCleared = ref(0);
	const currentLevel = ref(1);
	const pointsScored = ref(0);
	const changeScore = ref(0);

	function handleLanded(payload: { row: number; col: number }[]) {
		for (const cell of payload) {
			blocks.value.push({ row: cell.row, col: cell.col });
		}
		checkLineClear();
	}

	function spawnNew() {
		activeBlockId.value++;
	}

	const LlBlockMatrix = [
		[1, 0, 0],
		[1, 2, 1],
		[0, 0, 0],
	];

	const LrBlockMatrix = [
		[0, 0, 1],
		[1, 2, 1],
		[0, 0, 0],
	];

	const StraightBlockMatrix = [
		[0, 0, 0, 0],
		[1, 2, 1, 1],
		[0, 0, 0, 0],
		[0, 0, 0, 0],
	];

	const CubeBlockMatrix = [
		[1, 1],
		[1, 1],
	];

	const StairLBlockMatrix = [
		[0, 1, 1],
		[1, 2, 0],
		[0, 0, 0],
	];

	const StairRBlockMatrix = [
		[1, 1, 0],
		[0, 2, 1],
		[0, 0, 0],
	];

	const TBlockMatrix = [
		[0, 1, 0],
		[1, 2, 1],
		[0, 0, 0],
	];

	const blockTypes = [LlBlockMatrix, LrBlockMatrix, StraightBlockMatrix, CubeBlockMatrix, StairLBlockMatrix, StairRBlockMatrix, TBlockMatrix];

	const gameOver = ref(false);

	function getRandomNumber(min: number, max: number) {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function checkLineClear() {
		let linesRemoved = 0;
		for (let r = 1; r <= 20; r++) {
			const isLineFull = blocks.value.filter(b => b.row === r).length === 10;
			console.log(blocks.value.filter(b => b.row === r).length === 10);
			if (isLineFull) {
				linesRemoved++;
				console.log("blocks removed");
				blocks.value = blocks.value.filter(b => b.row !== r);
				blocks.value.forEach(b => {
					if (b.row < r) b.row++;
				});
				linesCleared.value++;
				r--; // ricontrolla la stessa riga, perché quelle sopra sono scese
			}
		}
		console.log("linee cancellate = ", linesRemoved)
		if (linesRemoved !== 0)
			calculateScore(linesRemoved);

		if (checkGameOver() && !gameOver.value) {
			alert("Game Over!");
			gameOver.value = true;
		}
	}
	
	function calculateScore(linesRemoved: number) {
		switch (linesRemoved) {
			case 1:
				pointsScored.value = 40;
				break;
			case 2:
				pointsScored.value = 120;
				break;
			case 3:
				pointsScored.value = 300;
				break;
			case 4:
				pointsScored.value = 1200;
				break;
			default:
				break;
		}
		changeScore.value++;
	}

	function checkGameOver() {
		return blocks.value.some(b => b.row === 1);
	}
</script>

<template>
	<div class="game-container">
		<div class="grid">
			<BlockTemplate
				v-if="!gameOver"
				:key="activeBlockId"
				:maxRows="20"
				:maxCols="10"
				:blocks="blocks"
				:blockMatrix="blockTypes[getRandomNumber(0, blockTypes.length - 1)]!"
				:currentLevel="currentLevel"
				@landed="(payload) => { handleLanded(payload); spawnNew(); }"
			/>
			<h1 v-if="gameOver">Game Over!</h1>
			<div
				v-for="(block, index) in blocks"
				:key="index"
				class="block landed"
				:style="{ gridRow: block.row, gridColumn: block.col }"
			></div>
		</div>
	</div>
	<Player 
		:linesCleared="linesCleared"
		:pointsScored="pointsScored"
		:changeScore="changeScore"
		@levelUpdated="(payload) => { currentLevel = payload.currentLevel }"
	/>

</template>

<style scoped>
	.game-container {
		display: flex;
		justify-content: center;
		background-color: #222;
		padding: 20px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(10, 30px);
		grid-template-rows: repeat(20, 30px);
		background-color: #000;
		border: 2px solid #555;
		position: relative;
	}

	.block.landed {
		width: 30px;
		height: 30px;
		background-color: red;
		display: flex;
		align-items: center;
		justify-content: center;
		border: 1px solid white;
		border-radius: 6px;
	}
</style>