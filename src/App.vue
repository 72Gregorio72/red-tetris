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

<style scoped>

</style>
