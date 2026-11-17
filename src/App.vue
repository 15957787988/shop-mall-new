<template>
  <a-config-provider :locale="zhCN" :theme="theme">
    <router-view v-if="$route.meta.designPreview" />
    <AppShell v-else>
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
    colorPrimaryHover: color('--color-accent-hover'),
    colorPrimaryActive: color('--color-creative-violet'),
    colorPrimaryBg: color('--color-accent-soft'),
    colorPrimaryBgHover: color('--color-surface-2'),
    colorPrimaryBorder: color('--color-accent-border'),
    colorPrimaryBorderHover: color('--color-ink-secondary'),
    colorPrimaryText: color('--color-ink-primary'),
    colorPrimaryTextHover: color('--color-accent-hover'),
    colorPrimaryTextActive: color('--color-ink-primary'),
    colorInfo: color('--color-creative-violet'),
    colorInfoBg: color('--color-surface-1'),
    colorInfoBorder: color('--color-border-whisper'),
    colorInfoText: color('--color-ink-primary'),
    colorLink: color('--color-creative-violet'),
    colorLinkHover: color('--color-accent-hover'),
    colorLinkActive: color('--color-ink-primary'),
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
