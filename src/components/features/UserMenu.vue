<template>
  <div ref="rootRef" class="user-menu">
    <button
      type="button"
      class="user-menu__trigger"
      :title="isLoggedIn ? userName ?? '账户' : '登录'"
      :aria-label="isLoggedIn ? '账户菜单' : '登录'"
      :aria-expanded="open"
      @click="handleAvatarClick"
    >
      <img
        v-if="userAvatar"
        :src="userAvatar"
        :alt="userName ?? ''"
        class="user-menu__avatar"
      />
      <div v-else class="user-menu__avatar-fallback">
        <span class="user-menu__avatar-letter">
          {{ isLoggedIn ? userName?.charAt(0) ?? 'U' : '?' }}
        </span>
      </div>
    </button>

    <div v-if="open && isLoggedIn" class="user-menu__dropdown">
      <p v-if="userName" class="user-menu__name">{{ userName }}</p>
      <button type="button" class="user-menu__logout" @click="handleLogout">
        <LogoutOutlined class="user-menu__logout-icon" />
        退出登录
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { LogoutOutlined } from '@ant-design/icons-vue'

const props = defineProps<{
  isLoggedIn: boolean
  userName?: string
  userAvatar?: string
}>()

const emit = defineEmits<{
  login: []
  logout: []
}>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function handleDocClick(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false
  }
}

watch(open, (isOpen) => {
  if (isOpen) {
    document.addEventListener('mousedown', handleDocClick)
  } else {
    document.removeEventListener('mousedown', handleDocClick)
  }
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleDocClick)
})

function handleAvatarClick() {
  if (!props.isLoggedIn) {
    emit('login')
    return
  }
  open.value = !open.value
}

function handleLogout() {
  open.value = false
  emit('logout')
}
</script>

<style scoped lang="scss">
.user-menu {
  position: relative;
  flex-shrink: 0;

  &__trigger {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    cursor: pointer;
    padding: 0;
  }

  &__avatar {
    width: 32px;
    height: 32px;
    border-radius: 9999px;
    object-fit: cover;
    box-shadow: 0 0 0 2px var(--color-surface-0);
  }

  &__avatar-fallback {
    display: flex;
    width: 32px;
    height: 32px;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background: var(--color-surface-2);
    box-shadow: 0 0 0 2px var(--color-surface-0);
  }

  &__avatar-letter {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-tertiary);
  }

  &__dropdown {
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    z-index: var(--z-dropdown);
    min-width: 140px;
    overflow: hidden;
    border-radius: 8px;
    border: 1px solid var(--color-border-whisper);
    background: #fff;
    padding: 4px 0;
    box-shadow: var(--shadow-card-hover);
  }

  &__name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    padding: 8px 12px;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__logout {
    display: flex;
    width: 100%;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    text-align: left;
    font-size: 14px;
    color: var(--color-ink-primary);
    border: none;
    background: transparent;
    cursor: pointer;

    &:hover {
      background: var(--color-surface-2);
    }
  }

  &__logout-icon {
    font-size: 14px;
  }
}
</style>
