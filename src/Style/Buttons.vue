<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

function startGame(path: string) {
	router.push(path);
}

</script>

<template>
	<div class="button-container">
		<button class="play-button" @click="startGame('/game')">
			<img src="../../public/asset/play_button.png" alt="gioca" class="button-image"/>
		</button>
	</div>
</template>

<style scoped>

.button-container {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	transform: translateY(0px);
}

.play-button {
	display:flex;
	background: none;
	border: none;
	cursor: pointer;
	width: 250px;
}

.button-image {
	display: flex;
	width: 100%;
}

.play-button:hover {
    transform: scale(1.05);
}

.play-button:active {
    transform: scale(0.95);
}


</style>