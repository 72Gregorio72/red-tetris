<script setup lang="ts">
import SinglePlayer from '../Classes/Player/SinglePlayer.vue';
</script>

<template>
	<div class="game-container">
		<SinglePlayer />
	</div>
</template>

<style scoped>
.game-container {
	display: flex;
	justify-content: center;
	align-items: flex-start;
	padding: 20px;
	min-height: 100vh;
}
</style>
