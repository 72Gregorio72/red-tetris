<script setup lang="ts">
	import { ref, onMounted, onUnmounted , watch } from 'vue';

	const row = ref(1);
	const col = ref(5);

	const controllsOff = ref(false);
	const moveSpeed = ref(100);

	const isMovingLeft = ref(false);
	const isMovingRight = ref(false);
	const isMovingDown = ref(false);
	const isRotating = ref(false);

	const props = defineProps<{
		maxRows: number;
		maxCols: number;
		blocks: { row: number; col: number }[];
		blockMatrix: number[][];
		currentLevel: number;
	}>();

	const shapeOffsets = ref(
		props.blockMatrix.flatMap((row, r) =>
			row.map((cell, c) => (cell === 1 || cell === 2) ? { r, c } : null).filter(offset => offset !== null)
		) as { r: number; c: number }[]
	);

	function calcFallSpeed(level: number): number {
		const base = 0.8 - ((level - 1) * 0.007);
        const powerTo = level - 1;
        const secondsPerLine = Math.pow(base, powerTo);
		return secondsPerLine * 1000;
	}

	const fallSpeed = ref(calcFallSpeed(props.currentLevel));

	function getCells(baseRow: number, baseCol: number) {
		return shapeOffsets.value.map(offset => ({
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


	const emit = defineEmits<{
		( event: 'landed', payload: { row: number; col: number} ): void;
	}>();

	const handleKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'ArrowLeft' && !controllsOff.value) isMovingLeft.value = true;
		else if (event.key === 'ArrowRight' && !controllsOff.value) isMovingRight.value = true;
		if (event.key === 'ArrowDown' && !controllsOff.value) isMovingDown.value = true;
		if (event.key === 'ArrowUp' && !controllsOff.value){
			if (shapeOffsets.value.every(offset => {
				const row = props.blockMatrix[offset.r];
				return !row || row[offset.c] !== 2;
			})) return;
			const pivot = shapeOffsets.value.find((_, i) => {
				const offset = shapeOffsets.value[i];
				if (!offset) return false;
				const row = props.blockMatrix[offset.r];
				return row && row[offset.c] === 2;
			}) || { r: 1, c: 1 };
			const rotatedOffsets = shapeOffsets.value.map(offset => {
				const dr = offset.r - pivot.r;
				const dc = offset.c - pivot.c;

				return {
					r: pivot.r + dc,
					c: pivot.c - dr
				};
			});
			const canRotate = rotatedOffsets.every(offset => 
				checkPosition(row.value + offset.r, col.value + offset.c)
			);

			if (canRotate) {
				shapeOffsets.value = rotatedOffsets;
			}
			else if (checkPosition(row.value, col.value - 1) && rotatedOffsets.every(offset => 
				checkPosition(row.value + offset.r, col.value - 1 + offset.c)
			)) {
				col.value -= 1;
				shapeOffsets.value = rotatedOffsets;
			}
			else if (checkPosition(row.value, col.value + 1) && rotatedOffsets.every(offset => 
				checkPosition(row.value + offset.r, col.value + 1 + offset.c)
			)) {
				col.value += 1;
				shapeOffsets.value = rotatedOffsets;
			}
		}
		if ((event.code === 'Space' || event.key === ' ') && !controllsOff.value) {
			fallSpeed.value = 1;
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
				accumulatedMoveTime = 0;
			}
		}

		requestAnimationFrame(update);
	}

	function updateGravity() {
		fallSpeed.value = calcFallSpeed(props.currentLevel);
	}

	watch(
		() => props.currentLevel,
		() => {
			updateGravity();
		}
	);

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
	border: 1px solid rgb(255, 255, 255);
	border-radius: 6px;
}

.block img {
    width: 80%;
    height: 80%;
}
</style>