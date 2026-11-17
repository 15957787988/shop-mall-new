<template>
  <section class="tool-catalog">
    <header>
      <div>
        <h2>为你的商品，找到合适的创作方式</h2>
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
      <router-link v-for="tool in visibleTools" :key="tool.code" :to="tool.href" class="tool-card"
        ><div :class="['tool-card__visual', `tool-card__visual--${tool.tone}`]">
          <img :src="`/images/design-preview/${tool.cover}.jpg`" alt="" loading="lazy" /><span
            class="tool-card__icon"
            ><component :is="icons[tool.icon]" /></span
          ><span class="tool-card__media">{{ tool.media }}创作</span>
        </div>
        <div class="tool-card__body">
          <h3>{{ tool.name }}<ArrowUpOutlined /></h3>
          <p>{{ tool.description }}</p>
        </div></router-link
      >
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { AppstoreOutlined, ArrowUpOutlined, CopyOutlined, LayoutOutlined, PictureOutlined, PlayCircleOutlined, SkinOutlined, UserOutlined, VideoCameraOutlined } from '@ant-design/icons-vue'
import { creationTools } from '@/lib/creation/catalog'
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
    height: clamp(144px, 13vw, 206px);
    overflow: hidden;
    background: var(--color-surface-1);
    img {
      position: absolute;
      right: -5%;
      top: 13%;
      width: 65%;
      height: 112%;
      object-fit: cover;
      border-radius: 12px;
      transform: rotate(-8deg);
      transition: transform 0.25s;
    }
  }
  &:hover img {
    transform: rotate(-4deg) scale(1.04);
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
