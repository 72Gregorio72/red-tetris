<script setup lang="ts">
    import { ref, onMounted, onUnmounted, watch } from 'vue';
	import { useMultiplayerStore } from '../../stores/multiplayer';

    const row = ref(1);
    const col = ref(5);

	const multiplayerStore = useMultiplayerStore();

    const controllsOff = ref(false);
    const moveSpeed = ref(100);

    const props = defineProps<{
        maxRows: number;
        maxCols: number;
        blocks: { row: number; col: number }[];
        blockMatrix: number[][];
        currentLevel: number;
        isMovingLeft: boolean;
        isMovingRight: boolean;
        isMovingDown: boolean;
        isRotate: boolean;
        isHardDrop: boolean;
    }>();

    const shapeOffsets = ref(
        props.blockMatrix.flatMap((rowArr, r) =>
            rowArr.map((cell, c) => (cell === 1 || cell === 2) ? { r, c } : null).filter(offset => offset !== null)
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
        (event: 'landed', payload: { row: number; col: number }[]): void;
        (event: 'moved', payload: { row: number; col: number }[]): void;
    }>();

    function sendPosition() {
        emit('moved', getCells(row.value, col.value));
    }

    function rotateBlock() {
        if (controllsOff.value) return;

        const pivot = shapeOffsets.value.find((_, i) => {
            const offset = shapeOffsets.value[i];
            if (!offset) return false;
            const matrixRow = props.blockMatrix[offset.r];
            return matrixRow && matrixRow[offset.c] === 2;
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
        } else if (checkPosition(row.value, col.value - 1) && rotatedOffsets.every(offset =>
            checkPosition(row.value + offset.r, col.value - 1 + offset.c)
        )) {
            col.value -= 1;
            shapeOffsets.value = rotatedOffsets;
        } else if (checkPosition(row.value, col.value + 1) && rotatedOffsets.every(offset =>
            checkPosition(row.value + offset.r, col.value + 1 + offset.c)
        )) {
            col.value += 1;
            shapeOffsets.value = rotatedOffsets;
        } else {
            return;
        }
        sendPosition();
    }

    function activateHardDrop() {
        if (controllsOff.value) return;
        fallSpeed.value = 1;
        controllsOff.value = true;
    }

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

        let moved = false;

        if (accumulatedTime >= fallSpeed.value) {
            if (canPlace(row.value + 1, col.value)) {
                row.value += 1;
                moved = true;
            } else if (!isLanded.value) {
                emit('landed', getCells(row.value, col.value));
                isLanded.value = true;
                controllsOff.value = true;
                sendPosition();
            }
            accumulatedTime = 0;
        }

        if (accumulatedMoveTime >= moveSpeed.value) {
            if (!isLanded.value && !controllsOff.value) {
                if (props.isMovingLeft && canPlace(row.value, col.value - 1)) {
                    col.value -= 1;
                    moved = true;
                }
                if (props.isMovingRight && canPlace(row.value, col.value + 1)) {
                    col.value += 1;
                    moved = true;
                }
                if (props.isMovingDown && canPlace(row.value + 1, col.value)) {
                    row.value += 1;
                    moved = true;
                }
                accumulatedMoveTime = 0;
            }
        }

        if (moved) {
            sendPosition();
        }

        requestId = requestAnimationFrame(update);
    };

    function updateGravity() {
        fallSpeed.value = calcFallSpeed(props.currentLevel);
    }

    watch(
        () => props.isRotate,
        (newValue, oldValue) => {
            if (newValue && !oldValue) {
                rotateBlock();
            }
        }
    );

    watch(
        () => props.isHardDrop,
        (newValue, oldValue) => {
            if (newValue && !oldValue) {
                activateHardDrop();
            }
        }
    );

    watch(
        () => props.currentLevel,
        () => {
            updateGravity();
        },
    );

    onMounted(() => {
        requestId = requestAnimationFrame(update);
        sendPosition(); // Invia posizione iniziale
    });

    onUnmounted(() => {
        cancelAnimationFrame(requestId);
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
</style>