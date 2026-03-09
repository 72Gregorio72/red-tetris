<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ref } from 'vue';

const pressedButton = ref< 'play' | 'multi' | null >(null); 
const router = useRouter();
const sfxbutton = new Audio('/asset/music/buttonClick_SFX.wav') 

sfxbutton.volume = 0.5;

function startGame(path: string, button: 'play' | 'multi') {
	if (pressedButton.value) return;
	pressedButton.value = button;
	sfxbutton.currentTime = 0;
	sfxbutton.play().catch(() => {});

	setTimeout(() => {
		router.push(path);
	}, 200);
}

</script>
<!-- FARE BOTTONE LOG SU FILE GIUSTO IMMAGINE GIA FATTE E METTERE IL COLORE DEL TESTO GIALLINO A TEMA -->
<template>
	<div class="button-container">
		<button class="play-button" @click="startGame('/game', 'play')">
			<img :src="pressedButton === 'play'
                    ? '/asset/playButton/PlayButtonPressed.png'
                    : '/asset/playButton/PlayButton.png'"
					alt="play" class="play-image"/>
		</button>
		<button class="multi-button" @click="startGame('/lobby', 'multi')">
			<img :src="pressedButton === 'multi'
                    ? '/asset/multi-playerButton/multiButtonPressed.png'
                    : '/asset/multi-playerButton/multiButton.png'
					" alt="multiplayer" class="multiplayer-image"/>
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
}

.play-button, 
.multi-button {
    display: flex;
    background: none;
    border: none;
    cursor: pointer;
    width: 250px;
}

.play-button {
	padding-top: 30%;
	margin-bottom: 30px;
}

.play-image,
.multiplayer-image {
    display: flex;
    width: 100%;
    height: auto;
}

.multi-button:hover .multiplayer-image {
	opacity: 0.8;
}

.play-button:hover .play-image {
	opacity: 0.8;
}

</style>