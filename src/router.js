import { createRouter, createWebHistory } from 'vue-router'

import Home from './pages/Home/index.vue'

const routes = [
  {
    path: '/',
    component: Home
  },
  {
    path: '/editor',
    component: () => import('./pages/Editor/index.vue')
  }
]

const router = createRouter({
  history: createWebHistory('/'),
  routes
})

export default router
