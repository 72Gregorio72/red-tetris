<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

	onMounted(() => {

	})

	onUnmounted(() => {

	})

</script>

<template>
	<div class="tetris-bg">
		<div class="grid-pattern"></div>

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
}

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
  width: 100%;
  height: 100%;
}
</style>