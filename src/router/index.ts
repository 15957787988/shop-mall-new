import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/home/Home.vue'),
  },
  {
    path: '/login',
    redirect: '/',
  },
  {
    path: '/space',
    name: 'Space',
    component: () => import('@/pages/space/Space.vue'),
  },
  {
    path: '/team',
    name: 'Team',
    component: () => import('@/pages/team/Team.vue'),
  },
  {
    path: '/agent-lib',
    name: 'AgentLib',
    component: () => import('@/pages/agent-lib/AgentLib.vue'),
  },
  {
    path: '/recent',
    name: 'Recent',
    component: () => import('@/pages/recent/Recent.vue'),
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/search/Search.vue'),
  },
  {
    path: '/tools',
    name: 'Tools',
    component: () => import('@/pages/tools/Tools.vue'),
  },
  {
    path: '/tools/ai-product-image',
    name: 'AiProductImage',
    component: () => import('@/pages/tools/AiProductImage/index.vue'),
  },
  {
    path: '/tools/viral-videos',
    name: 'ViralVideos',
    component: () => import('@/pages/tools/ViralVideos/index.vue'),
  },
  {
    path: '/tools/try-on',
    name: 'TryOn',
    component: () => import('@/pages/tools/TryOn/index.vue'),
  },
  {
    path: '/tools/t7',
    redirect: '/tools/t8',
  },
  {
    path: '/tools/:id',
    name: 'ToolDetail',
    component: () => import('@/pages/tools/ToolDetail.vue'),
  },
  {
    path: '/templates',
    name: 'Templates',
    component: () => import('@/pages/templates/Templates.vue'),
  },
  {
    path: '/templates/:id',
    name: 'TemplateDetail',
    component: () => import('@/pages/templates/TemplateDetail.vue'),
  },
  {
    path: '/workspace',
    name: 'Workspace',
    component: () => import('@/pages/workspace/Workspace.vue'),
  },
  {
    path: '/pricing',
    name: 'Pricing',
    component: () => import('@/pages/pricing/Pricing.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
