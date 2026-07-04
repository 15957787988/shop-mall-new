<template>
  <footer class="subscription-checkout-footer">
    <div class="subscription-checkout-footer__inner">
      <div class="subscription-checkout-footer__payments">
        <span class="subscription-checkout-footer__payment">
          <span class="subscription-checkout-footer__pay-icon subscription-checkout-footer__pay-icon--wechat">微</span>
          微信支付
        </span>
        <span class="subscription-checkout-footer__payment">
          <span class="subscription-checkout-footer__pay-icon subscription-checkout-footer__pay-icon--alipay">支</span>
          支付宝
        </span>
      </div>
      <button
        type="button"
        class="subscription-checkout-footer__cta"
        :class="{ 'subscription-checkout-footer__cta--disabled': !agreed }"
        :disabled="!agreed"
        @click="emit('subscribe')"
      >
        <StarOutlined />
        ¥{{ ctaPrice }} 立即开通会员
      </button>
      <p class="subscription-checkout-footer__note">{{ priceNote }}</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { StarOutlined } from '@ant-design/icons-vue'

defineProps<{
  ctaPrice: number
  priceNote: string
  agreed: boolean
}>()

const emit = defineEmits<{
  subscribe: []
}>()
</script>

<style scoped lang="scss">
.subscription-checkout-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  border-top: 1px solid rgba(229, 231, 235, 0.6);
  background: rgba(255, 249, 245, 0.95);
  padding: 12px 16px;
  backdrop-filter: blur(4px);

  &__inner {
    margin: 0 auto;
    width: 100%;
    max-width: 560px;
  }

  &__payments {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }

  &__payment {
    display: inline-flex;
    min-height: 32px;
    align-items: center;
    gap: 6px;
    border-radius: 9999px;
    border: 1px solid var(--color-border-whisper);
    background: var(--sub-bg-card);
    padding: 0 12px;
    font-size: 11px;
    color: var(--color-ink-secondary);
  }

  &__pay-icon {
    display: flex;
    height: 16px;
    width: 16px;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    color: white;

    &--wechat {
      background: #07c160;
    }

    &--alipay {
      background: #1677ff;
    }
  }

  &__cta {
    display: flex;
    width: 100%;
    min-height: 50px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 600;
    color: white;
    background: linear-gradient(to right, var(--sub-accent-from), var(--sub-accent-to));
    box-shadow: 0 8px 24px rgba(255, 107, 157, 0.35);
    cursor: pointer;
    transition: transform 0.1s;

    &:active:not(:disabled) {
      transform: scale(0.98);
    }

    &--disabled {
      cursor: not-allowed;
      background: var(--color-ink-muted);
      box-shadow: none;
    }
  }

  &__note {
    margin: 8px 0 0;
    text-align: center;
    font-size: 10px;
    line-height: 1.6;
    color: var(--color-ink-muted);
  }
}
</style>
