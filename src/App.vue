<template>
  <a-config-provider :locale="zhCN" :theme="theme">
    <AppShell>
      <router-view />
    </AppShell>
  </a-config-provider>
</template>

<script setup lang="ts">
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import AppShell from '@/components/layout/AppShell.vue'

const styles = getComputedStyle(document.documentElement)
const color = (name: string) => styles.getPropertyValue(name).trim()
const theme = {
  token: {
    colorPrimary: color('--color-creative-violet'),
    colorText: color('--color-ink-primary'),
    colorTextSecondary: color('--color-ink-secondary'),
    colorBorder: color('--color-border-whisper'),
    colorBgContainer: color('--color-surface-0'),
    colorBgLayout: color('--color-surface-1'),
    colorError: color('--color-danger'),
    borderRadius: 9,
    controlHeight: 38,
    fontSize: 14,
    fontFamily: color('--font-ui'),
  },
}
</script>
