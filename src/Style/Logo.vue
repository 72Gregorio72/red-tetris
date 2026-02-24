<script setup lang="ts">
import { ref, onMounted } from 'vue';

const visible = ref<boolean>(false);

onMounted(() => {
	setTimeout(() => {
		visible.value = true;
	}, 100);
});

</script>

<template>
	<div :class="['title-container', { 'title-visible': visible }]">
		<img src="../../public/asset/logo.png" alt="Red Tetris" class="title-image"/>
	</div>
</template>

<style scoped>

.title-container {
	display: flex;
	justify-content: center;
	align-items: center;
	opacity: 0;
	transform: translateY(-200px);
	transition:opacity 4s steps(10), transform 4s steps(10)
}

.title-container.title-visible {
	opacity: 1;
	transform: translateY(0);
}

.title-image {
	width: 500px;
	height: auto;
}

</style>