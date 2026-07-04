<template>
  <a-config-provider :locale="zhCN">
    <AppShell>
      <router-view />
    </AppShell>
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import AppShell from '@/components/layout/AppShell.vue'
</script>
