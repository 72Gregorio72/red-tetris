<script setup lang="ts">
import BackGroundView from './views/BackGroundView.vue';

</script>

<!-- in questo modo App.vue viene usato per fare il display di solo quello che dice il path del router -->
 <!-- se si vuole aggiungere qualcosa che viene sempre visualizzato va messo qua -->
<template>
  <back-ground-view>
    <router-view />
  </back-ground-view>
</template>

<style>

@font-face {
  font-family: 'PixelFont';
  src: url('/asset/font/lower-pixel.regular.otf') format('opentype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

*, *::before, *::after {
  font-family: 'PixelFont', sans-serif;
}

</style>
