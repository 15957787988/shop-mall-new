<template>
  <div class="recharge-panel">
    <div class="recharge-panel__header">
      <p class="recharge-panel__balance">
        当前余额：
        <strong class="recharge-panel__balance-value">{{ beans }}</strong>
        算力
      </p>
      <div class="recharge-panel__tabs">
        <button
          type="button"
          class="recharge-panel__tab"
          :class="{ 'recharge-panel__tab--active': activeTab === 'packages' }"
          @click="activeTab = 'packages'"
        >
          充值
        </button>
        <button
          type="button"
          class="recharge-panel__tab"
          :class="{ 'recharge-panel__tab--active': activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          记录
        </button>
      </div>
    </div>

    <template v-if="activeTab === 'packages'">
      <div v-if="loading" class="recharge-panel__loading">
        <Spin />
      </div>
      <div v-else class="recharge-panel__grid">
        <button
          v-for="pkg in packages"
          :key="pkg.id"
          type="button"
          class="recharge-panel__pkg"
          :disabled="submitting"
          @click="handleRecharge(pkg)"
        >
          <p class="recharge-panel__pkg-beans">
            {{ pkg.beans }}
            <span v-if="pkg.bonus > 0" class="recharge-panel__pkg-bonus">+{{ pkg.bonus }}</span>
          </p>
          <p class="recharge-panel__pkg-label">算力</p>
          <p class="recharge-panel__pkg-price">¥{{ pkg.price }}</p>
          <p v-if="pkg.name" class="recharge-panel__pkg-name">{{ pkg.name }}</p>
        </button>
      </div>

      <p class="recharge-panel__hint">1 元 = 10 算力 · 充值越多优惠越大</p>

      <div class="recharge-panel__redeem">
        <template v-if="showCardRedeem">
          <label class="recharge-panel__redeem-label">输入卡密</label>
          <div class="recharge-panel__redeem-row">
            <Input
              v-model:value="cardCode"
              placeholder="请输入卡密"
              class="recharge-panel__redeem-input"
            />
            <Button
              type="primary"
              :loading="redeeming"
              :disabled="!cardCode.trim()"
              @click="handleRedeem"
            >
              兑换
            </Button>
          </div>
          <button type="button" class="recharge-panel__redeem-cancel" @click="cancelRedeem">
            取消
          </button>
        </template>
        <button v-else type="button" class="recharge-panel__redeem-trigger" @click="showCardRedeem = true">
          <GiftOutlined />
          卡密兑换
          <RightOutlined />
        </button>
      </div>
    </template>

    <template v-else>
      <div class="recharge-panel__history">
        <div v-if="recordsLoading && records.length === 0" class="recharge-panel__loading">
          <Spin />
        </div>
        <div v-else-if="records.length === 0" class="recharge-panel__empty">暂无充值记录</div>
        <template v-else>
          <table class="recharge-panel__table">
            <thead>
              <tr>
                <th>金额</th>
                <th>到账</th>
                <th>渠道</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in records" :key="r.id">
                <td><span class="recharge-panel__amount">¥{{ r.payPrice }}</span></td>
                <td>+{{ r.totalPrice }}</td>
                <td>{{ r.payChannelName || r.payChannelCode || '-' }}</td>
                <td>{{ formatTime(r.payTime) }}</td>
              </tr>
            </tbody>
          </table>
          <button
            v-if="recordsHasMore"
            type="button"
            class="recharge-panel__load-more"
            :disabled="recordsLoading"
            @click="loadMoreRecords"
          >
            {{ recordsLoading ? '加载中...' : '加载更多' }}
          </button>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Input, Button, Spin } from 'ant-design-vue'
import { GiftOutlined, RightOutlined } from '@ant-design/icons-vue'
import { useToast } from '@/composables/useToast'
import { apiEnv } from '@/service/env'
import {
  getWalletRechargePackageList,
  createWalletRecharge,
  redeemCardCode,
  getWalletRechargePage,
  type WalletRechargePackage,
  type WalletRechargeRecord,
} from '@/pages/pricing/api'

const FALLBACK_PACKAGES = [
  { id: 'pkg-basic', beans: 100, price: 10, bonus: 0, name: '基础包' },
  { id: 'pkg-popular', beans: 500, price: 50, bonus: 50, name: '热门包' },
  { id: 'pkg-premium', beans: 1200, price: 100, bonus: 200, name: '尊享包' },
  { id: 'pkg-ultimate', beans: 3000, price: 200, bonus: 500, name: '至尊包' },
]

interface DisplayPackage {
  id: string
  beans: number
  price: number
  bonus: number
  name: string
}

const props = defineProps<{
  beans: number
}>()

const emit = defineEmits<{
  rechargeComplete: []
}>()

const { addToast } = useToast()
const activeTab = ref<'packages' | 'history'>('packages')
const packages = ref<DisplayPackage[]>([])
const loading = ref(false)
const submitting = ref(false)
const records = ref<WalletRechargeRecord[]>([])
const recordsLoading = ref(false)
const recordsPage = ref(0)
const recordsHasMore = ref(true)
const showCardRedeem = ref(false)
const cardCode = ref('')
const redeeming = ref(false)

function apiPackageToDisplay(pkg: WalletRechargePackage): DisplayPackage {
  return {
    id: `pkg-${pkg.id}`,
    beans: Math.round(pkg.payPrice / 10),
    price: pkg.payPrice,
    bonus: Math.round(pkg.bonusPrice / 10),
    name: pkg.name,
  }
}

function fallbackPackages(): DisplayPackage[] {
  return FALLBACK_PACKAGES.map((p) => ({
    id: p.id,
    beans: p.beans,
    price: p.price,
    bonus: p.bonus,
    name: `${p.beans}算力`,
  }))
}

async function loadPackages() {
  if (apiEnv.useMock) {
    packages.value = fallbackPackages()
    return
  }
  loading.value = true
  try {
    const list = await getWalletRechargePackageList()
    packages.value = list?.length ? list.map(apiPackageToDisplay) : fallbackPackages()
  } catch {
    packages.value = fallbackPackages()
  } finally {
    loading.value = false
  }
}

async function loadRecords() {
  if (apiEnv.useMock) {
    records.value = []
    recordsHasMore.value = false
    return
  }
  recordsLoading.value = true
  try {
    const result = await getWalletRechargePage({ pageNo: 1, pageSize: 20 })
    records.value = result.list ?? []
    recordsPage.value = 1
    recordsHasMore.value = (result.list ?? []).length >= 20
  } catch {
    records.value = []
  } finally {
    recordsLoading.value = false
  }
}

async function loadMoreRecords() {
  if (!recordsHasMore.value || recordsLoading.value) return
  recordsLoading.value = true
  try {
    const nextPage = recordsPage.value + 1
    const result = await getWalletRechargePage({ pageNo: nextPage, pageSize: 20 })
    records.value = [...records.value, ...(result.list ?? [])]
    recordsPage.value = nextPage
    recordsHasMore.value = (result.list ?? []).length >= 20
  } catch {
    // silent
  } finally {
    recordsLoading.value = false
  }
}

async function handleRecharge(pkg: DisplayPackage) {
  if (apiEnv.useMock) {
    addToast(`模拟充值成功：获得 ${pkg.beans + pkg.bonus} 算力`, 'success')
    emit('rechargeComplete')
    return
  }
  submitting.value = true
  try {
    const pkgId = parseInt(pkg.id.replace('pkg-', ''), 10)
    const result = await createWalletRecharge({ packageId: pkgId })
    addToast(`充值订单已创建（ID: ${result.id}），请完成支付`, 'success')
    emit('rechargeComplete')
  } catch (err: unknown) {
    addToast(err instanceof Error ? err.message : '充值创建失败，请稍后重试', 'error')
  } finally {
    submitting.value = false
  }
}

async function handleRedeem() {
  if (!cardCode.value.trim()) {
    addToast('请输入卡密', 'error')
    return
  }
  if (apiEnv.useMock) {
    addToast('模拟兑换成功：获得 100 算力', 'success')
    cardCode.value = ''
    showCardRedeem.value = false
    emit('rechargeComplete')
    return
  }
  redeeming.value = true
  try {
    await redeemCardCode(cardCode.value.trim())
    addToast('卡密兑换成功！', 'success')
    cardCode.value = ''
    showCardRedeem.value = false
    emit('rechargeComplete')
  } catch (err: unknown) {
    addToast(err instanceof Error ? err.message : '兑换失败，请检查卡密是否正确', 'error')
  } finally {
    redeeming.value = false
  }
}

function cancelRedeem() {
  showCardRedeem.value = false
  cardCode.value = ''
}

function formatTime(time?: string) {
  return time ? time.replace('T', ' ').slice(0, 16) : '-'
}

onMounted(loadPackages)

watch(activeTab, (tab) => {
  if (tab === 'history') loadRecords()
})
</script>

<style scoped lang="scss">
.recharge-panel {
  &__header {
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__balance {
    margin: 0;
    font-size: 14px;
    color: var(--color-ink-secondary);
  }

  &__balance-value {
    color: var(--color-creative-violet);
  }

  &__tabs {
    display: flex;
    gap: 4px;
    border-radius: 8px;
    background: var(--color-surface-1);
    padding: 2px;
  }

  &__tab {
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 14px;
    font-weight: 500;
    background: transparent;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition: all 0.2s;

    &--active {
      background: var(--color-creative-violet);
      color: white;
    }

    &:hover:not(&--active) {
      color: var(--color-ink-primary);
    }
  }

  &__loading {
    display: flex;
    min-height: 200px;
    align-items: center;
    justify-content: center;
    color: var(--color-ink-tertiary);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  &__pkg {
    border: none;
    border-radius: 12px;
    background: var(--color-surface-0);
    padding: 16px;
    text-align: left;
    box-shadow: var(--shadow-soft);
    cursor: pointer;
    transition: all 0.2s;

    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: var(--shadow-lift);
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__pkg-beans {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: var(--color-creative-violet);
  }

  &__pkg-bonus {
    margin-left: 4px;
    font-size: 12px;
    font-weight: 400;
    color: var(--color-blossom-pink);
  }

  &__pkg-label {
    margin: 0;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__pkg-price {
    margin: 8px 0 0;
    font-size: 14px;
    font-weight: 500;
  }

  &__pkg-name {
    margin: 2px 0 0;
    font-size: 10px;
    color: var(--color-ink-tertiary);
  }

  &__hint {
    margin: 16px 0 0;
    text-align: center;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }

  &__redeem {
    margin-top: 16px;
    border-top: 1px solid var(--color-border-whisper);
    padding-top: 16px;
  }

  &__redeem-label {
    display: block;
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 500;
    color: var(--color-ink-secondary);
  }

  &__redeem-row {
    display: flex;
    gap: 8px;
  }

  &__redeem-input {
    flex: 1;
  }

  &__redeem-cancel {
    margin-top: 8px;
    border: none;
    background: none;
    font-size: 12px;
    color: var(--color-ink-tertiary);
    cursor: pointer;

    &:hover {
      color: var(--color-ink-secondary);
    }
  }

  &__redeem-trigger {
    display: inline-flex;
    width: 100%;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 1px dashed var(--color-border-whisper);
    border-radius: 8px;
    background: transparent;
    padding: 10px 16px;
    font-size: 14px;
    color: var(--color-ink-secondary);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      border-color: var(--color-creative-violet);
      color: var(--color-creative-violet);
    }
  }

  &__history {
    max-height: 360px;
    overflow-y: auto;
  }

  &__empty {
    display: flex;
    min-height: 200px;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--color-ink-tertiary);
  }

  &__table {
    width: 100%;
    font-size: 14px;
    text-align: left;
    border-collapse: collapse;

    th {
      padding-bottom: 8px;
      font-size: 12px;
      font-weight: 500;
      color: var(--color-ink-tertiary);
      border-bottom: 1px solid var(--color-border-whisper);
    }

    td {
      padding: 10px 8px 10px 0;
      border-bottom: 1px solid var(--color-border-whisper);
      color: var(--color-ink-primary);

      &:last-child {
        color: var(--color-ink-tertiary);
      }
    }
  }

  &__amount {
    font-weight: 500;
    color: #16a34a;
  }

  &__load-more {
    margin-top: 12px;
    width: 100%;
    border: none;
    background: none;
    padding: 8px;
    text-align: center;
    font-size: 12px;
    color: var(--color-creative-violet);
    cursor: pointer;

    &:hover:not(:disabled) {
      text-decoration: underline;
    }

    &:disabled {
      opacity: 0.5;
    }
  }
}
</style>
