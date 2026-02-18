<script setup lang="ts">
	import { ref, onMounted, onUnmounted } from 'vue';

	const row = ref(0);
	const col = ref(0);

	const maxRows = 20;
	const maxCols = 10;

	let lastTime = 0;
	let accumulatedTime = 0;

	const fallSpeed = 1000;

	let requestId: number;

	const update = (time = 0) => {
		accumulatedTime += time - lastTime;
		lastTime = time;
		if (accumulatedTime >= fallSpeed) {
			if (row.value < maxRows) 
				row.value += 1;
			accumulatedTime = 0;
		}
		requestAnimationFrame(update);
	}

	onMounted(() => {
		requestId = requestAnimationFrame(update);
	});

	onUnmounted(() => {
		cancelAnimationFrame(requestId);
	});

</script>

<template>
	<div class="game-container">
		<div class="grid">
			<div
				class="block"
				:style="{
					gridRow: row,
					gridColumn: col
				}"
			>
				<img src="../../../public/favicon.ico" alt="">
			</div>
		</div>
	</div>

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
    /* 10 colonne, 20 righe di 30px l'una */
    grid-template-columns: repeat(10, 30px);
    grid-template-rows: repeat(20, 30px);
    background-color: #000;
    border: 2px solid #555;
    position: relative;
}

.block {
    width: 30px;
    height: 30px;
    background-color: red; /* Colore del pezzo */
    display: flex;
    align-items: center;
    justify-content: center;
}

.block img {
    width: 80%;
    height: 80%;
}
</style>