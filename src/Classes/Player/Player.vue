<!-- 2) fare punteggio -->

<script setup lang="ts">
	import { ref , watch } from 'vue';

	const playerName = ref('Player 1');
	const score = ref(0);
	const level = ref(1);

	const props = defineProps<{
		linesCleared: number;
		pointsScored: number;
		changeScore: number;
	}>();


	const emit = defineEmits<{
		(event : 'levelUpdated', payload : { currentLevel: number } ) : void
	}>();

	function updateLevel() {
		const temp = Math.floor(props.linesCleared / 10) + 1;
		if (temp <= 10) {
			level.value = temp;
			emit('levelUpdated', {currentLevel: level.value})
		}
	}

	function updateScore() {
		console.log("score prima = ", score.value);
		score.value = score.value + (props.pointsScored * level.value);
		console.log("score dopo = ", score.value);
	}

	watch(
		() => props.linesCleared,
		() => {
			updateLevel();
		}
	);

	watch(
		() => props.changeScore,
		() => {
			updateScore();
		}
	);

</script>

<template>
	<div class="player-info">
		<h2> PlayerName : {{ playerName }} </h2>
		<h3> Score : {{ score }} </h3>
		<h3> Level : {{ level }} </h3>
	</div>
</template>