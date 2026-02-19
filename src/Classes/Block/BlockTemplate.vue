<script setup lang="ts">
	import { ref, onMounted, onUnmounted } from 'vue';

	const row = ref(1);
	const col = ref(5);

	const props = defineProps<{
		maxRows: number;
		maxCols: number;
		blocks: { row: number; col: number }[];
	}>();

	const shapeOffsets = [
		{ r: 0, c: 0 },
		{ r: 1, c: 0 },
		{ r: 1, c: 1 }
	];

	function getCells(baseRow: number, baseCol: number) {
		return shapeOffsets.map(offset => ({
			row: baseRow + offset.r,
			col: baseCol + offset.c
		}));
	}

	function checkPosition(newRow: number, newCol: number) {
		if (newRow < 1 || newRow > props.maxRows) return false;
		if (newCol < 1 || newCol > props.maxCols) return false;
		if (props.blocks.some(b => b.row === newRow && b.col === newCol)) return false;
		return true;
	}

	function canPlace(baseRow: number, baseCol: number) {
		return getCells(baseRow, baseCol).every(cell => checkPosition(cell.row, cell.col));
	}

	const controllsOff = ref(false);
	const fallSpeed = ref(1000);
	const moveSpeed = ref(100);

	const emit = defineEmits<{
		( event: 'landed', payload: { row: number; col: number} ): void;
	}>();

	const isMovingLeft = ref(false);
	const isMovingRight = ref(false);
	const isMovingDown = ref(false);

	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'ArrowLeft' && !controllsOff.value) isMovingLeft.value = true;
		else if (event.key === 'ArrowRight' && !controllsOff.value) isMovingRight.value = true;
		if (event.key === 'ArrowDown' && !controllsOff.value) isMovingDown.value = true;

		if ((event.code === 'Space' || event.key === ' ') && !controllsOff.value) {
			fallSpeed.value = 10;
			controllsOff.value = true;
		}
	};

	const handleKeyUp = (event: KeyboardEvent) => {
		if (event.key === 'ArrowLeft') isMovingLeft.value = false;
		if (event.key === 'ArrowRight') isMovingRight.value = false;
		if (event.key === 'ArrowDown') isMovingDown.value = false;
	};

	const isLanded = ref(false);

	let lastTime = 0;
	let accumulatedTime = 0;
	let lastMoveTime = 0;
	let accumulatedMoveTime = 0;
	let requestId: number;

	const update = (time = 0) => {
		accumulatedTime += time - lastTime;
		lastTime = time;
		accumulatedMoveTime += time - lastMoveTime;
		lastMoveTime = time;

		if (accumulatedTime >= fallSpeed.value) {
			if (canPlace(row.value + 1, col.value)) {
				row.value += 1;
			} else if (!isLanded.value) {
				for (const cell of getCells(row.value, col.value)) {
					emit('landed', { row: cell.row, col: cell.col });
				}
				isLanded.value = true;
				controllsOff.value = true;
			}
			accumulatedTime = 0;
		}

		if (accumulatedMoveTime >= moveSpeed.value) {
			if (!isLanded.value && !controllsOff.value) {
				if (isMovingLeft.value && canPlace(row.value, col.value - 1)) {
					col.value -= 1;
				}
				if (isMovingRight.value && canPlace(row.value, col.value + 1)) {
					col.value += 1;
				}
				if (isMovingDown.value && canPlace(row.value + 1, col.value)) {
					row.value += 1;
				}
			}
			accumulatedMoveTime = 0;
		}

		requestAnimationFrame(update);
	}

	onMounted(() => {
		requestId = requestAnimationFrame(update);
		window.addEventListener('keydown', handleKeyPress);
		window.addEventListener('keyup', handleKeyUp);
	});

	onUnmounted(() => {
		cancelAnimationFrame(requestId);
		window.removeEventListener('keydown', handleKeyPress);
		window.removeEventListener('keyup', handleKeyUp);
	});

</script>

<template>
	<div
		v-for="(cell, index) in getCells(row, col)"
		:key="index"
		class="block"
		:style="{
			gridRow: cell.row,
			gridColumn: cell.col
		}"
	>
		<img src="../../../public/favicon.ico" alt="">
	</div>
</template>

<style scoped>
.block {
    width: 30px;
    height: 30px;
    background-color: red;
    display: flex;
    align-items: center;
    justify-content: center;
}

.block img {
    width: 80%;
    height: 80%;
}
</style>