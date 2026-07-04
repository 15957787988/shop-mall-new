<template>
  <PageContainer>
    <div class="pricing-plans">
      <div
        v-for="plan in PRICING_PLANS"
        :key="plan.id"
        :class="[
          'pricing-plan',
          plan.popular ? 'pricing-plan--popular' : 'pricing-plan--default',
        ]"
      >
        <div class="pricing-plan__inner">
          <span v-if="plan.popular" class="pricing-plan__badge">最受欢迎</span>
          <h3 class="pricing-plan__name">{{ plan.name }}</h3>
          <div class="pricing-plan__price-row">
            <span class="pricing-plan__price">
              {{ plan.price === 0 ? '免费' : `¥${plan.price}` }}
            </span>
            <span v-if="plan.price > 0" class="pricing-plan__period">/{{ plan.period }}</span>
          </div>
          <p class="pricing-plan__beans">{{ plan.beans.toLocaleString() }} 算力</p>
          <ul class="pricing-plan__features">
            <li v-for="feature in plan.features" :key="feature" class="pricing-plan__feature">
              <CheckOutlined class="pricing-plan__check" />
              {{ feature }}
            </li>
          </ul>
          <button
            type="button"
            class="pricing-plan__cta"
            :class="{ 'pricing-plan__cta--primary': plan.popular }"
            @click="plan.price > 0 ? handleSubscribe() : undefined"
          >
            {{ plan.price === 0 ? '免费使用' : '立即订阅' }}
          </button>
        </div>
      </div>
    </div>

    <section class="pricing-compare">
      <h3 class="pricing-compare__title">功能对比</h3>
      <div class="pricing-compare__table-wrap">
        <table class="pricing-compare__table">
          <thead>
            <tr class="pricing-compare__head-row">
              <th class="pricing-compare__head-cell pricing-compare__head-cell--feature">功能</th>
              <th
                v-for="plan in PRICING_PLANS"
                :key="plan.id"
                class="pricing-compare__head-cell"
              >
                {{ plan.name }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="feature in ALL_FEATURES"
              :key="feature"
              class="pricing-compare__row"
            >
              <td class="pricing-compare__cell pricing-compare__cell--feature">{{ feature }}</td>
              <td
                v-for="plan in PRICING_PLANS"
                :key="plan.id"
                class="pricing-compare__cell pricing-compare__cell--check"
              >
                <CheckOutlined
                  v-if="planHasFeature(plan, feature)"
                  class="pricing-compare__check"
                />
                <span v-else class="pricing-compare__dash">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="pricing-recharge">
      <h3 class="pricing-recharge__title">算力充值</h3>
      <p class="pricing-recharge__desc">
        算力是平台虚拟货币，用于消耗 AI 工具。1 元 = 10 算力，充值越多优惠越大。
      </p>
      <button type="button" class="pricing-recharge__btn" @click="rechargeOpen = true">
        <StarOutlined />
        立即充值
      </button>
    </section>

    <Overlay
      :open="rechargeOpen"
      :on-close="closeRecharge"
      title="算力充值"
    >
      <RechargePanel :beans="0" @recharge-complete="handleRechargeComplete" />
    </Overlay>
  </PageContainer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { CheckOutlined, StarOutlined } from '@ant-design/icons-vue'
import PageContainer from '@/components/ui/PageContainer.vue'
import Overlay from '@/components/ui/Overlay.vue'
import RechargePanel from '@/components/features/RechargePanel.vue'
import { useToast } from '@/composables/useToast'

interface PricingPlan {
  id: string
  name: string
  price: number
  period: string
  beans: number
  popular: boolean
  features: string[]
}

const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    period: '',
    beans: 100,
    popular: false,
    features: ['每日 100 算力', '基础 AI 工具', '标准模板库', '有水印导出'],
  },
  {
    id: 'pro',
    name: '专业版',
    price: 49,
    period: '月',
    beans: 3000,
    popular: true,
    features: [
      '每月 3000 算力',
      '全部 AI 工具',
      '全部模板库',
      '无水印导出',
      '优先客服',
    ],
  },
  {
    id: 'enterprise',
    name: '企业版',
    price: 199,
    period: '月',
    beans: 20000,
    popular: false,
    features: [
      '每月 20000 算力',
      '全部 AI 工具 + API',
      '全部模板库',
      '无水印导出',
      '团队协作',
      '专属客户经理',
    ],
  },
]

const ALL_FEATURES = [
  '每日/每月算力',
  '基础 AI 工具',
  '全部 AI 工具',
  '全部 AI 工具 + API',
  '标准模板库',
  '高级模板库',
  '定制模板',
  '无水印导出',
  '团队协作',
  '优先客服',
  '专属客户经理',
]

const { addToast } = useToast()
const rechargeOpen = ref(false)

function planHasFeature(plan: PricingPlan, feature: string): boolean {
  return plan.features.some(
    (f) => f.includes(feature) || feature.includes(f.slice(0, 4)),
  )
}

function handleSubscribe() {
  addToast('功能未开放，敬请期待', 'info')
}

function closeRecharge() {
  rechargeOpen.value = false
}

function handleRechargeComplete() {
  rechargeOpen.value = false
}
</script>

<style scoped lang="scss">
.pricing-plans {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  margin-bottom: 40px;

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }
}

.pricing-plan {
  position: relative;
  border-radius: 12px;

  &--popular {
    background: linear-gradient(
      to bottom right,
      var(--color-creative-violet),
      var(--color-blossom-pink)
    );
    padding: 1px;
    box-shadow: var(--shadow-lift);
  }

  &--default {
    border: 1px solid var(--color-border-whisper);
    background: var(--color-surface-0);
    box-shadow: var(--shadow-soft);
  }

  &__inner {
    position: relative;
    border-radius: 11px;
    padding: 24px;
  }

  &--popular &__inner {
    background: var(--color-surface-0);
  }

  &__badge {
    position: absolute;
    top: -12px;
    left: 50%;
    transform: translateX(-50%);
    border-radius: 9999px;
    background: var(--color-creative-violet);
    padding: 2px 12px;
    font-size: 12px;
    color: #fff;
    white-space: nowrap;
  }

  &__name {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
  }

  &__price-row {
    margin-top: 8px;
  }

  &__price {
    font-size: 30px;
    font-weight: 700;
  }

  &__period {
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__beans {
    margin: 8px 0 0;
    font-size: 12px;
    color: var(--color-creative-violet);
  }

  &__features {
    margin: 16px 0 0;
    padding: 0;
    list-style: none;
  }

  &__feature {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: 14px;
    color: var(--color-ink-secondary);

    & + & {
      margin-top: 8px;
    }
  }

  &__check {
    margin-top: 2px;
    flex-shrink: 0;
    font-size: 16px;
    color: var(--color-success-mint);
  }

  &__cta {
    margin-top: 24px;
    width: 100%;
    min-height: 44px;
    border-radius: 6px;
    border: 1px solid var(--color-border-whisper);
    background: transparent;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s;

    &--primary {
      border-color: transparent;
      background: var(--color-creative-violet);
      color: #fff;
    }

    &:hover {
      opacity: 0.9;
    }
  }
}

.pricing-compare {
  margin-bottom: 32px;

  &__title {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 600;
  }

  &__table-wrap {
    overflow-x: auto;
    border-radius: 8px;
    border: 1px solid var(--color-border-whisper);
  }

  &__table {
    width: 100%;
    min-width: 600px;
    border-collapse: collapse;
    font-size: 14px;
  }

  &__head-row {
    border-bottom: 1px solid var(--color-border-whisper);
    background: var(--color-canvas-mist);
  }

  &__head-cell {
    padding: 12px;
    font-weight: 500;
    text-align: center;

    &--feature {
      text-align: left;
    }
  }

  &__row {
    border-bottom: 1px solid var(--color-border-whisper);

    &:last-child {
      border-bottom: none;
    }
  }

  &__cell {
    padding: 12px;

    &--feature {
      color: var(--color-ink-secondary);
    }

    &--check {
      text-align: center;
    }
  }

  &__check {
    display: block;
    margin: 0 auto;
    font-size: 16px;
    color: var(--color-success-mint);
  }

  &__dash {
    color: var(--color-ink-secondary);
  }
}

.pricing-recharge {
  border-radius: 8px;
  background: var(--color-canvas-mist);
  padding: 24px;
  text-align: center;

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  &__desc {
    margin: 8px 0 0;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__btn {
    display: inline-flex;
    margin-top: 16px;
    min-height: 44px;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    border-radius: 6px;
    background: var(--color-creative-violet);
    padding: 8px 24px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover {
      opacity: 0.9;
    }
  }
}
</style>
