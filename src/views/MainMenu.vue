<script setup lang="ts">
import Buttons from '../Style/Buttons.vue';

</script>

<template>
	<div class="main-menu-page">	
		<div class="menu-container">
			<img src="/asset/menuHolder.png" alt="Menu Holder" class="menu-holder-image" />
			<Buttons class="menu-buttons" />
		</div>
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
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	width: 24%;
	max-width: 360px;
}

.menu-holder-image {
	display: block;
	width: 130%;
	height: auto;
}

.menu-buttons {
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
}


</style>
