import { createRouter, createWebHistory } from 'vue-router'
import MainMenu from '../views/MainMenu.vue'
import GameView from '../views/GameView.vue'

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
  ],
})

export default router
