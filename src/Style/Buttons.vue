<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const buttonIsVisible = ref(false);
const router = useRouter();

function startGame(path: string) {
	router.push(path);
}

onMounted(() => {
	setTimeout(() => {
		buttonIsVisible.value = true;
	}, 1000);
});

</script>

<template>
	<div :class="['button-container', { 'button-visible': buttonIsVisible }]">
		<button class="play-button" @click="startGame('/game')">
			<img src="../../public/asset/play_button.png" alt="play" class="play-image"/>
		</button>
		<button class="multi-button" @click="startGame('/lobby')">
				<img src="../../public/asset/multiplayer_button.png" alt="multiplayer" class="multiplayer-image"/>
		</button>
	</div>
</template>

<style scoped>


.button-container {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	width: 100%;
	gap: 20px;
}


.button-container.button-visible .play-button,
.button-container.button-visible .multi-button {
	opacity: 1;
	transform: translateX(0);
}

.play-button, 
.multi-button {
    display: flex;
    background: none;
    border: none;
    cursor: pointer;
    width: 250px;
	opacity: 0;
	transform: translateX(var(--enter-x));
	transition: opacity 0.5s ease, transform 0.5s ease;
}

.play-button {
	--enter-x: -140px;
}

.multi-button {
	--enter-x: 140px;
}

.play-image,
.multiplayer-image {
    display: flex;
    width: 100%;
    height: auto;
	transition: transform 0.15s ease;
}

.play-button:hover .play-image,
.multi-button:hover .multiplayer-image {
	transform: scale(1.05);
}

.play-button:active .play-image,
.multi-button:active .multiplayer-image {
	transform: scale(0.95);
}

</style>