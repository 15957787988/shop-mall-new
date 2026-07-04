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

initTenantFromStorage()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
useAuthStore().init()
app.use(router)
app.use(Antd)

app.mount('#app')
