<template>
  <Modal
    :open="open"
    :footer="null"
    :closable="false"
    :mask-closable="false"
    :width="560"
    wrap-class-name="subscription-popup-wrap"
    destroy-on-close
    centered
    @cancel="emit('close')"
  >
    <div class="subscription-popup" aria-labelledby="subscription-popup-title">
      <header class="subscription-popup__header">
        <button
          type="button"
          class="subscription-popup__close"
          aria-label="关闭"
          @click="emit('close')"
        >
          <CloseOutlined />
        </button>
        <div class="subscription-popup__countdown-wrap">
          <SubscriptionCountdown :total-seconds="countdown" :badge="MEMBERSHIP_OFFER.badge" />
        </div>
      </header>

      <div class="subscription-popup__scroll">
        <SubscriptionHero />
        <section class="subscription-popup__section">
          <SubscriptionPlanCards :selected="period" @select="period = $event" />
        </section>
        <section class="subscription-popup__section">
          <SubscriptionBenefitGrid />
        </section>
        <label class="subscription-popup__agree">
          <Checkbox v-model:checked="agreed" />
          <span>
            同意
            <button type="button" class="subscription-popup__link">《会员服务协议》</button>
            及
            <button type="button" class="subscription-popup__link">《自动续费协议》</button>
          </span>
        </label>
        <RouterLink to="/pricing" class="subscription-popup__pricing" @click="emit('close')">
          查看全部套餐 →
        </RouterLink>
      </div>

      <SubscriptionCheckoutFooter
        :cta-price="ctaPrice"
        :price-note="priceNote"
        :agreed="agreed"
        @subscribe="handleSubscribe"
      />
    </div>
  </Modal>
</template>
<script setup lang="ts">
import { ref, computed, watch, onUnmounted, getCurrentInstance } from 'vue'
import { Checkbox, Modal } from 'ant-design-vue'
import { CloseOutlined } from '@ant-design/icons-vue'
import { RouterLink } from 'vue-router'
import SubscriptionCountdown from './subscription/SubscriptionCountdown.vue'
import SubscriptionHero from './subscription/SubscriptionHero.vue'
import SubscriptionPlanCards, {
  type SubscriptionPeriod,
} from './subscription/SubscriptionPlanCards.vue'
import SubscriptionBenefitGrid from './subscription/SubscriptionBenefitGrid.vue'
import SubscriptionCheckoutFooter from './subscription/SubscriptionCheckoutFooter.vue'
import { useToast } from '@/composables/useToast'

const MEMBERSHIP_OFFER = {
  trialPrice: 1.1,
  monthlyPrice: 49,
  yearlyPrice: 399,
  badge: '限时特惠',
  countdownSeconds: 8133,
}

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  subscribe: [period: SubscriptionPeriod]
}>()

const { addToast } = useToast()
const period = ref<SubscriptionPeriod>('monthly')
const agreed = ref(false)
const countdown = ref(0)
let countdownTimer: ReturnType<typeof setInterval> | null = null

const ctaPrice = computed(() =>
  period.value === 'monthly' ? MEMBERSHIP_OFFER.trialPrice : MEMBERSHIP_OFFER.yearlyPrice
)

const priceNote = computed(() =>
  period.value === 'monthly'
    ? `已优惠 ¥${(MEMBERSHIP_OFFER.monthlyPrice - MEMBERSHIP_OFFER.trialPrice).toFixed(1)} · 次月起 ¥${MEMBERSHIP_OFFER.monthlyPrice}/月，可随时取消`
    : '折合 ¥33/月，比月付省 32%'
)

function handleSubscribe() {
  if (!agreed.value) return
  const instance = getCurrentInstance()
  const hasListener = Boolean(instance?.vnode.props?.onSubscribe)
  if (!hasListener) {
    addToast('功能未开放，敬请期待', 'info')
    return
  }
  emit('subscribe', period.value)
  emit('close')
}

watch(  () => props.open,
  (open) => {
    if (countdownTimer) {
      clearInterval(countdownTimer)
      countdownTimer = null
    }
    if (!open) return
    countdown.value = MEMBERSHIP_OFFER.countdownSeconds
    agreed.value = false
    countdownTimer = setInterval(() => {
      countdown.value = countdown.value > 0 ? countdown.value - 1 : 0
    }, 1000)
  },
  { immediate: true }
)

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})</script>

<style scoped lang="scss">
:global(.subscription-popup-wrap .ant-modal-content) {
  height: min(100vh, 900px);
  overflow: hidden;
}

:global(.subscription-popup-wrap .ant-modal-body) {
  height: 100%;
  padding: 0;
  overflow: hidden;
}

.subscription-popup {
  display: flex;
  height: 100%;
  flex-direction: column;
  background: var(--sub-bg);

  &__header {    position: relative;
    flex-shrink: 0;
    padding: 16px 16px 8px;
  }

  &__close {
    position: absolute;
    right: 16px;
    top: 16px;
    z-index: 10;
    display: flex;
    height: 32px;
    width: 32px;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 9999px;
    background: rgba(0, 0, 0, 0.05);
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: rgba(0, 0, 0, 0.1);
    }
  }

  &__countdown-wrap {
    padding-top: 8px;
  }

  &__scroll {
    flex: 1;
    overflow-y: auto;
    padding: 0 16px 176px;
  }

  &__section {
    margin-bottom: 20px;
    margin-top: 16px;
  }

  &__agree {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    color: var(--color-ink-secondary);
    cursor: pointer;
  }

  &__link {
    border: none;
    background: none;
    padding: 0;
    font-size: inherit;
    color: var(--color-ink-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
  }

  &__pricing {
    display: block;
    margin-top: 16px;
    text-align: center;
    font-size: 12px;
    color: var(--color-ink-secondary);
    text-decoration: none;

    &:hover {
      color: var(--color-creative-violet);
      text-decoration: underline;
    }
  }
}
</style>
