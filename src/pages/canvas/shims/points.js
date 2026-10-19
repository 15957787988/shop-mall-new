import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserPointsStore = defineStore('canvas-user-points', () => {
  const points = ref(0)
  async function fetchUserPoints() {
    return true
  }
  async function checkPoints() {
    return true
  }
  return { points, fetchUserPoints, checkPoints }
})

export function useUserPointsStoreWithOut() {
  return useUserPointsStore()
}
