<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <nav class="app-navbar">
    <div class="nav-brand" @click="router.push('/canvas/index')">
      <span class="brand-hex">⬡</span>
      <span class="brand-name">CanvasFlow</span>
    </div>
    <div class="nav-actions">
      <button class="nav-btn" @click="router.push('/canvas/editor')">新建项目</button>
    </div>
  </nav>
</template>

<style lang="scss" scoped>

.app-navbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: rgba(#0c0c1e, 0.95);
  border-bottom: 1px solid $border-default;
  backdrop-filter: blur(8px);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.brand-hex { font-size: 22px; color: $accent-text; }
.brand-name { font-size: 15px; font-weight: 700; color: $text-primary; }

.nav-actions { display: flex; gap: 10px; }

.nav-btn {
  padding: 7px 18px;
  background: $accent-primary;
  border: none;
  border-radius: $radius-sm;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s;

  &:hover { background: $accent-hover; }
}
</style>
