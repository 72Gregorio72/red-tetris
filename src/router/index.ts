import { createRouter, createWebHistory } from 'vue-router'
import MainMenu from '../views/MainMenu.vue'
import GameView from '../views/GameView.vue'
import LobbyView from '../views/LobbyView.vue';
import MultiplayerView from '../views/MultiplayerView.vue';
// per aggiungere pagina metti import del component e aggiungi il resto dentro al routes: qua sotto
// poi metti bottono che chiama funzione con dentro il push del path sul router

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
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
      path: '/lobby',
      name: 'lobby',
      component: LobbyView,
    },
	{
		path: '/multiplayer',
		name: 'multiplayer',
		component: MultiplayerView,
	},
  ],
})

export default router
