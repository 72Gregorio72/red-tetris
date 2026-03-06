<script setup lang="ts">
import { useRouter } from 'vue-router';
import Logo from '@/Style/Logo.vue';
import Buttons from '../Style/Buttons.vue';

</script>

<template>
	<div class="main-menu-page">
		<Buttons class="menu-container" />
	</div>
</template>

<style scoped>

.main-menu-page {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding-top: 24px;
}

.menu-container {
	background-image: url("../../public/asset/menuHolder.png");
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 24%;
	height: 55%;
	padding-bottom: 30px;
}


</style>
