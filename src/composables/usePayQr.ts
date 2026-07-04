import { ref, watch, onUnmounted, type Ref } from 'vue'
import { Modal } from 'ant-design-vue'
import { createPayOrder, queryPayOrderStatus } from '@/pages/pricing/api/vip'

const PAYPAL_CODE = 'paypal_express'

interface PayChannel {
  channelCode: string
  name: string
}

const PAY_CHANNELS: PayChannel[] = [
  { channelCode: 'wx_native', name: '微信支付' },
  { channelCode: PAYPAL_CODE, name: 'PayPal' },
]

export function usePayQr(spuId: Ref<number>, onPaid?: () => void) {
  const payType = ref(PAY_CHANNELS[0].channelCode)
  const qrContent = ref('')
  const payOrderId = ref(0)
  const loading = ref(false)

  let timer: ReturnType<typeof setTimeout> | null = null

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  function resetQr() {
    clearTimer()
    qrContent.value = ''
    payOrderId.value = 0
    loading.value = false
  }

  async function queryStatus() {
    if (!payOrderId.value) return
    try {
      const res = await queryPayOrderStatus(payOrderId.value)
      if (res.status === 10) {
        clearTimer()
        Modal.success({
          title: '支付成功',
          onOk: () => {
            resetQr()
            onPaid?.()
          },
        })
        return
      }
      timer = setTimeout(() => void queryStatus(), 3000)
    } catch {
      clearTimer()
    }
  }

  async function startPay() {
    if (!spuId.value) return
    loading.value = true
    try {
      const res = await createPayOrder({
        channelCode: payType.value,
        spuId: String(spuId.value),
        returnUrl: window.location.href,
      })
      if (payType.value === PAYPAL_CODE) {
        window.location.href = res.displayContent
        return
      }
      qrContent.value = res.displayContent
      payOrderId.value = res.payOrderId
      void queryStatus()
    } finally {
      loading.value = false
    }
  }

  watch(spuId, () => resetQr())

  onUnmounted(() => clearTimer())

  return {
    payChannels: PAY_CHANNELS,
    payType,
    qrContent,
    loading,
    startPay,
    resetQr,
    clearTimer,
    qrImageUrl: (text: string) =>
      `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(text)}`,
  }
}
