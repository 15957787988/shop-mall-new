<template>
  <Modal
    :open="open"
    :title="null"
    :footer="null"
    :width="960"
    wrap-class-name="vip-modal-wrap"
    destroy-on-close
    @cancel="emit('close')"
  >
    <div class="vip-modal">
      <div class="vip-modal__hero">
        <h2 class="vip-modal__title">开通会员，释放 AI 创作力</h2>
        <p class="vip-modal__desc">
          选择适合你的会员方案，或
          <button type="button" class="vip-modal__buy-points" @click="emit('openPoints')">
            购买积分
          </button>
        </p>
      </div>

      <Spin v-if="loading" class="vip-modal__loading" />
      <div v-else class="vip-modal__plans">
        <article v-for="item in vipList" :key="item.id" class="vip-modal__plan">
          <div class="vip-modal__plan-head">
            <h3 class="vip-modal__plan-name">{{ item.name }}</h3>
            <p class="vip-modal__plan-price">
              ¥{{ item.price }}
              <span>/ {{ item.durationDay }} 天</span>
            </p>
            <p class="vip-modal__plan-points">{{ item.points }} 积分</p>
          </div>

          <Button type="primary" block class="vip-modal__plan-btn" @click="openPay(item)">
            开通{{ getVipTypeLabel(item.membershipType) }}会员
          </Button>

          <ul v-if="item.displayConfigLines?.length" class="vip-modal__benefits">
            <li v-for="(line, idx) in item.displayConfigLines" :key="idx">{{ line }}</li>
          </ul>
        </article>
      </div>
    </div>

    <Modal
      :open="payOpen"
      title="扫码支付"
      :footer="null"
      :width="360"
      destroy-on-close
      @cancel="closePay"
    >
      <p v-if="payPrice" class="vip-modal__pay-price">支付金额：¥{{ payPrice }}</p>
      <PayQrPanel v-if="paySpuId" :spu-id="paySpuId" @paid="onPaid" />
    </Modal>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Modal, Spin, Button } from 'ant-design-vue'
import PayQrPanel from './PayQrPanel.vue'
import { getVipPage, getVipTypeLabel, type VipProduct } from '@/pages/pricing/api/vip'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  openPoints: []
  paid: []
}>()

const loading = ref(false)
const vipList = ref<VipProduct[]>([])
const payOpen = ref(false)
const paySpuId = ref(0)
const payPrice = ref(0)

async function fetchVipList() {
  loading.value = true
  try {
    const res = await getVipPage({ pageNo: 1, pageSize: 20, productType: 1 })
    res.list.sort((a, b) => a.membershipType - b.membershipType)
    vipList.value = res.list
  } catch {
    vipList.value = []
  } finally {
    loading.value = false
  }
}

function openPay(item: VipProduct) {
  paySpuId.value = item.id
  payPrice.value = item.price
  payOpen.value = true
}

function closePay() {
  payOpen.value = false
  paySpuId.value = 0
  payPrice.value = 0
}

function onPaid() {
  closePay()
  emit('paid')
  emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) void fetchVipList()
  },
)
</script>

<style scoped lang="scss">
:global(.vip-modal-wrap .ant-modal-content) {
  padding: 0;
  overflow: hidden;
}

.vip-modal {
  padding: 24px;

  &__hero {
    margin-bottom: 20px;
    text-align: center;
  }

  &__title {
    margin: 0 0 8px;
    font-size: 20px;
    font-weight: 600;
  }

  &__desc {
    margin: 0;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__buy-points {
    border: none;
    background: none;
    padding: 0;
    font: inherit;
    color: var(--color-creative-violet);
    cursor: pointer;
    text-decoration: underline;
  }

  &__loading {
    display: flex;
    justify-content: center;
    padding: 48px 0;
  }

  &__plans {
    display: grid;
    gap: 16px;

    @media (min-width: 640px) {
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    }
  }

  &__plan {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 12px;
    background: var(--color-surface-0);
  }

  &__plan-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }

  &__plan-price {
    margin: 4px 0 0;
    font-size: 22px;
    font-weight: 700;

    span {
      font-size: 13px;
      font-weight: 400;
      color: var(--color-ink-secondary);
    }
  }

  &__plan-points {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--color-ink-secondary);
  }

  &__plan-btn {
    background: var(--color-creative-violet) !important;
    border-color: var(--color-creative-violet) !important;
  }

  &__benefits {
    margin: 0;
    padding-left: 18px;
    font-size: 12px;
    color: var(--color-ink-secondary);

    li + li {
      margin-top: 4px;
    }
  }

  &__pay-price {
    margin: 0 0 12px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
  }
}
</style>
