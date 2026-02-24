<script setup lang="ts">
import { useRouter } from 'vue-router';
import Logo from '@/Style/Logo.vue';
import Buttons from '../Style/Buttons.vue';

</script>

<template>
	<Logo />
	<Buttons />
	<div class="menu-container">
		<!-- <h1 class="title">RED TETRIS</h1> -->
	</div>
</template>

<style scoped>

.menu-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 100%;
	height: 100%;
}


</style>
