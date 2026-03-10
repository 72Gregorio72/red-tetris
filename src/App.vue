<script setup lang="ts">
import BackGroundView from './views/BackGroundView.vue';
import { onMounted, onUnmounted } from 'vue';

const bgMusic1 = new Audio('/asset/music/Chiptronical.ogg');
const bgMusic2 = new Audio('/asset/music/Chiptronical.ogg');
const volume = 0.3;
const fadeTime = 0.2;

bgMusic1.volume = volume;
bgMusic2.volume = 0;

let currentTimeupdateHandler: (() => void) | null = null;
let currentEndedHandler: (() => void) | null = null;
let activeTrack: HTMLAudioElement | null = null;

function setupCrossfade(current: HTMLAudioElement, next: HTMLAudioElement) {
  if (activeTrack && currentTimeupdateHandler) {
    activeTrack.removeEventListener('timeupdate', currentTimeupdateHandler);
  }
  if (activeTrack && currentEndedHandler) {
    activeTrack.removeEventListener('ended', currentEndedHandler);
  }

  activeTrack = current;

  currentTimeupdateHandler = () => {
    const timeLeft = current.duration - current.currentTime;
    if (timeLeft <= fadeTime && next.paused) {
      next.currentTime = 0;
      next.volume = 0;
      next.play().catch(() => {});
    }
    if (timeLeft <= fadeTime) {
      const progress = 1 - (timeLeft / fadeTime);
      current.volume = volume * (1 - progress);
      next.volume = volume * progress;
    }
  };

  currentEndedHandler = () => {
    current.volume = 0;
    current.pause();
    setupCrossfade(next, current);
  };

  current.addEventListener('timeupdate', currentTimeupdateHandler);
  current.addEventListener('ended', currentEndedHandler);
}

setupCrossfade(bgMusic1, bgMusic2);

function startMusic() {
  bgMusic1.play().then(() => {
    document.removeEventListener('click', startMusic);
    document.removeEventListener('keydown', startMusic);
  }).catch(() => {});
}

onMounted(() => {
  document.addEventListener('click', startMusic);
  document.addEventListener('keydown', startMusic);
});

onUnmounted(() => {
  document.removeEventListener('click', startMusic);
  document.removeEventListener('keydown', startMusic);
  bgMusic1.pause();
  bgMusic2.pause();
});
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
