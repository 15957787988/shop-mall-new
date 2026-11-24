<template>
  <section class="showcases" aria-labelledby="showcases-title">
    <header class="showcases__heading">
      <h2 id="showcases-title">创作效果参考</h2>
      <span>AI 生成示例 · 点击图片查看完整组图</span>
    </header>
    <article v-for="group in groups" :key="group.path" class="showcases__row">
      <div class="showcases__intro">
        <h3>{{ group.title }}</h3>
        <p>{{ group.description }}</p>
        <router-link :to="{ path: group.path, query: { prompt: group.prompt } }"
          >创作同类作品 <ArrowRightOutlined
        /></router-link>
      </div>
      <div class="showcases__examples">
        <Image.PreviewGroup>
          <div class="showcases__cards">
            <Image
              v-for="item in group.items"
              :key="item.file"
              :src="imageAssetUrl(`showcases/${item.file}.png`)"
              :alt="`${group.title}示例：${item.label}`"
              loading="lazy"
            />
          </div>
        </Image.PreviewGroup>
      </div>
    </article>
  </section>
</template>
<script setup lang="ts">
import { imageAssetUrl } from '@/lib/image-assets'
import { Image } from 'ant-design-vue'
import { ArrowRightOutlined } from '@ant-design/icons-vue'
const groups = [
  {
    title: '商品套图',
    path: '/product-set',
    description: '从一件商品，展开多场景展示。',
    prompt: '为我的商品制作统一风格套图，包含主图、使用场景和材质细节，保持商品外观一致。',
    items: [
      { file: 'product-set-speaker', label: '便携音箱' },
      { file: 'product-set-kettle', label: '手冲电热壶' },
      { file: 'product-set-backpack', label: '帆布旅行背包' },
    ],
  },
  {
    title: '图片复刻',
    path: '/image-remix',
    description: '参考画面风格，换上你的商品。',
    prompt: '参考提供的画面构图、光影与配色，为我的商品重新创作，保持我的商品外观与材质。',
    items: [
      { file: 'remix-candle', label: '香薰蜡烛' },
      { file: 'remix-sneaker', label: '复古运动鞋' },
      { file: 'remix-plant', label: '绿植盆栽' },
    ],
  },
  {
    title: '产品精修',
    path: '/product-retouch',
    description: '整理光线与背景，呈现真实质感。',
    prompt: '保持商品形状、颜色和结构，清理杂乱背景，使用柔和棚拍光线呈现真实材质。',
    items: [
      { file: 'retouch-lamp', label: '橙色台灯前后对比' },
      { file: 'retouch-handbag', label: '皮革肩包前后对比' },
      { file: 'retouch-chair', label: '休闲椅前后对比' },
    ],
  },
  {
    title: 'A+ / 详情页',
    path: '/detail-page',
    description: '主视觉、使用场景与细节，连成一套。',
    prompt:
      '为商品制作统一视觉的详情页组图，包含真实使用场景、商品外观和可确认的结构细节，不编造功效与参数。',
    items: [
      { file: 'detail-pet-fountain', label: '宠物饮水机' },
      { file: 'detail-skincare', label: '护肤滴管瓶' },
      { file: 'detail-coffee-grinder', label: '手摇咖啡磨豆机' },
    ],
  },
  {
    title: '模特穿戴',
    path: '/virtual-try-on',
    description: '同一件服装，呈现不同姿态。',
    prompt:
      '为同一套服装生成多姿态穿戴展示，保持模特身份及服装版型、颜色和细节一致，变化姿态与景别。',
    items: [
      { file: 'wear-trench', label: '风衣穿搭' },
      { file: 'wear-sport', label: '运动夹克穿搭' },
      { file: 'wear-knit', label: '针织开衫穿搭' },
    ],
  },
  {
    title: '服装组图',
    path: '/fashion-set',
    description: '从整体版型，到面料与穿搭细节。',
    prompt: '为同一套服装制作全身穿搭、人台、面料特写与侧背面组图，保持版型、颜色和图案一致。',
    items: [
      { file: 'fashion-linen', label: '亚麻两件套' },
      { file: 'fashion-navy', label: '海军蓝套装' },
      { file: 'fashion-floral', label: '植物印花连衣裙' },
    ],
  },
]
</script>
<style scoped lang="scss">
.showcases {
  margin-top: 44px;
  &__heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 18px;
    h2 {
      margin: 0;
      font-size: 21px;
      font-weight: 650;
    }
    span {
      color: var(--color-ink-secondary);
      font-size: 12px;
    }
  }
  &__row {
    display: grid;
    grid-template-columns: 172px minmax(0, 1fr);
    gap: 24px;
    align-items: center;
    margin-bottom: 20px;
    padding: 24px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 22px;
    background: var(--color-surface-0);
  }
  &__intro {
    h3 {
      margin: 0 0 12px;
      font-size: 21px;
      font-weight: 650;
    }
    p {
      color: var(--color-ink-secondary);
      font-size: 13px;
      line-height: 1.8;
      margin: 0 0 22px;
    }
    a {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-height: 44px;
      padding: 8px 16px;
      border-radius: 24px;
      background: var(--color-ink-primary);
      color: var(--color-surface-0);
      font-size: 12px;
      transition: transform 0.2s;
      &:hover {
        transform: translateY(-2px);
      }
      &:focus-visible {
        outline: 2px solid var(--color-ink-primary);
        outline-offset: 3px;
      }
    }
  }
  &__examples {
    min-width: 0;
  }
  &__cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    :deep(.ant-image) {
      display: block;
      width: 100%;
      overflow: hidden;
      border: 1px solid var(--color-border-whisper);
      border-radius: 14px;
    }
    :deep(.ant-image-img) {
      display: block;
      width: 100%;
      aspect-ratio: 3 / 4;
      object-fit: contain;
      background: var(--color-surface-1);
    }
  }
  @media (max-width: 980px) {
    &__row {
      grid-template-columns: 1fr;
      gap: 18px;
    }
    &__intro {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      h3 {
        margin: 0;
      }
      p {
        display: none;
      }
    }
  }
  @media (max-width: 600px) {
    &__heading {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
    &__row {
      padding: 16px;
    }
    &__intro h3 {
      font-size: 18px;
    }
    &__cards {
      display: flex;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding-bottom: 8px;
      :deep(.ant-image) {
        flex: 0 0 82%;
        scroll-snap-align: start;
      }
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &__intro a {
      transition: none;
    }
  }
}
</style>
