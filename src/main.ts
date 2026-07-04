import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import 'nprogress/nprogress.css'
import router from './router/index'

const app = createApp(App)

// Pinia 必须在 router 之前初始化，因为路由守卫里用到了 store
app.use(createPinia())
app.use(router)
app.use(Antd)

app.mount('#app')
