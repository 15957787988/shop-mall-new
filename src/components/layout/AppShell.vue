<template>
  <div class="app-shell">
    <Sidebar :open="sidebarOpen" :on-close="() => (sidebarOpen = false)" />

    <div class="app-shell__main">
      <TopBar
        :on-menu-click="() => (sidebarOpen = true)"
        :unread-count="0"
        :is-logged-in="isLoggedIn"
        :user-info="userInfo"
        :on-point-detail-click="openPointDetail"
        :on-vip-click="openVip"
        :on-message-click="() => (messageOpen = true)"
        :on-login-click="openLogin"
        :on-logout-click="handleLogout"
      />

      <main :class="['app-shell__content', { 'app-shell__content--workspace': isToolWorkspace }]">
        <slot />
        <SiteFooter v-if="showFooter && !hideFooterOnToolPage" />
      </main>
    </div>

    <ShellOverlays
      :message-open="messageOpen"
      :on-message-close="() => (messageOpen = false)"
    />

    <PointDetailModal
      :open="pointDetailOpen"
      :user-id="userInfo?.id"
      @close="pointDetailOpen = false"
    />

    <VipModal
      :open="vipOpen"
      @close="vipOpen = false"
      @open-points="openPointsPurchase"
      @paid="refreshUserPoint"
    />

    <PointsPurchaseModal
      :open="pointsPurchaseOpen"
      :points="userInfo?.point ?? 0"
      @close="pointsPurchaseOpen = false"
      @paid="refreshUserPoint"
    />

    <LoginModal :open="loginModalOpen" :on-close="closeLogin" :mode="loginModalMode" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/TopBar.vue'
import SiteFooter from '@/components/layout/SiteFooter.vue'
import ShellOverlays from '@/components/features/ShellOverlays.vue'
import LoginModal from '@/components/features/LoginModal.vue'
import PointDetailModal from '@/components/features/PointDetailModal.vue'
import VipModal from '@/components/features/VipModal.vue'
import PointsPurchaseModal from '@/components/features/PointsPurchaseModal.vue'
import { useAuth } from '@/composables/useAuth'

withDefaults(
  defineProps<{
    showFooter?: boolean
  }>(),
  {
    showFooter: true,
  },
)

const route = useRoute()
const hideFooterOnToolPage = computed(() => route.path.startsWith('/tools/'))
const isToolWorkspace = computed(() => hideFooterOnToolPage.value)

const {
  loginModalOpen,
  closeLogin,
  loginModalMode,
  isLoggedIn,
  openLogin,
  logout,
  fetchUserInfo,
  userInfo,
} = useAuth()

const sidebarOpen = ref(false)
const messageOpen = ref(false)
const pointDetailOpen = ref(false)
const vipOpen = ref(false)
const pointsPurchaseOpen = ref(false)

function requireLogin(action: () => void) {
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  action()
}

function openPointDetail() {
  requireLogin(() => {
    pointDetailOpen.value = true
  })
}

function openVip() {
  requireLogin(() => {
    vipOpen.value = true
  })
}

function openPointsPurchase() {
  vipOpen.value = false
  pointsPurchaseOpen.value = true
}

async function refreshUserPoint() {
  await fetchUserInfo()
}

async function handleLogout() {
  await logout()
}
</script>

<style scoped lang="scss">
.app-shell {
  display: flex;
  height: 100vh;
  min-height: 100vh;
  overflow: hidden;

  &__main {
    display: flex;
    min-height: 0;
    min-width: 0;
    flex: 1;
    flex-direction: column;
  }

  &__content {
    flex: 1;
    min-height: 0;
    background: var(--color-surface-1);
    overflow: auto;

    &--workspace {
      overflow: hidden;
    }
  }
}
</style>
