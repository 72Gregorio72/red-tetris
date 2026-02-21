<!-- 2) fare punteggio -->

<script setup lang="ts">
	import { onMounted, ref , watch , onUnmounted } from 'vue';
	import Grid from '../GameContainer/Grid.vue';

	const playerName = ref('Player 1');
	const score = ref(0);
	const level = ref(1);

	const linesCleared = ref(0);

	const isMovingLeft = ref(false);
	const isMovingRight = ref(false);
	const isMovingDown = ref(false);
	const isRotate = ref(false);
	const isHardDrop = ref(false);

	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'ArrowLeft')
			isMovingLeft.value = true;
		else if (event.key === 'ArrowRight')
			isMovingRight.value = true;
		if (event.key === 'ArrowDown')
			isMovingDown.value = true;
		if (event.code === 'ArrowUp')
			isRotate.value = true;
		if (event.code === 'Space' || event.key === ' ')
			isHardDrop.value = true;
	}

	const handleKeyUp = (event: KeyboardEvent) => {
		if (event.key === 'ArrowLeft') isMovingLeft.value = false;
		if (event.key === 'ArrowRight') isMovingRight.value = false;
		if (event.key === 'ArrowDown') isMovingDown.value = false;
		if (event.key === 'ArrowUp') isRotate.value = false;
		if (event.code === 'Space' || event.key === ' ') isHardDrop.value = false;
	};

	function updateLevel() {
		const temp = Math.floor(linesCleared.value / 10) + 1;
		if (temp <= 10) {
			level.value = temp;
		}
	}

	function updateScore(pointsScored: number) {
		score.value = score.value + (pointsScored * level.value);
	}

	function calculateScore(payload: { linesCleared: number; linesRemoved: number }) {
		let pointsScored = 0;
		switch (payload.linesRemoved) {
			case 1:
				pointsScored += 40;
				updateScore(pointsScored);
				break;
			case 2:
				pointsScored += 120;
				updateScore(pointsScored);
				break;
			case 3:
				pointsScored += 300;
				updateScore(pointsScored);
				break;
			case 4:
				pointsScored += 1200;
				updateScore(pointsScored);
				break;
			default:
				break;
		}
	}
	
	watch(
		() => linesCleared.value,
		() => {
			updateLevel();
		}
	);
	
	onMounted(() => {
		window.addEventListener('keydown', handleKeyPress);
		window.addEventListener('keyup', handleKeyUp);
	});

	onUnmounted(() => {
		window.removeEventListener('keydown', handleKeyPress);
		window.removeEventListener('keyup', handleKeyUp);
	});

</script>

<template>
	<Grid
		:currentLevel="level"
		:isMovingLeft ="isMovingLeft"
		:isMovingRight ="isMovingRight"
		:isMovingDown ="isMovingDown"
		:isRotate ="isRotate"
		:isHardDrop ="isHardDrop"
		@clearedLines="(payload) => { calculateScore(payload); linesCleared = payload.linesCleared }"
	/>
	<div class="player-info">
		<h2> PlayerName : {{ playerName }} </h2>
		<h3> Score : {{ score }} </h3>
		<h3> Level : {{ level }} </h3>
	
	</div>
</template>