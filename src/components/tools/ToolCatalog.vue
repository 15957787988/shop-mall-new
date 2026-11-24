<template>
  <section :class="['tool-catalog', { 'tool-catalog--showcase': showcase }]">
    <header>
      <div>
        <h2>{{ title }}</h2>
        <p>图片、视频与品牌内容，从这里开始。</p>
      </div>
      <div class="tool-catalog__filters" aria-label="工具类型">
        <button
          v-for="option in filters"
          :key="option"
          type="button"
          :class="{ active: filter === option }"
          :aria-pressed="filter === option"
          @click="filter = option"
        >
          {{ option }}
        </button>
      </div>
    </header>
    <div class="tool-catalog__grid">
      <router-link
        v-for="tool in visibleTools"
        :key="tool.code"
        :to="tool.href"
        :class="['tool-card', `tool-card--${tool.tone}`, `tool-card--${tool.code}`]"
      >
        <template v-if="showcase">
          <div class="tool-card__intro">
            <span class="tool-card__symbol"><component :is="icons[tool.icon]" /></span>
            <h3>{{ tool.name }}</h3>
            <p>{{ shortDescriptions[tool.code] || tool.description }}</p>
          </div>
          <div class="tool-card__comparison" aria-hidden="true">
            <div class="tool-card__before">
              <img :src="coverUrl(tool)" alt="" loading="lazy" /><span>素材</span>
            </div>
            <ArrowRightOutlined class="tool-card__flow" />
            <div class="tool-card__after">
              <img :src="coverUrl(tool)" alt="" loading="lazy" />
              <PlayCircleOutlined v-if="tool.media === '视频'" class="tool-card__play" />
              <span>{{ tool.media === '视频' ? '视频创作' : '效果示例' }}</span>
            </div>
          </div>
        </template>
        <template v-else>
          <div :class="['tool-card__visual', `tool-card__visual--${tool.tone}`]">
            <img :src="coverUrl(tool)" alt="" loading="lazy" />
            <span class="tool-card__icon"><component :is="icons[tool.icon]" /></span>
            <span class="tool-card__media">{{ tool.media }}创作</span>
          </div>
          <div class="tool-card__body">
            <h3>{{ tool.name }}<ArrowUpOutlined /></h3>
            <p>{{ tool.description }}</p>
          </div>
        </template>
      </router-link>
    </div>
  </section>
</template>
<script setup lang="ts">
import { imageAssetUrl } from '@/lib/image-assets'
import { computed, ref, type Component } from 'vue'
import { AppstoreOutlined, ArrowRightOutlined, ArrowUpOutlined, CopyOutlined, LayoutOutlined, PictureOutlined, PlayCircleOutlined, SkinOutlined, UserOutlined, VideoCameraOutlined } from '@ant-design/icons-vue'
import { creationTools } from '@/lib/creation/catalog'
interface Props { title?: string; imageOverrides?: Record<string, string>; showcase?: boolean }
const props = withDefaults(defineProps<Props>(), { title: '为你的商品，找到合适的创作方式' })
const shortDescriptions: Record<string, string> = {
  'product-set': '一张商品图，生成整套展示',
  'detail-page': '主视觉、卖点与细节，一套完成',
  'image-remix': '参考喜欢的画面，换上你的商品',
  'video-remix': '参考原片，演绎新的内容',
  'product-video': '让商品动起来，展示真实卖点',
  'product-retouch': '优化光线与背景，呈现商品质感',
  'virtual-try-on': '同一套搭配，多种穿戴姿态',
  'fashion-set': '从服装原图，到细节与穿搭',
}
function coverUrl(tool: { code: string; cover: string }) {
  return imageAssetUrl(props.imageOverrides?.[tool.code] || (tool.cover.startsWith('/') ? tool.cover : `/images/design-preview/${tool.cover}.jpg`))
}
const filters = ['全部', '图片', '视频']
const filter = ref('全部')
const visibleTools = computed(() => creationTools.filter(tool => filter.value === '全部' || tool.media === filter.value))
const icons: Record<string, Component> = { picture: PictureOutlined, layout: LayoutOutlined, copy: CopyOutlined, video: VideoCameraOutlined, play: PlayCircleOutlined, magic: SkinOutlined, person: UserOutlined, grid: AppstoreOutlined }
</script>
<style scoped lang="scss">
.tool-catalog {
  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    margin-bottom: 24px;
  }
  h2 {
    margin: 0 0 8px;
    font-size: 22px;
    font-weight: 650;
    letter-spacing: -0.03em;
  }
  header p {
    margin: 0;
    color: var(--color-ink-secondary);
    font-size: 14px;
  }
  &__filters {
    display: flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 10px;
    background: var(--color-surface-0);
    flex-shrink: 0;
    button {
      border: 0;
      background: transparent;
      color: var(--color-ink-secondary);
      border-radius: 7px;
      padding: 7px 16px;
      cursor: pointer;
    }
    .active {
      color: var(--color-creative-violet);
      background: var(--color-accent-soft);
      font-weight: 600;
    }
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 22px;
  }
}
.tool-card {
  overflow: hidden;
  border: 1px solid var(--color-border-whisper);
  background: var(--color-surface-0);
  color: var(--color-ink-primary);
  border-radius: 18px;
  transition: transform 0.2s, box-shadow 0.2s;
  text-decoration: none;
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-card);
  }
  &__visual {
    position: relative;
    aspect-ratio: 16 / 11;
    overflow: hidden;
    background: var(--color-surface-1);
    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }
  &__visual--mint {
    background: var(--color-surface-2);
  }
  &__visual--peach,
  &__visual--rose {
    background: var(--color-surface-1);
  }
  &__visual--lavender {
    background: var(--color-accent-soft);
  }
  &__visual--cream {
    background: var(--color-surface-1);
  }
  &__icon,
  &__media {
    display: none;
  }
  &__icon {
    position: absolute;
    left: 22px;
    top: 25px;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    background: var(--color-surface-0);
    border-radius: 12px;
    font-size: 23px;
  }
  &__media {
    position: absolute;
    left: 22px;
    bottom: 22px;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-ink-secondary);
  }
  &__body {
    padding: 20px 22px 22px;
    h3 {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: 0 0 9px;
      font-size: 17px;
      font-weight: 650;
      .anticon {
        transform: rotate(45deg);
        color: var(--color-ink-muted);
        font-size: 15px;
      }
    }
    p {
      margin: 0;
      color: var(--color-ink-secondary);
      line-height: 1.7;
      font-size: 13px;
    }
  }
}
@media (max-width: 1250px) {
  .tool-catalog__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 980px) {
  .tool-catalog__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 600px) {
  .tool-catalog header {
    align-items: flex-start;
    flex-direction: column;
  }
  .tool-catalog h2 {
    font-size: 20px;
  }
  .tool-catalog__grid {
    gap: 12px;
  }
  .tool-card__body {
    padding: 15px;
  }
  .tool-card__icon {
    left: 15px;
    top: 18px;
    width: 36px;
    height: 36px;
    font-size: 19px;
  }
  .tool-card__media {
    left: 15px;
    bottom: 15px;
  }
}
</style>

<style scoped lang="scss">
.tool-catalog--showcase {
  .tool-card {
    position: relative;
    display: grid;
    grid-template-columns: 36% minmax(0, 1fr);
    align-items: center;
    min-height: 204px;
    padding: 20px 14px 20px 20px;
    border-radius: 22px;
    background: linear-gradient(115deg, var(--color-surface-2), var(--color-surface-0) 80%);
    &:hover {
      transform: translateY(-2px);
      border-color: var(--color-ink-muted);
    }
    &:focus-visible {
      outline: 2px solid var(--color-ink-primary);
      outline-offset: 3px;
    }
    &--peach,
    &--rose {
      background: linear-gradient(115deg, var(--color-surface-1), var(--color-surface-0));
    }
    &--cream {
      background: linear-gradient(115deg, var(--color-surface-2), var(--color-surface-0));
    }
  }
  .tool-card__intro {
    position: relative;
    z-index: 1;
    min-width: 0;
  }
  .tool-card__symbol {
    display: grid;
    place-items: center;
    width: 38px;
    height: 38px;
    background: var(--color-surface-0);
    border-radius: 12px;
    font-size: 21px;
    margin-bottom: 14px;
  }
  h3 {
    margin: 0 0 6px;
    font-size: 17px;
    font-weight: 650;
  }
  .tool-card__intro p {
    margin: 0;
    max-width: 12em;
    font-size: 12px;
    line-height: 1.65;
    color: var(--color-ink-secondary);
  }
  .tool-card__comparison {
    display: grid;
    grid-template-columns: 26% 13% minmax(0, 1fr);
    align-items: center;
    min-width: 0;
    gap: 4px;
  }
  .tool-card__before,
  .tool-card__after {
    position: relative;
    overflow: hidden;
    border-radius: 12px;
    background: var(--color-surface-0);
  }
  .tool-card__before {
    height: 88px;
    align-self: end;
    margin-bottom: 13px;
  }
  .tool-card__after {
    height: 164px;
    box-shadow: var(--shadow-card);
  }
  .tool-card__comparison img {
    width: 100%;
    height: 100%;
    display: block;
  }
  .tool-card__before img {
    object-fit: cover;
    object-position: left center;
  }
  .tool-card__after img {
    object-fit: cover;
    object-position: right center;
  }
  .tool-card__comparison span:not(.anticon) {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 3px 2px;
    font-size: 9px;
    text-align: center;
    color: var(--color-ink-secondary);
    background: var(--color-surface-0);
  }
  .tool-card--product-retouch .tool-card__before img,
  .tool-card--product-video .tool-card__before img {
    object-fit: contain;
    object-position: center;
  }
  .tool-card__flow {
    font-size: 21px;
    color: var(--color-ink-muted);
  }
  .tool-card__play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 30px;
    color: var(--color-surface-0);
    background: var(--color-ink-primary);
    border-radius: 50%;
  }
  @media (max-width: 600px) {
    .tool-card {
      min-height: 170px;
    }
  }
}
</style>
