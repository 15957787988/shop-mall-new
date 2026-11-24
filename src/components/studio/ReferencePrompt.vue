<template>
  <div ref="container" class="reference-prompt">
    <div class="reference-prompt__editor">
      <div ref="highlight" class="reference-prompt__highlight" aria-hidden="true">
        <template v-for="(part, index) in parts" :key="index"
          ><span :class="part.kind ? `reference-prompt__token--${part.kind}` : ''">{{
            part.text
          }}</span></template
        >{{ '\n' }}
      </div>
      <textarea
        ref="input"
        :value="modelValue"
        :rows="rows"
        :maxlength="maxlength"
        :placeholder="placeholder"
        aria-label="提示词，输入 @ 引用已上传素材"
        role="combobox"
        aria-haspopup="listbox"
        :aria-expanded="menuOpen"
        :aria-controls="menuOpen ? menuId : undefined"
        :aria-activedescendant="menuOpen && matches.length ? `${menuId}-${active}` : undefined"
        aria-autocomplete="list"
        @input="onInput"
        @click="detect"
        @keyup="onKeyup"
        @keydown="onKeydown"
        @scroll="syncScroll"
        @blur="menuOpen = false"
        @compositionstart="onCompositionStart"
        @compositionend="onCompositionEnd"
      />
    </div>
    <div
      v-if="menuOpen"
      :id="menuId"
      ref="menu"
      class="reference-prompt__menu"
      role="listbox"
      aria-label="选择参考素材"
    >
      <button
        v-for="(asset, index) in matches"
        :id="`${menuId}-${index}`"
        :key="asset.label"
        type="button"
        role="option"
        :aria-selected="active === index"
        :class="{ active: active === index }"
        @mousedown.prevent
        @click="choose(asset)"
      >
        <img v-if="asset.kind === 'image'" :src="asset.url" alt="" />
        <VideoCameraOutlined v-else-if="asset.kind === 'video'" />
        <CustomerServiceOutlined v-else />
        <span>{{ asset.label }}</span>
      </button>
      <p v-if="!matches.length">{{ assets.length ? '没有匹配的素材' : '请先上传参考素材' }}</p>
    </div>
    <p class="reference-prompt__hint">输入 @ 引用已上传素材</p>
  </div>
</template>
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { VideoCameraOutlined, CustomerServiceOutlined } from '@ant-design/icons-vue'
import { remapReferenceMentions } from '@/lib/reference-mentions'
interface Props {
  modelValue: string
  images?: string[]
  videos?: string[]
  audios?: string[]
  rows?: number
  maxlength?: number
  placeholder?: string
}
interface Asset {
  label: string
  url: string
  kind: 'image' | 'video' | 'audio'
}
const props = withDefaults(defineProps<Props>(), {
  images: () => [],
  videos: () => [],
  audios: () => [],
  rows: 6,
  maxlength: 30000,
  placeholder: '描述想要生成的画面，输入 @ 引用素材',
})
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()
const input = ref<HTMLTextAreaElement | null>(null)
const highlight = ref<HTMLDivElement | null>(null)
const container = ref<HTMLDivElement | null>(null)
const menu = ref<HTMLDivElement | null>(null)
let resizeObserver: ResizeObserver | undefined
const composing = ref(false)
const menuOpen = ref(false)
const query = ref('')
const start = ref(-1)
const active = ref(0)
const menuId = `reference-mentions-${Math.random().toString(36).slice(2)}`
const assets = computed<Asset[]>(() => [
  ...props.images.map((url, index) => ({ url, label: `图片${index + 1}`, kind: 'image' as const })),
  ...props.videos.map((url, index) => ({ url, label: `视频${index + 1}`, kind: 'video' as const })),
  ...props.audios.map((url, index) => ({ url, label: `音频${index + 1}`, kind: 'audio' as const })),
])
const matches = computed(() => assets.value.filter((asset) => asset.label.includes(query.value)))
const parts = computed(() => {
  const result: { text: string; kind?: Asset['kind'] }[] = []
  let last = 0
  for (const match of props.modelValue.matchAll(/@(图片|视频|音频)\d+/g)) {
    const asset = assets.value.find((item) => item.label === match[0].slice(1))
    if (!asset) continue
    const index = match.index || 0
    result.push({ text: props.modelValue.slice(last, index) }, { text: match[0], kind: asset.kind })
    last = index + match[0].length
  }
  result.push({ text: props.modelValue.slice(last) })
  return result
})
watch(assets, (current, previous) => {
  const value = remapReferenceMentions(props.modelValue, previous, current)
  if (value !== props.modelValue) emit('update:modelValue', value)
  menuOpen.value = false
})
/** 直接测量高亮层中 @ 字符的位置，换行和滚动时与真实输入保持一致。 */
function positionMenu() {
  const layer = highlight.value,
    field = input.value,
    root = container.value,
    popup = menu.value
  if (!menuOpen.value || !layer || !field || !root || !popup || start.value < 0) return
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT)
  let remaining = start.value
  let node = walker.nextNode()
  while (node) {
    const length = node.textContent?.length || 0
    if (remaining < length) {
      const range = document.createRange()
      range.setStart(node, remaining)
      range.setEnd(node, remaining + 1)
      const anchor = range.getBoundingClientRect()
      const bounds = root.getBoundingClientRect()
      const fieldBounds = field.getBoundingClientRect()
      if (anchor.bottom < fieldBounds.top || anchor.top > fieldBounds.bottom) {
        menuOpen.value = false
        return
      }
      const left = Math.max(
        0,
        Math.min(anchor.left - bounds.left, root.clientWidth - popup.offsetWidth)
      )
      popup.style.setProperty('--mention-left', `${left}px`)
      popup.style.setProperty('--mention-top', `${anchor.bottom - bounds.top + 6}px`)
      return
    }
    remaining -= length
    node = walker.nextNode()
  }
}
function syncScroll() {
  if (highlight.value && input.value) highlight.value.scrollTop = input.value.scrollTop
  if (menuOpen.value) nextTick(positionMenu)
}
onMounted(() => {
  resizeObserver = new ResizeObserver(() => {
    if (menuOpen.value) positionMenu()
  })
  if (input.value) resizeObserver.observe(input.value)
})
onBeforeUnmount(() => resizeObserver?.disconnect())
function detect() {
  if (composing.value || !input.value) return
  const before = input.value.value.slice(0, input.value.selectionStart)
  const match = /[@＠]([^\s@＠]*)$/.exec(before)
  menuOpen.value = Boolean(match)
  start.value = match ? before.length - match[0].length : -1
  query.value = match?.[1] || ''
  active.value = 0
  if (menuOpen.value) nextTick(positionMenu)
}
function onInput(event: Event) {
  emit('update:modelValue', (event.target as HTMLTextAreaElement).value)
  detect()
  syncScroll()
}
function onCompositionStart() {
  composing.value = true
  menuOpen.value = false
}
function onCompositionEnd(event: CompositionEvent) {
  composing.value = false
  onInput(event)
}
function onKeyup(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(event.key)) detect()
}
async function choose(asset: Asset) {
  const element = input.value
  if (!element || start.value < 0) return
  const token = `@${asset.label} `
  const value =
    element.value.slice(0, start.value) + token + element.value.slice(element.selectionStart)
  if (value.length > props.maxlength) return
  const cursor = start.value + token.length
  emit('update:modelValue', value)
  menuOpen.value = false
  await nextTick()
  element.focus()
  element.setSelectionRange(cursor, cursor)
  syncScroll()
}
function onKeydown(event: KeyboardEvent) {
  if (composing.value || event.isComposing) return
  if (menuOpen.value) {
    if (event.key === 'Escape') {
      event.preventDefault()
      menuOpen.value = false
      return
    }
    if (matches.value.length && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
      event.preventDefault()
      if (event.key === 'Enter') {
        choose(matches.value[active.value])
        return
      }
      active.value =
        (active.value + (event.key === 'ArrowDown' ? 1 : -1) + matches.value.length) %
        matches.value.length
      nextTick(() =>
        document.getElementById(`${menuId}-${active.value}`)?.scrollIntoView({ block: 'nearest' })
      )
      return
    }
  }
  const element = input.value
  if (
    !element ||
    element.selectionStart !== element.selectionEnd ||
    !['Backspace', 'Delete'].includes(event.key)
  )
    return
  const cursor = element.selectionStart
  for (const match of element.value.matchAll(/@(图片|视频|音频)\d+/g)) {
    if (!assets.value.some((asset) => asset.label === match[0].slice(1))) continue
    const from = match.index || 0,
      to = from + match[0].length
    if (event.key === 'Backspace' ? cursor > from && cursor <= to : cursor >= from && cursor < to) {
      event.preventDefault()
      emit('update:modelValue', element.value.slice(0, from) + element.value.slice(to))
      nextTick(() => element.setSelectionRange(from, from))
      return
    }
  }
}
</script>
<style scoped lang="scss">
.reference-prompt {
  position: relative;
  &__editor {
    position: relative;
    background: var(--color-surface-1);
    border: 1px solid var(--color-border-whisper);
    border-radius: 10px;
    overflow: hidden;
    &:focus-within {
      border-color: var(--color-workbench-blue);
    }
  }
  textarea,
  &__highlight {
    width: 100%;
    padding: 10px 12px;
    font: inherit;
    font-size: 14px;
    line-height: 1.7;
    white-space: pre-wrap;
    overflow-wrap: break-word;
    word-break: break-word;
    box-sizing: border-box;
    tab-size: 4;
    scrollbar-gutter: stable;
  }
  textarea {
    position: relative;
    display: block;
    margin: 0;
    border: 0;
    outline: none;
    resize: none;
    background: transparent;
    color: transparent;
    -webkit-text-fill-color: transparent;
    caret-color: var(--color-ink-primary);
    &::placeholder {
      color: var(--color-ink-muted);
      -webkit-text-fill-color: var(--color-ink-muted);
    }
  }
  &__highlight {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    color: var(--color-ink-primary);
  }
  &__token--image {
    color: var(--color-success-mint);
    background: var(--color-surface-2);
    border-radius: 3px;
  }
  &__token--video {
    color: var(--color-workbench-blue);
    background: var(--color-proposal-blue-soft);
    border-radius: 3px;
  }
  &__token--audio {
    color: var(--color-warning-amber);
    background: var(--color-surface-2);
    border-radius: 3px;
  }
  &__hint {
    margin: 6px 0 0;
    color: var(--color-ink-muted);
    font-size: 12px;
  }
  &__menu {
    position: absolute;
    top: var(--mention-top, 0px);
    left: var(--mention-left, 0px);
    width: 240px;
    max-width: 100%;
    box-sizing: border-box;
    z-index: 40;
    max-height: 240px;
    overflow-y: auto;
    border: 1px solid var(--color-border-whisper);
    border-radius: 10px;
    background: var(--color-surface-0);
    box-shadow: var(--shadow-card);
    padding: 4px;
    button {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      min-height: 52px;
      padding: 6px 10px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      text-align: left;
      cursor: pointer;
      color: var(--color-ink-primary);
      &.active,
      &:hover {
        background: var(--color-surface-1);
      }
      > .anticon {
        width: 40px;
        flex-shrink: 0;
        font-size: 26px;
      }
      img {
        width: 40px;
        height: 40px;
        object-fit: cover;
        border-radius: 4px;
      }
    }
    p {
      margin: 8px;
      color: var(--color-ink-secondary);
    }
  }
}
</style>
