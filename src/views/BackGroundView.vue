<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const GRID_SIZE = 24;
const GRID_COLS = Math.floor(window.innerWidth / GRID_SIZE);
const GRID_ROWS = Math.floor(window.innerHeight / GRID_SIZE);

const TETROMINOS = [
  // I
  { color: '#00f0f0', shape: [[1,1,1,1]] },
  // O
  { color: '#f0f000', shape: [[1,1],[1,1]] },
  // T
  { color: '#a000f0', shape: [[0,1,0],[1,1,1]] },
  // L
  { color: '#f0a000', shape: [[1,0],[1,0],[1,1]] },
  // J
  { color: '#0000f0', shape: [[0,1],[0,1],[1,1]] },
  // S
  { color: '#00f000', shape: [[0,1,1],[1,1,0]] },
  // Z
  { color: '#f00000', shape: [[1,1,0],[0,1,1]] },
];

interface Block {
  type: number; // indice in TETROMINOS
  x: number; // colonna
  y: number; // riga
}

const blocks = ref<Block[]>([]);
let intervalId: number | undefined;

function spawnBlock() {
  const type = Math.floor(Math.random() * TETROMINOS.length);
  const shape = TETROMINOS[type].shape;
  const width = shape[0].length;
  const x = Math.floor(Math.random() * (GRID_COLS - width));
  blocks.value.push({ type, x, y: 0 });
}

function moveBlocksDown() {
  for (const block of blocks.value) {
    block.y += 1;
  }
  blocks.value = blocks.value.filter(block => {
    const shape = TETROMINOS[block.type].shape;
    return block.y < GRID_ROWS - shape.length + 1;
  });
}

function moveBlocksRandomly() {
  for (const block of blocks.value) {
	const move = Math.random();
	if (move < 0.1 && block.x > 0) {
	  block.x -= 1; // sposta a sinistra
	} else if (move > 0.9 && block.x < GRID_COLS - TETROMINOS[block.type].shape[0].length) {
	  block.x += 1; // sposta a destra
	}
  }
}

function rotateBlocksRandomly() {
  for (const block of blocks.value) {
	if (Math.random() < 0.05) {
	  const shape = TETROMINOS[block.type].shape;
	  const rotatedShape = shape[0].map((_, i) => shape.map(row => row[i]).reverse());
	  TETROMINOS[block.type].shape = rotatedShape;
	}
  }
}

onMounted(() => {
  spawnBlock();
  intervalId = window.setInterval(() => {
    moveBlocksDown();
	moveBlocksRandomly();
	rotateBlocksRandomly();
    if (Math.random() < 0.25 || blocks.value.length === 0) {
      spawnBlock();
    }
  }, 200);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div class="tetris-bg">
    <div class="grid-pattern"></div>
    <div class="falling-blocks">
      <template v-for="(block, idx) in blocks" :key="idx">
        <template v-for="(row, dy) in TETROMINOS[block.type].shape" :key="dy">
          <template v-for="(cell, dx) in row" :key="dx">
            <div
              v-if="cell"
              class="tetris-block"
              :class="'piece-' + (block.type + 1)"
              :style="{
                left: (block.x + dx) * GRID_SIZE + 'px',
                top: (block.y + dy) * GRID_SIZE + 'px'
              }"
            ></div>
          </template>
        </template>
      </template>
    </div>
    <div class="bg-content">
      <slot />
    </div>
  </div>
</template>

<style scoped>


.tetris-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: #0a0a12;
  overflow: hidden;
  z-index: -1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.falling-blocks {
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 2;
}

.tetris-block {
  position: absolute;
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  opacity: 0.3;
  transition: none;
}

.piece-1 { background-color: #00BBCC; border: 2px solid #00EEFF; box-shadow: inset 2px 2px 0 #44FFFF, inset -2px -2px 0 #008899; }
.piece-2 { background-color: #CCBB00; border: 2px solid #EEDD00; box-shadow: inset 2px 2px 0 #FFFF44, inset -2px -2px 0 #998800; }
.piece-3 { background-color: #770077; border: 2px solid #AA00AA; box-shadow: inset 2px 2px 0 #CC44CC, inset -2px -2px 0 #550055; }
.piece-4 { background-color: #00BB00; border: 2px solid #00EE00; box-shadow: inset 2px 2px 0 #44FF44, inset -2px -2px 0 #008800; }
.piece-5 { background-color: #BB0000; border: 2px solid #EE0000; box-shadow: inset 2px 2px 0 #FF4444, inset -2px -2px 0 #880000; }
.piece-6 { background-color: #0000BB; border: 2px solid #0000EE; box-shadow: inset 2px 2px 0 #4444FF, inset -2px -2px 0 #000088; }
.piece-7 { background-color: #BB7700; border: 2px solid #EE9900; box-shadow: inset 2px 2px 0 #FFBB44, inset -2px -2px 0 #885500; }

.grid-pattern {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 24px 24px;
  pointer-events: none;
  z-index: 1;
}

.bg-content {
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}
</style>