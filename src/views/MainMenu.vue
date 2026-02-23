<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function startGame(path: string) {
	router.push(path);
}

</script>

<template>
	<div class="menu-container">
		<h1 class="title">RED TETRIS</h1>
		<div class="button-container">
			<button class="menu-button" @click="startGame('/game')">Play</button>
		</div>
		<div class="button-container">
			<button class="menu-button" @click="startGame('/lobby')">Multiplayer</button>
		</div>
	</div>
</template>

<style>

</style>
