<!-- 1)fare i livelli -->
 <!-- 2) fare punteggio -->
<!-- 3) calcolare numero di spazi che percorre il blocco con soft e hard drop cosi da molt il punteggio corrente -->


<script setup lang="ts">
	import { ref , watch , defineEmits } from 'vue';

	const playerName = ref('Player 1');
	const score = ref(0);
	const level = ref(1);

	const props = defineProps<{
		linesCleared: number
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

	watch(
		() => props.linesCleared,
		() => {
			updateLevel();
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