import { createRouter, createWebHistory } from 'vue-router';
import LobbyView from '../views/LobbyView.vue';
import SinglePlayer from '../Classes/Player/SinglePlayer.vue';
import GameView from '../views/GameView.vue';
import MultiplayerView from '../views/MultiplayerView.vue';
import GameUrlView from '../views/GameUrlView.vue';
import MainMenu from '@/views/MainMenu.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: MainMenu,
  },
  {
    path: '/game',
    name: 'game',
    component: GameView,
  },
  {
    path: '/multiplayer',
    name: 'multiplayer',
    component: MultiplayerView,
  },
  {
	path: '/lobby',
	name: 'lobby',
	component: LobbyView,
  },
  {
    path: '/:room/:playerName',
    name: 'game-url',
    component: GameUrlView,
    props: true,
  },
];


const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router
