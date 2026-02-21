<script setup lang="ts">
import { useRouter } from 'vue-router';

const router = useRouter();

function startGame() {
	router.push('/game');
}

</script>

<template>
	<div class="menu-container">
		<h1 class="title">RED TETRIS</h1>
		<div class="button-container">
			<button class="menu-button" @click="startGame">Play</button>
		</div>
	</div>
</template>

<style>

.title {
	padding-left: 45%;
	transition: cubic-bezier();
}

.button-container{
	padding-left: 50%;
}
</style>
