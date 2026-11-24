<template>
  <div class="workbench-home">
    <section class="home-hero">
      <h1>电商图片与视频，<span>一站创作。</span></h1>
      <p class="home-hero__description">从商品原图，到主图、详情页与带货视频。</p>
      <div class="home-composer-shell">
        <div class="home-composer__modes" aria-label="创作方式">
          <button
            v-for="item in modes"
            :key="item.path"
            type="button"
            :class="{ active: mode === item.path }"
            :aria-pressed="mode === item.path"
            @click="mode = item.path"
          >
            <component :is="item.icon" />{{ item.label }}
          </button>
        </div>
        <form class="home-composer" @submit.prevent="startCreation">
          <label for="home-creative-prompt" class="home-composer__label">创作需求</label>
          <div class="home-composer__body">
            <router-link
              class="home-composer__upload"
              :to="{ path: mode, query: draft.trim() ? { prompt: draft.trim() } : {} }"
              aria-label="添加商品素材"
              title="添加商品素材"
              ><PlusOutlined
            /></router-link>
            <textarea
              id="home-creative-prompt"
              v-model="draft"
              maxlength="1000"
              aria-label="创作需求"
              placeholder="描述你想创作的内容，比如：为咖啡机制作一组温暖自然的商品图…"
            />
          </div>
          <div class="home-composer__footer">
            <router-link
              class="home-composer__material-link"
              :to="{ path: mode, query: draft.trim() ? { prompt: draft.trim() } : {} }"
              >添加商品素材<ArrowRightOutlined
            /></router-link>
            <button type="submit">开始创作<ArrowRightOutlined /></button>
          </div>
        </form>
      </div>
    </section>
    <ToolCatalog title="热门工具" :image-overrides="toolImages" showcase />
    <HomeShowcases />
    <HomeExplore />
  </div>
</template>
<script setup lang="ts">
import { imageAssetUrl } from '@/lib/image-assets'
import { ref } from 'vue'
import HomeShowcases from './HomeShowcases.vue'
import { useRouter } from 'vue-router'
import {
  ArrowRightOutlined,
  CopyOutlined,
  PlusOutlined,
  PictureOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons-vue'
import ToolCatalog from '@/components/tools/ToolCatalog.vue'
import HomeExplore from './HomeExplore.vue'
const router = useRouter()
const draft = ref('')
const mode = ref('/image')
const modes = [
  { label: '图片创作', path: '/image', icon: PictureOutlined },
  { label: '视频创作', path: '/product-video', icon: VideoCameraOutlined },
  { label: '图片复刻', path: '/image-remix', icon: CopyOutlined },
]
const toolImages: Record<string, string> = {
  'detail-page': imageAssetUrl('creation-demo/detail.png'),
  'image-remix': imageAssetUrl('creation-demo/remix.png'),
  'virtual-try-on': imageAssetUrl('creation-demo/wear.png'),
  'fashion-set': imageAssetUrl('creation-demo/fashion.png'),
}
function startCreation() {
  router.push({ path: mode.value, query: draft.value.trim() ? { prompt: draft.value.trim() } : {} })
}
</script>
<style scoped lang="scss">
.workbench-home {
  max-inline-size: 1560px;
  margin-inline: auto;
  padding: 32px clamp(20px, 3.8vw, 64px) 48px;
  color: var(--color-ink-primary);
}
.home-hero {
  position: relative;
  isolation: isolate;
  max-inline-size: 1000px;
  margin: 0 auto 64px;
  padding-block: 32px 24px;
  text-align: center;
  animation: fade-up 0.45s var(--motion-ease) both;
  &::before {
    content: '';
    position: absolute;
    z-index: -1;
    inset: -32px -7vw -16px;
    border-radius: 48px;
    background: radial-gradient(circle, var(--color-workbench-dot) 1px, transparent 1.2px) 0 0 /
        22px 22px,
      linear-gradient(140deg, var(--color-workbench-tint), transparent 70%);
    mask-image: linear-gradient(to bottom, var(--color-ink-primary), transparent);
    pointer-events: none;
  }
  h1 {
    margin: 0;
    font-size: clamp(1.875rem, 1rem + 2.6vw, 3.375rem);
    font-weight: 700;
    letter-spacing: -0.045em;
    line-height: 1.35;
  }
  h1 span {
    position: relative;
    display: inline-block;
    color: var(--color-workbench-blue);
    background: linear-gradient(110deg, var(--color-workbench-blue), var(--color-workbench-cyan));
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }
  h1 span::after {
    content: '';
    position: absolute;
    inset: auto 2px -9px;
    block-size: 5px;
    border-radius: 50%;
    background: linear-gradient(90deg, var(--color-workbench-cyan), var(--color-workbench-blue));
    transform: rotate(-2deg);
    opacity: 0.75;
  }
  &__description {
    margin: 24px 0 40px;
    font-size: 15px;
    line-height: 1.8;
    color: var(--color-ink-secondary);
  }
}
.home-composer-shell {
  text-align: start;
}
.home-composer {
  position: relative;
  padding: 24px;
  border: 1px solid var(--color-workbench-line);
  border-radius: 0 28px 28px;
  background: var(--color-surface-0);
  box-shadow: var(--shadow-workbench);
  transition: border-color 0.2s, box-shadow 0.2s;
  &:focus-within {
    border-color: var(--color-workbench-blue);
  }
  &__modes {
    display: flex;
    align-items: stretch;
    gap: 6px;
    padding-inline-start: 0;
    margin-block-end: -1px;
  }
  &__modes button {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    min-block-size: 52px;
    padding: 12px 28px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 20px 20px 0 0;
    background: var(--color-surface-1);
    color: var(--color-ink-secondary);
    cursor: pointer;
    font-size: 15px;
    transition: color 0.2s, background 0.2s;
  }
  &__modes button:hover {
    color: var(--color-workbench-blue);
    background: var(--color-workbench-tint);
  }
  &__modes button.active {
    z-index: 1;
    color: var(--color-workbench-blue);
    border-color: var(--color-workbench-line);
    border-block-end-color: var(--color-surface-0);
    background: var(--color-surface-0);
    font-weight: 600;
  }
  &__modes .active::after {
    content: '';
    position: absolute;
    inset: auto 36% 6px;
    block-size: 3px;
    border-radius: 50%;
    background: var(--color-workbench-cyan);
  }
  &__body {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    min-inline-size: 0;
  }
  &__upload {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    inline-size: 56px;
    block-size: 72px;
    margin-block-start: 4px;
    border: 1px dashed var(--color-workbench-line);
    border-radius: 14px;
    background: var(--color-workbench-tint);
    color: var(--color-workbench-blue);
    font-size: 25px;
    transition: border-color 0.2s, background 0.2s;
  }
  &__upload:hover {
    border-color: var(--color-workbench-blue);
    background: var(--color-surface-0);
  }
  textarea {
    flex: 1;
    min-inline-size: 0;
    inline-size: 100%;
    min-block-size: 128px;
    max-block-size: 280px;
    resize: vertical;
    padding: 8px 0;
    border: 0;
    background: transparent;
    color: var(--color-ink-primary);
    font: inherit;
    font-size: 16px;
    line-height: 1.8;
  }
  textarea:focus {
    outline: none;
  }
  textarea::placeholder {
    color: var(--color-ink-muted);
  }
  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 16px;
    margin-block-start: 16px;
  }
  &__material-link {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-block-size: 44px;
    padding: 8px 14px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 999px;
    font-size: 13px;
    color: var(--color-ink-secondary);
    transition: color 0.2s, border-color 0.2s;
  }
  &__material-link:hover {
    color: var(--color-workbench-blue);
    border-color: var(--color-workbench-line);
  }
  &__footer button {
    display: flex;
    align-items: center;
    gap: 24px;
    min-block-size: 44px;
    padding: 10px 24px;
    border: 0;
    border-radius: 999px;
    color: var(--color-on-media);
    background: var(--color-workbench-blue);
    font: inherit;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: filter 0.2s, transform 0.2s;
  }
  &__footer button:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }
  &__footer button:active {
    transform: translateY(1px);
  }
}
.workbench-home :deep(.tool-catalog header) {
  margin-block-end: 18px;
}
.workbench-home :deep(.tool-catalog h2) {
  font-size: 21px;
  margin: 0;
}
.workbench-home :deep(.tool-catalog header p) {
  display: none;
}
.workbench-home :deep(.tool-catalog__grid) {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}
@media (max-width: 1450px) {
  .workbench-home :deep(.tool-catalog__grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 1100px) {
  .workbench-home :deep(.tool-catalog__grid) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .workbench-home {
    padding: 24px 16px 36px;
  }
  .home-hero {
    padding-block: 16px;
    margin-block-end: 40px;
  }
  .home-hero h1 span {
    display: block;
  }
  .home-hero__description {
    margin-block: 20px 28px;
  }
  .home-hero__description {
    font-size: 13px;
  }
  .home-composer {
    padding: 18px 16px;
    border-radius: 0 20px 20px;
  }
  .home-composer__body {
    gap: 12px;
  }
  .home-composer__upload {
    inline-size: 40px;
    block-size: 56px;
    font-size: 22px;
  }
  .home-composer textarea {
    font-size: 14px;
    min-block-size: 130px;
  }
  .home-composer__modes {
    gap: 4px;
  }
  .home-composer__modes button {
    flex: 1;
    min-inline-size: 0;
    padding: 10px 8px;
    font-size: 12px;
    gap: 5px;
    border-radius: 14px 14px 0 0;
  }
  .home-composer__footer button {
    gap: 10px;
    padding-inline: 14px;
  }
  .workbench-home :deep(.tool-catalog header) {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }
  .workbench-home :deep(.tool-catalog__filters button) {
    padding-inline: 10px;
    min-block-size: 36px;
  }
  .workbench-home :deep(.tool-catalog__grid) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .home-hero {
    animation: none;
  }
  *,
  *::before,
  *::after {
    transition: none !important;
  }
}
</style>
