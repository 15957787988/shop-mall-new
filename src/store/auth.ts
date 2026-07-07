import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { setOnUnauthorized } from '@/service/http'
import {
  loginByPassword,
  loginBySms,
  logout as apiLogout,
  refreshToken,
  registerAccount,
  type LoginResp,
} from '@/pages/login/api'
import { updateUserMobile, getMemberInfo, type MemberInfo } from '@/components/layout/api'
import {
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearTokens,
  getUserInfoCache,
  setUserInfoCache,
  clearUserInfoCache,
} from '@/lib/auth/storage'
import { initTenantFromStorage } from '@/lib/auth/tenant'

export type LoginModalMode = 'login' | 'bind-mobile'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const isLoading = ref(true)
  const loginModalOpen = ref(false)
  const loginModalMode = ref<LoginModalMode>('login')
  const sessionVersion = ref(0)
  const userInfo = ref<MemberInfo | null>(null)

  const persistUserInfo = (info: MemberInfo | null) => {
    userInfo.value = info
    if (info) {
      setUserInfoCache(JSON.stringify(info))
    } else {
      clearUserInfoCache()
    }
  }

  const restoreUserInfoFromCache = () => {
    const cached = getUserInfoCache()
    if (!cached) return
    try {
      userInfo.value = JSON.parse(cached) as MemberInfo
    } catch {
      clearUserInfoCache()
    }
  }

  const fetchUserInfo = async () => {
    if (!getAccessToken()) {
      persistUserInfo(null)
      return
    }
    try {
      persistUserInfo(await getMemberInfo())
    } catch {
      if (!userInfo.value) {
        persistUserInfo(null)
      }
    }
  }

  const applyLoginSession = (resp: LoginResp) => {
    setAccessToken(resp.accessToken)
    setRefreshToken(resp.refreshToken)
    isLoggedIn.value = true
  }

  const closeLogin = () => {
    loginModalOpen.value = false
    loginModalMode.value = 'login'
  }

  const openLogin = () => {
    loginModalMode.value = 'login'
    loginModalOpen.value = true
  }

  const openBindMobile = () => {
    loginModalMode.value = 'bind-mobile'
    loginModalOpen.value = true
  }

  const finishLogin = (resp: LoginResp) => {
    applyLoginSession(resp)
    closeLogin()
    sessionVersion.value += 1
  }

  const completeLogin = async (resp: LoginResp) => {
    finishLogin(resp)
    await fetchUserInfo()
  }

  const doRefreshToken = async (): Promise<boolean> => {
    const rt = getRefreshToken()
    if (!rt) return false
    try {
      const resp = await refreshToken(rt)
      applyLoginSession(resp)
      return true
    } catch {
      clearTokens()
      return false
    }
  }

  const logout = async () => {
    try {
      await apiLogout()
    } catch {
      // ignore
    }
    clearTokens()
    isLoggedIn.value = false
    persistUserInfo(null)
    closeLogin()
  }

  const handleUnauthorized = () => {
    if (loginModalOpen.value) return
    const rt = getRefreshToken()
    if (rt) {
      doRefreshToken().then((ok) => {
        if (!ok) {
          clearTokens()
          isLoggedIn.value = false
          persistUserInfo(null)
          openLogin()
        }
      })
    } else {
      clearTokens()
      isLoggedIn.value = false
      persistUserInfo(null)
      openLogin()
    }
  }

  const init = () => {
    initTenantFromStorage()
    const at = getAccessToken()
    if (at) {
      isLoggedIn.value = true
      restoreUserInfoFromCache()
      void fetchUserInfo()
    }
    isLoading.value = false
    setOnUnauthorized(handleUnauthorized)
  }

  const loginWithPassword = async (username: string, password: string) => {
    const resp = await loginByPassword(username, password)
    await completeLogin(resp)
  }

  const loginWithSms = async (mobile: string, code: string) => {
    const resp = await loginBySms(mobile, code)
    await completeLogin(resp)
  }

  const register = async (username: string, password: string) => {
    const resp = await registerAccount({ username, password })
    await completeLogin(resp)
  }

  const bindMobile = async (mobile: string, code: string) => {
    await updateUserMobile(mobile, code)
    closeLogin()
    await fetchUserInfo()
    sessionVersion.value += 1
  }

  return {
    isLoggedIn: computed(() => isLoggedIn.value),
    isLoading: computed(() => isLoading.value),
    loginModalOpen: computed(() => loginModalOpen.value),
    loginModalMode: computed(() => loginModalMode.value),
    userInfo: computed(() => userInfo.value),
    userPoint: computed(() => userInfo.value?.point ?? 0),
    fetchUserInfo,
    openLogin,
    openBindMobile,
    closeLogin,
    completeLogin,
    loginWithPassword,
    loginWithSms,
    register,
    bindMobile,
    logout,
    init,
    sessionVersion: computed(() => sessionVersion.value),
  }
})
