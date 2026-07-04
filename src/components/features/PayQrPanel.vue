<template>
  <div class="pay-qr-panel">
    <div class="pay-qr-panel__qr-wrap">
      <div v-if="!qrContent" class="pay-qr-panel__mask">
        <p class="pay-qr-panel__mask-tip">支付前请阅读并同意服务协议</p>
        <a href="/Agreement" target="_blank" rel="noreferrer" class="pay-qr-panel__agreement">
          《会员服务协议》
        </a>
        <Button
          type="primary"
          block
          size="large"
          class="pay-qr-panel__pay-btn"
          :loading="loading"
          :disabled="!spuId"
          @click="startPay"
        >
          同意并支付
        </Button>
      </div>
      <Spin v-else-if="loading" />
      <img
        v-else
        :src="qrImageUrl(qrContent)"
        alt="支付二维码"
        class="pay-qr-panel__qr"
      />
    </div>

    <p class="pay-qr-panel__hint">
      {{ payType === 'paypal_express' ? '将跳转 PayPal 完成支付' : '请使用微信扫码完成支付' }}
    </p>

    <div class="pay-qr-panel__channels">
      <button
        v-for="item in payChannels"
        :key="item.channelCode"
        type="button"
        class="pay-qr-panel__channel"
        :class="{ 'pay-qr-panel__channel--active': payType === item.channelCode }"
        @click="switchChannel(item.channelCode)"
      >
        {{ item.name }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { Button, Spin } from 'ant-design-vue'
import { usePayQr } from '@/composables/usePayQr'

const props = defineProps<{
  spuId: number
}>()

const emit = defineEmits<{
  paid: []
}>()

const spuIdRef = toRef(props, 'spuId')
const { payChannels, payType, qrContent, loading, startPay, resetQr, qrImageUrl } = usePayQr(
  spuIdRef,
  () => emit('paid'),
)

function switchChannel(code: string) {
  if (payType.value === code) return
  payType.value = code
  resetQr()
}

defineExpose({ resetQr })
</script>

<style scoped lang="scss">
.pay-qr-panel {
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 10px;

  &__qr-wrap {
    display: flex;
    width: 100%;
    min-height: 200px;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--color-border-whisper);
    border-radius: 12px;
    overflow: hidden;
    background: var(--color-surface-0);
  }

  &__mask {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 20px 16px;
    text-align: center;
  }

  &__mask-tip {
    margin: 0;
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-ink-tertiary);
  }

  &__agreement {
    font-size: 12px;
    color: var(--color-creative-violet);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__pay-btn {
    margin-top: 4px;
    height: 40px !important;
    border-radius: 8px !important;
    background: var(--color-creative-violet) !important;
    border-color: var(--color-creative-violet) !important;
  }

  &__qr {
    width: 168px;
    height: 168px;
    padding: 8px;
  }

  &__hint {
    margin: 0;
    font-size: 12px;
    color: var(--color-ink-tertiary);
    text-align: center;
  }

  &__channels {
    display: flex;
    width: 100%;
    justify-content: center;
    gap: 8px;
  }

  &__channel {
    min-width: 88px;
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 6px;
    background: var(--color-surface-0);
    font-size: 12px;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition: border-color 0.2s, color 0.2s;

    &--active {
      border-color: var(--color-creative-violet);
      color: var(--color-creative-violet);
    }
  }
}
</style>
