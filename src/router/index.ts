import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { Modal } from 'ant-design-vue'

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
    path: '/canvas/index',
    name: 'CanvasIndex',
    component: () => import('@/pages/canvas/index/index.vue'),
  },
  {
    path: '/canvas/editor',
    redirect: (to) => ({ path: '/canvas', query: to.query }),
  },
  {
    path: '/canvas',
    name: 'CanvasEditor',
    component: () => import('@/pages/canvas/editor/index.vue'),
    beforeEnter(to, _from, next) {
      if (!to.query.projectId) {
        next({ path: '/canvas/index', replace: true })
        return
      }
      next()
    },
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
    path: '/tools/video-replicate',
    alias: '/video-replicate',
    name: 'VideoReplicate',
    component: () => import('@/pages/tools/VideoReplicate/index.vue'),
  },
  {
    path: '/tools/viral-videos',
    name: 'ViralVideos',
    component: () => import('@/pages/tools/ViralVideos/index.vue'),
  },
  {
    path: '/ai/image',
    name: 'AiImage',
    component: () => import('@/pages/ai/image/ImagePage.vue'),
  },
  {
    path: '/ai/video',
    name: 'AiVideo',
    component: () => import('@/pages/ai/video/VideoPage.vue'),
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

router.onError((error, to) => {
  console.error('页面导航失败', error)
  if (!/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed/i.test(error.message)) return
  Modal.confirm({
    title: '页面资源加载失败',
    content: '可能是开发服务更新或页面版本变化。重新加载可获取最新页面；当前未提交的内容会清空。',
    okText: '重新加载目标页面',
    cancelText: '留在当前页',
    onOk: () => window.location.assign(to.fullPath),
  })
})

export default router
