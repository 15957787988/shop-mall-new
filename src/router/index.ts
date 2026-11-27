import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { Modal } from 'ant-design-vue'

const routes: RouteRecordRaw[] = [
  { path: '/product-film', name: 'ProductFilm', component: () => import('@/pages/product-film/index.vue'), meta: { creationWorkspace: true } },
  { path: '/media-parser', name: 'MediaParser', component: () => import('@/pages/media-parser/index.vue') },
  { path: '/audio', name: 'Audio', component: () => import('@/pages/audio/index.vue') },
  {
    path: '/design-preview',
    name: 'DesignPreview',
    component: () => import('@/pages/design-preview/DesignPreview.vue'),
    meta: { designPreview: true },
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/home/Home.vue'),
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
    component: () => import('@/pages/all-tools/index.vue'),
  },
  {
    path: '/product-set',
    name: 'AiProductImage',
    component: () => import('@/pages/product-set/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/video-remix',
    name: 'VideoReplicate',
    component: () => import('@/pages/video-remix/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/viral-videos',
    name: 'ViralVideos',
    component: () => import('@/pages/viral-videos/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/image',
    name: 'AiImage',
    component: () => import('@/pages/image/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/product-video',
    name: 'ProductVideo',
    component: () => import('@/pages/product-video/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/detail-page',
    name: 'DetailPage',
    component: () => import('@/pages/detail-page/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/image-remix',
    name: 'ImageRemix',
    component: () => import('@/pages/image-remix/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/product-retouch',
    name: 'ProductRetouch',
    component: () => import('@/pages/product-retouch/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/virtual-try-on',
    name: 'VirtualTryOn',
    component: () => import('@/pages/virtual-try-on/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/fashion-set',
    name: 'FashionSet',
    component: () => import('@/pages/fashion-set/index.vue'),
    meta: { creationWorkspace: true },
  },
  {
    path: '/tools/:id',
    name: 'ToolDetail',
    component: () => import('@/pages/tool-detail/index.vue'),
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
