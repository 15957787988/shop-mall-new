<template>
  <aside class="t8__sidebar">
    <div class="t8__tabs">
      <button
        type="button"
        class="t8__tab"
        :class="{ 't8__tab--active': activeTab === 'generate' }"
        @click="activeTab = 'generate'"
      >
        生成爆款
      </button>
      <button
        type="button"
        class="t8__tab"
        :class="{ 't8__tab--active': activeTab === 'replicate' }"
        @click="activeTab = 'replicate'"
      >
        爆款复刻
      </button>
    </div>

    <div class="t8__sidebar-body scroll-area">
      <section class="t8__section">
        <div class="t8__section-title-row">
          <h3 class="t8__section-title">上传产品图<span class="t8__required">*</span></h3>
          <Popover placement="bottomLeft" :overlay-inner-style="{ padding: 0 }">
            <template #content>
              <img class="t8__upload-guide-img" :src="uploadGuideImg" alt="上传图片引导" />
            </template>
            <QuestionCircleOutlined class="t8__hint-icon" role="button" tabindex="0" />
          </Popover>
        </div>
        <ImageUpload
          :key="activeTab"
          :max-count="UPLOAD_MAX_COUNT"
          :existing-urls="currentForm.uploadedUrls"
          enable-primary
          :primary-index="currentForm.primaryImageIndex"
          @primary-change="currentForm.primaryImageIndex = $event"
          @upload-complete="currentForm.uploadedUrls = $event"
        />
      </section>

      <section v-if="activeTab === 'replicate'" class="t8__section">
        <h3 class="t8__section-title">参考爆款视频<span class="t8__required">*</span></h3>
        <UploadFile
          v-if="!currentForm.referenceVideoUrl"
          v-model="currentForm.referenceVideoUrl"
          class="t8__video-upload"
          :limit="1"
          :file-size="10"
          :file-type="['mp4', 'mov', 'avi', 'webm', 'mkv', 'video']"
          accept="video/*"
          drag
          :is-show-tip="false"
        >
          <div class="t8__video-upload-trigger">
            <UploadOutlined class="t8__video-upload-icon" />
            <p class="t8__video-upload-text">上传参考视频</p>
            <p class="t8__video-upload-subtext">
              AI 会深度复刻原片结构、转场与风格。视频过长时会转写为适合 15 秒的剧情。
            </p>
          </div>
        </UploadFile>
        <div v-else class="t8__video-cover">
          <img :src="referenceVideoCoverUrl" alt="参考视频封面" class="t8__video-cover-img" />
          <button
            type="button"
            class="t8__video-cover-remove"
            aria-label="删除参考视频"
            @click="currentForm.referenceVideoUrl = ''"
          >
            <CloseOutlined />
          </button>
        </div>
      </section>

      <section class="t8__section">
        <h3 class="t8__section-title">目标市场与语言</h3>
        <div class="t8__select-grid">
          <div>
            <span class="t8__field-label">市场</span>
            <Select v-model:value="selections.market" :options="marketOptions" class="t8__select" />
          </div>
          <div>
            <span class="t8__field-label">语言</span>
            <Select
              v-model:value="selections.language"
              :options="languageOptions"
              class="t8__select"
            />
          </div>
        </div>
        <div class="t8__ratio-field">
          <span class="t8__field-label">画幅</span>
          <Select
            v-model:value="selections.ratioLabel"
            :options="ratioSelectOptions"
            class="t8__select"
          />
        </div>
      </section>

      <section class="t8__section">
        <div class="t8__section-title-row t8__section-title-row--between">
          <h3 class="t8__section-title">商品卖点</h3>
          <button type="button" class="t8__ai-write-btn" :disabled="aiWriting" @click="emit('ai-write')">
            {{ aiWriting ? '生成中...' : 'AI 帮写' }}
          </button>
        </div>
        <TextArea
          v-model:value="currentForm.sellingPoints"
          :rows="3"
          placeholder="输入商品核心卖点、适用人群、使用场景等信息..."
          class="t8__textarea"
        />
      </section>

      <section v-if="activeTab === 'generate'" class="t8__section">
        <h3 class="t8__section-title">视频类型</h3>
        <div class="t8__type-picker">
          <Tooltip
            v-for="type in VIDEO_TYPE_CONFIG"
            :key="type.id"
            :title="type.tip"
            placement="top"
          >
            <div class="t8__type-picker-item">
              <Checkbox
                :checked="typeSelections[type.id]?.checked ?? false"
                @update:checked="(checked: boolean) => emit('toggle-type', type.id, checked)"
              />
              <span class="t8__type-picker-label">
                {{ type.label }}<span v-if="type.hot">🔥</span>
              </span>
              <InputNumber
                v-if="typeSelections[type.id]?.checked"
                :value="typeSelections[type.id]?.count"
                :min="1"
                size="small"
                class="t8__type-picker-count"
                @change="(v) => emit('change-type-count', type.id, v)"
              />
            </div>
          </Tooltip>
        </div>
        <p v-if="selectedTypeCount > 0" class="t8__type-summary">
          已选择 {{ selectedTypeCount }} 种视频类型，共 {{ totalVideoCount }} 条
        </p>
      </section>
    </div>

    <div class="t8__sidebar-footer">
      <Button
        type="primary"
        block
        size="large"
        class="t8__submit-btn"
        :disabled="activeTab === 'generate' ? !canGenerate : !canReplicate"
        :loading="isCurrentTabBusy"
        @click="activeTab === 'generate' ? emit('generate') : emit('replicate')"
      >
        <template v-if="!isCurrentTabBusy" #icon>
          <StarOutlined />
        </template>
        {{
          isCurrentTabBusy
            ? '生成中...'
            : activeTab === 'generate'
              ? `生成 10s 爆款视频（共 ${totalVideoCount} 条）`
              : '复刻 10s 爆款视频（共 1 条）'
        }}
      </Button>
      <p class="t8__estimate-hint">{{ estimateHint }}</p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Button,
  Select,
  Input,
  Checkbox,
  InputNumber,
  Tooltip,
  Popover,
} from 'ant-design-vue'
import {
  UploadOutlined,
  StarOutlined,
  CloseOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons-vue'
import uploadGuideImg from '@/assets/image/upload-guide-popover.png'
import ImageUpload from '@/components/UploadFile/src/ImageUpload.vue'
import UploadFile from '@/components/UploadFile/src/UploadFile.vue'
import {
  VIDEO_TYPE_CONFIG,
  MARKETS,
  LANGUAGES,
  RATIO_OPTIONS,
  UPLOAD_MAX_COUNT,
  type VideoTypeId,
} from '../utils/constants'
import { getVideoSnapshotUrl } from '../utils/helpers'
import type { MarketSelections, TabFormState, TabKey, TypeSelection } from '../utils/types'

const { TextArea } = Input

const activeTab = defineModel<TabKey>('activeTab', { required: true })

const props = defineProps<{
  tabFormState: Record<TabKey, TabFormState>
  typeSelections: Partial<Record<VideoTypeId, TypeSelection>>
  selections: MarketSelections
  aiWriting: boolean
  isCurrentTabBusy: boolean
  canGenerate: boolean
  canReplicate: boolean
  estimateHint: string
  totalVideoCount: number
  selectedTypeCount: number
}>()

const emit = defineEmits<{
  'ai-write': []
  generate: []
  replicate: []
  'toggle-type': [id: VideoTypeId, checked: boolean]
  'change-type-count': [id: VideoTypeId, value: number | string | null]
}>()

const currentForm = computed(() => props.tabFormState[activeTab.value])
const referenceVideoCoverUrl = computed(() =>
  currentForm.value.referenceVideoUrl
    ? getVideoSnapshotUrl(currentForm.value.referenceVideoUrl)
    : ''
)

const marketOptions = MARKETS.map((v) => ({ label: v, value: v }))
const languageOptions = LANGUAGES.map((v) => ({ label: v, value: v }))
const ratioSelectOptions = RATIO_OPTIONS.map((r) => ({ label: r.label, value: r.label }))
</script>

<style scoped lang="scss">
.t8__sidebar {
  position: relative;
  z-index: 10;
  order: 1;
  display: flex;
  min-height: 0;
  width: 100%;
  flex-shrink: 0;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid var(--color-border-whisper);
  background: var(--color-surface-0);
  box-shadow: 4px 0 24px rgba(0, 0, 0, 0.02);

  @media (max-width: 1023px) {
    max-height: 55vh;
  }

  @media (min-width: 1024px) {
    order: unset;
    height: 100%;
    max-height: none;
    width: 400px;
  }
}

.t8__tabs {
  display: flex;
  flex-shrink: 0;
  border-bottom: 1px solid var(--color-border-whisper);
  background: white;
}

.t8__tab {
  flex: 1;
  padding: 12px 0;
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink-secondary);
  cursor: pointer;

  &--active {
    border-bottom-color: var(--color-creative-violet);
    color: var(--color-creative-violet);
  }
}

.t8__sidebar-body {
  flex: 1;
  min-height: 0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.t8__sidebar-footer {
  flex-shrink: 0;
  border-top: 1px solid var(--color-border-whisper);
  background: white;
  padding: 20px;
}

.t8__section-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;

  &--between {
    justify-content: space-between;
  }
}

.t8__section-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-ink-primary);
}

.t8__section-title-row .t8__section-title {
  margin-bottom: 0;
}

.t8__required {
  margin-left: 4px;
  color: var(--color-creative-violet);
}

.t8__hint-icon {
  font-size: 14px;
  color: var(--color-ink-muted);
  cursor: pointer;

  &:hover {
    color: var(--color-creative-violet);
  }
}

.t8__upload-guide-img {
  display: block;
  width: 300px;
  max-width: 100%;
}

.t8__video-upload {
  width: 100%;
}

.t8__video-upload-trigger {
  padding: 20px 12px;
  text-align: center;
}

.t8__video-upload-icon {
  font-size: 28px;
  color: var(--color-creative-violet);
}

.t8__video-upload-text {
  margin: 12px 0 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-ink-primary);
}

.t8__video-upload-subtext {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--color-ink-muted);
}

.t8__video-cover {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--color-border-whisper);
  background: var(--color-surface-1);
}

.t8__video-cover-img {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: cover;
}

.t8__video-cover-remove {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  height: 28px;
  width: 28px;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 9999px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.t8__select-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 8px;
}

.t8__ratio-field {
  margin-top: 0;
}

.t8__field-label {
  display: block;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--color-ink-muted);
}

.t8__select {
  width: 100%;
}

.t8__ai-write-btn {
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--color-creative-violet);
  cursor: pointer;

  &:hover:not(:disabled) {
    text-decoration: underline;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.t8__textarea {
  resize: none;
}

.t8__type-picker {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px 12px;
}

.t8__type-picker-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  border-radius: 8px;
  padding: 6px 8px;
  background: var(--color-surface-1);
  cursor: default;
}

.t8__type-picker-label {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--color-ink-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.t8__type-picker-count {
  width: 64px !important;
  flex-shrink: 0;
}

.t8__type-summary {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--color-ink-muted);
}

.t8__submit-btn {
  min-height: 44px;
  border-radius: 12px !important;
  background: var(--color-creative-violet) !important;
  border-color: var(--color-creative-violet) !important;
  font-weight: 600;

  &:not(:disabled):hover {
    box-shadow: var(--shadow-lift);
  }
}

.t8__estimate-hint {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: var(--color-ink-muted);
}
</style>
