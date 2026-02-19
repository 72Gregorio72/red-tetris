<script setup lang="ts">
	import { ref } from 'vue';
	import BlockTemplate from '../Block/BlockTemplate.vue';

	const blocks = ref<{ row: number; col: number }[]>([]);

	function handleLanded(payload: { row: number; col: number }) {
		blocks.value.push({ row: payload.row, col: payload.col });
	}
</script>

<template>
	<div class="game-container">
		<div class="grid">
			<BlockTemplate
				:row="1"
				:col="5"
				:maxRows="20"
				:maxCols="10"
				:blocks="blocks"
				@landed="handleLanded"
			/>
			<BlockTemplate
				v-for="(block, index) in blocks"
				:key="index"
				:row="block.row"
				:col="block.col"
				:maxRows="20"
				:maxCols="10"
				:blocks="blocks"
				@landed="handleLanded"
			/>
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
	}
</style>