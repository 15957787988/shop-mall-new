import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'nprogress/nprogress.css'
import '@/assets/style/global.scss'
import router from './router/index'
import { useAuthStore } from './store/auth'
import { initTenantFromStorage } from '@/lib/auth/tenant'
import VueLazyload from 'vue3-lazyload'

initTenantFromStorage()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
useAuthStore().init()
app.use(router)
app.use(Antd)
// ponytail: vue3-lazyload peer types target newer @vue/runtime-core than this app resolves
VueLazyload.install(app as Parameters<typeof VueLazyload.install>[0])

app.mount('#app')
