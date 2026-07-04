<template>
  <Modal
    :open="open"
    title="充值与会员"
    :footer="null"
    :width="448"
    wrap-class-name="purchase-modal-wrap"
    class="purchase-modal"
    @cancel="emit('close')"
  >
    <div class="purchase-modal__tabs">
      <button
        v-for="item in tabItems"
        :key="item.id"
        type="button"
        class="purchase-modal__tab"
        :class="{ 'purchase-modal__tab--active': tab === item.id }"
        @click="tab = item.id"
      >
        {{ item.label }}
        <span v-if="tab === item.id" class="purchase-modal__tab-indicator" />
      </button>
    </div>

    <div class="purchase-modal__body">
      <div v-if="tab === 'recharge'" class="purchase-modal__panel">
        <RechargePanel :beans="beans" @recharge-complete="onRechargeComplete" />
      </div>
      <div v-else class="purchase-modal__membership">
        <p class="purchase-modal__membership-desc">
          1.1 元体验专业版，解锁全部 AI 工具与高级模板
        </p>
        <SubscriptionPlanCards :selected="period" @select="period = $event" />
        <label class="purchase-modal__agree">
          <Checkbox v-model:checked="agreed" />
          <span>同意《会员服务协议》及《自动续费协议》</span>
        </label>
        <Button
          type="primary"
          block
          size="large"
          :disabled="!agreed"
          class="purchase-modal__subscribe-btn"
          @click="handleSubscribe"
        >
          {{ period === 'monthly' ? '¥1.1 开通体验' : '¥399 开通年费' }}
        </Button>
        <RouterLink to="/pricing" class="purchase-modal__pricing-link" @click="emit('close')">
          查看全部套餐 →
        </RouterLink>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Modal, Checkbox, Button } from 'ant-design-vue'
import { RouterLink } from 'vue-router'
import RechargePanel from './RechargePanel.vue'
import SubscriptionPlanCards, {
  type SubscriptionPeriod,
} from './subscription/SubscriptionPlanCards.vue'
import { useToast } from '@/composables/useToast'

export type PurchaseTab = 'recharge' | 'membership'

const props = withDefaults(
  defineProps<{
    open: boolean
    beans: number
    initialTab?: PurchaseTab
  }>(),
  { initialTab: 'recharge' }
)

const emit = defineEmits<{
  close: []
  rechargeComplete: []
}>()

const { addToast } = useToast()
const tab = ref<PurchaseTab>(props.initialTab)
const period = ref<SubscriptionPeriod>('monthly')
const agreed = ref(false)

const tabItems = [
  { id: 'recharge' as const, label: '购买算力' },
  { id: 'membership' as const, label: '开通会员' },
]

watch(
  () => [props.open, props.initialTab] as const,
  ([open, initialTab]) => {
    if (open) {
      tab.value = initialTab
      agreed.value = false
    }
  }
)

function onRechargeComplete() {
  emit('rechargeComplete')
  emit('close')
}

function handleSubscribe() {
  if (!agreed.value) return
  addToast('功能未开放，敬请期待', 'info')
}
</script>

<style scoped lang="scss">
:global(.purchase-modal-wrap .ant-modal-content) {
  padding: 0;
  overflow: hidden;
}

:global(.purchase-modal-wrap .ant-modal-header) {
  padding: 16px 16px 0;
  margin-bottom: 0;
}

:global(.purchase-modal-wrap .ant-modal-body) {
  padding: 0;
}

.purchase-modal {
  &__tabs {
    display: flex;
    border-bottom: 1px solid var(--color-border-whisper);
    padding: 0 16px;
  }

  &__tab {
    position: relative;
    border: none;
    background: none;
    padding: 10px 12px;
    font-size: 14px;
    font-weight: 500;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition: color 0.2s;

    &--active {
      color: var(--color-creative-violet);
    }

    &:hover:not(&--active) {
      color: var(--color-ink-primary);
    }
  }

  &__tab-indicator {
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: 0;
    height: 2px;
    border-radius: 9999px;
    background: var(--color-creative-violet);
  }

  &__body {
    max-height: min(70vh, 520px);
    overflow-y: auto;
  }

  &__panel {
    padding: 16px;
  }

  &__membership {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }

  &__membership-desc {
    margin: 0;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__agree {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 12px;
    color: var(--color-ink-secondary);
    cursor: pointer;
  }

  &__subscribe-btn {
    background: var(--color-creative-violet) !important;
    border-color: var(--color-creative-violet) !important;
  }

  &__pricing-link {
    display: block;
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
