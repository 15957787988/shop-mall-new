import { defineStore } from 'pinia'
import { computed } from 'vue'
import { message } from 'ant-design-vue'
import { useAuthStore } from '@/store/auth'

/** 画布与顶部共用会员积分，提交校验使用扣除冻结后的可用余额。 */
export const useUserPointsStore = defineStore('canvas-user-points', () => {
  const auth = useAuthStore()
  const points = computed(() => auth.userPoint)
  const availablePoints = computed(() => auth.availablePoint)
  async function fetchUserPoints() {
    return auth.fetchUserInfo(true)
  }
  async function checkPoints(cost) {
    if (!Number.isFinite(cost) || cost < 0) return false
    if (!auth.isLoggedIn) {
      auth.openLogin()
      return false
    }
    if (availablePoints.value < cost) {
      message.warning('可用积分不足，请先补充积分')
      return false
    }
    return true
  }
  return { points, availablePoints, fetchUserPoints, checkPoints }
})

export function useUserPointsStoreWithOut() {
  return useUserPointsStore()
}
