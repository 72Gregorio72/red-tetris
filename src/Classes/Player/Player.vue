<!-- 2) fare punteggio -->

<script setup lang="ts">
	import { ref , watch } from 'vue';
	import Grid from '../GameContainer/Grid.vue';

	const playerName = ref('Player 1');
	const score = ref(0);
	const level = ref(1);

	const linesCleared = ref(0);

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

</script>

<template>
	<Grid
		:currentLevel="level"
		@clearedLines="(payload) => { calculateScore(payload); linesCleared = payload.linesCleared }"
	/>
	<div class="player-info">
		<h2> PlayerName : {{ playerName }} </h2>
		<h3> Score : {{ score }} </h3>
		<h3> Level : {{ level }} </h3>
	
	</div>
</template>