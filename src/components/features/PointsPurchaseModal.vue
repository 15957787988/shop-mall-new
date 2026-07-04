<template>
  <Modal
    :open="open"
    title="购买积分"
    :footer="null"
    :width="680"
    wrap-class-name="points-purchase-wrap"
    destroy-on-close
    @cancel="emit('close')"
  >
    <div class="points-purchase">
      <div class="points-purchase__header">
        <span class="points-purchase__label">我的积分</span>
        <span class="points-purchase__value">{{ points }}</span>
      </div>

      <Spin v-if="loading" class="points-purchase__loading" />
      <div v-else class="points-purchase__body">
        <div class="points-purchase__main">
          <div class="points-purchase__packages">
            <button
              v-for="(item, index) in packages"
              :key="item.id"
              type="button"
              class="points-purchase__pkg"
              :class="{ 'points-purchase__pkg--active': index === selectedIndex }"
              @click="selectPackage(index)"
            >
              <span class="points-purchase__pkg-points">{{ item.points }} 积分</span>
              <span class="points-purchase__pkg-price">
                <span class="points-purchase__pkg-currency">¥</span>{{ item.price }}
              </span>
            </button>
          </div>
          <p class="points-purchase__tip">
            温馨提示：积分不可兑换会员，不可转赠，也不可提现；积分充值后有效期为2年，不支持退款或反向兑换为人民币
          </p>
        </div>

        <div class="points-purchase__pay">
          <PayQrPanel v-if="selectedSpuId" :spu-id="selectedSpuId" @paid="onPaid" />
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Modal, Spin } from 'ant-design-vue'
import PayQrPanel from './PayQrPanel.vue'
import { getVipPage, type VipProduct } from '@/pages/pricing/api/vip'

const props = defineProps<{
  open: boolean
  points: number
}>()

const emit = defineEmits<{
  close: []
  paid: []
}>()

const loading = ref(false)
const packages = ref<VipProduct[]>([])
const selectedIndex = ref(0)

const selectedSpuId = computed(() => packages.value[selectedIndex.value]?.id ?? 0)

async function fetchPackages() {
  loading.value = true
  try {
    const res = await getVipPage({ pageNo: 1, pageSize: 6, productType: 2 })
    res.list.sort((a, b) => a.price - b.price)
    packages.value = res.list
    selectedIndex.value = 0
  } catch {
    packages.value = []
  } finally {
    loading.value = false
  }
}

function selectPackage(index: number) {
  selectedIndex.value = index
}

function onPaid() {
  emit('paid')
  emit('close')
}

watch(
  () => props.open,
  (open) => {
    if (open) void fetchPackages()
  },
)
</script>

<style scoped lang="scss">
:global(.points-purchase-wrap .ant-modal-content) {
  padding-bottom: 8px;
}

.points-purchase {
  &__header {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 20px;
  }

  &__label {
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__value {
    font-size: 20px;
    font-weight: 600;
    line-height: 1;
    color: var(--color-creative-violet);
  }

  &__loading {
    display: flex;
    justify-content: center;
    padding: 48px 0;
  }

  &__body {
    display: flex;
    gap: 20px;
    align-items: stretch;
    min-height: 240px;

    @media (max-width: 560px) {
      flex-direction: column;
    }
  }

  &__main {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 12px;
  }

  &__packages {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    align-content: start;
  }

  &__tip {
    margin: 0;
    font-size: 12px;
    line-height: 1.6;
    color: var(--color-ink-tertiary);
    text-align: center;
  }

  &__pkg {
    display: flex;
    min-height: 86px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 12px 8px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 8px;
    background: var(--color-surface-0);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;

    &--active {
      border-color: var(--color-creative-violet);
      background: rgba(124, 92, 255, 0.04);
    }

    &:hover:not(&--active) {
      border-color: rgba(124, 92, 255, 0.35);
    }
  }

  &__pkg-points {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-ink-primary);
  }

  &__pkg-price {
    font-size: 13px;
    color: var(--color-ink-tertiary);
  }

  &__pkg-currency {
    margin-right: 1px;
  }

  &__pay {
    display: flex;
    width: 220px;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;

    @media (max-width: 560px) {
      width: 100%;
    }
  }
}
</style>
