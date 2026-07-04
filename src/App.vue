<template>
  <a-config-provider :locale="zhCN">
    <!-- 顶层路由出口：/login 渲染登录页，/ 下的路由渲染 AdminLayout（内含子路由出口） -->
    <router-view />
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
</script>

<style></style>
