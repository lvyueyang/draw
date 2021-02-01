import { createApp } from 'vue'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/antd.css'
import * as AntdIcon from '@ant-design/icons-vue'
import App from './App.vue'

import router from './router'

const app = createApp(App)

app.config.productionTip = false

for (const key of Object.keys(AntdIcon)) {
  app.component(key, AntdIcon[key])
}

app.use(router)
app.use(Antd)

app.mount('#app')
