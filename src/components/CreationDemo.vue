<template>
  <section class="creation-demo" aria-label="功能效果示例">
    <header class="creation-demo__heading">
      <span class="creation-demo__eyebrow">灵感预览 · AI 生成示例</span>
      <h2>{{ demo.title }}</h2>
      <p>{{ demo.description }}</p>
    </header>
    <div class="creation-demo__showcase">
      <div class="creation-demo__caption">
        <h3>{{ demo.caption }}</h3>
        <span>{{
          ['video-remix', 'video', 'product-video'].includes(tool || '')
            ? '静态画面示例'
            : '效果示例'
        }}</span>
      </div>
      <div v-if="showDemoImage" class="creation-demo__image">
        <img :src="imageAssetUrl(`creation-demo/${demo.asset}.png`)" :alt="demo.alt" />
      </div>
      <div
        v-if="demo.labels.length"
        class="creation-demo__labels"
        :class="{ 'creation-demo__labels--three': demo.labels.length === 3 }"
      >
        <span v-for="label in demo.labels" :key="label">{{ label }}</span>
      </div>
    </div>
    <p class="creation-demo__hint">
      上传你的素材，开始创作。以上为功能展示示例，实际效果以生成结果为准。
    </p>
    <button v-if="!isLoggedIn" class="creation-demo__login" type="button" @click="openLogin()">
      登录并开始创作 <span aria-hidden="true">↗</span>
    </button>
  </section>
</template>
<script setup lang="ts">
import { imageAssetUrl } from '@/lib/image-assets'
import { computed } from 'vue'
import { useAuth } from '@/composables/useAuth'
interface Props {
  tool?: string
}
const props = defineProps<Props>()
const { isLoggedIn, openLogin } = useAuth()
const showDemoImage = computed(() => props.tool !== 'product-retouch')
const demos = {
  'product-set': {
    title: 'AI 商品套图',
    description: '上传商品原图，生成主图、卖点解析、细节特写和商品规格，让商品展示更完整。',
    caption: '从商品原图，到一套完整视觉',
    asset: 'product-set-coffee',
    alt: '奶油白咖啡机商品原图，以及主图、卖点解析、细节特写和商品规格四张套图示例',
    labels: [],
  },
  image: {
    title: 'AI 生图',
    description: '描述你想象中的画面，让灵感成为看得见的作品。',
    caption: '探索产品质感、光线与场景的更多可能',
    asset: 'remix',
    alt: '三种配色与环境下的原创包袋创意摄影示例',
    labels: ['创意画面', '产品质感', '场景表达'],
  },
  video: {
    title: 'AI 视频',
    description: '从文字或参考素材出发，创作你的视频画面。',
    caption: '从视觉灵感，开始构思你的镜头',
    asset: 'remix',
    alt: '包袋创意摄影的静态视频视觉方向示例',
    labels: ['视觉方向', '主体展示', '场景氛围'],
  },
  'product-video': {
    title: 'AI 带货视频',
    description: '上传商品素材，描述卖点，开始创作你的商品短片。',
    caption: '用镜头展现商品质感与场景',
    asset: 'remix',
    alt: '包袋带货视频的静态视觉方向示例',
    labels: ['商品展示', '质感镜头', '使用场景'],
  },
  'image-remix': {
    title: '爆款图复刻',
    description: '上传商品原图与参考图，用你的商品重新演绎喜欢的视觉风格。',
    caption: '从参考灵感，到你的品牌画面',
    asset: 'remix',
    alt: '原创包袋示例：参考构图、替换商品与重新演绎的场景',
    labels: ['参考画面', '高度复刻', '参考风格'],
  },
  'detail-page': {
    title: 'A+ 详情页',
    description: '从一件商品出发，展开主视觉、细节与使用场景的完整表达。',
    caption: '一套视觉语言，讲清商品亮点',
    asset: 'detail',
    alt: '白色游戏手柄的商品原图与蓝色主题详情页展示',
    labels: ['商品原图', '主视觉与细节', '使用场景与更多角度'],
  },
  'virtual-try-on': {
    title: 'AI 模特穿戴',
    description: '锁定同一人物与整套搭配，让姿势、景别与场景自然变化。',
    caption: '一件服装，呈现不同镜头下的风格',
    asset: 'wear',
    alt: '橙色大衣与同一模特的三种穿戴姿势',
    labels: ['服装原图', '全身穿搭', '姿势变化', '近景展示'],
  },
  'fashion-set': {
    title: 'AI 服装组图',
    description: '把服装原图转化为人台展示、细节特写与模特穿搭。',
    caption: '看见版型，也看见设计细节',
    asset: 'fashion',
    alt: '粉色条纹衬衫与棕色半裙的原图、人台、细节和穿搭示例',
    labels: ['商品原图', '人台展示', '细节特写', '模特穿搭'],
  },
  'video-remix': {
    title: 'AI 视频复刻',
    description: '上传参考视频与商品素材，用新的商品演绎参考画面的视觉风格。',
    caption: '保留画面灵感，换上你的商品',
    asset: 'remix',
    alt: '包袋广告参考画面与商品替换的静态示例',
    labels: ['参考画面', '替换商品', '风格演绎'],
  },
}
const demo = computed(() => demos[props.tool as keyof typeof demos] || demos['image-remix'])
</script>
<style scoped lang="scss">
.creation-demo {
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  color: var(--color-ink-primary);
  &__heading {
    text-align: center;
    margin-bottom: 16px;
  }
  &__eyebrow {
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--color-ink-muted);
  }
  h2 {
    margin: 8px 0;
    font-size: clamp(24px, 2.6vw, 36px);
    font-weight: 650;
    line-height: 1.25;
    letter-spacing: -0.04em;
  }
  &__heading p {
    margin: 0;
    font-size: 14px;
    line-height: 1.8;
    color: var(--color-ink-secondary);
  }
  &__showcase {
    padding: clamp(12px, 1.5vw, 20px);
    border-radius: 28px;
    background: var(--color-surface-1);
  }
  &__caption {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  h3 {
    margin: 0;
    font-size: clamp(14px, 1.6vw, 20px);
    font-weight: 600;
  }
  &__caption > span {
    flex-shrink: 0;
    color: var(--color-ink-muted);
    font-size: 11px;
  }
  &__image {
    overflow: hidden;
    border-radius: 18px;
    background: var(--color-surface-0);
  }
  img {
    display: block;
    width: 100%;
    height: auto;
  }
  &__labels {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    padding-top: 10px;
    text-align: center;
    font-size: 12px;
    color: var(--color-ink-secondary);
  }
  &__labels--three {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  &__hint {
    margin: 12px 0 0;
    text-align: center;
    color: var(--color-ink-muted);
    font-size: 12px;
    line-height: 1.8;
  }
  &__login {
    display: block;
    margin: 10px auto 0;
    padding: 10px 18px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 999px;
    background: var(--color-surface-0);
    color: var(--color-ink-primary);
    cursor: pointer;
  }
  @media (min-width: 961px) and (min-height: 601px) {
    // 使用工作区可用高度分配图片空间，始终完整显示，避免图片自然高度撑出首屏。
    display: flex;
    flex-direction: column;
    height: calc(100dvh - var(--app-header-height) - 2 * var(--creation-pane-padding, 20px));
    min-height: 0;
    box-sizing: border-box;
    &__heading,
    &__hint,
    &__login {
      flex-shrink: 0;
    }
    &__showcase {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
    }
    &__caption,
    &__labels {
      flex-shrink: 0;
    }
    &__image {
      flex: 1;
      min-height: 0;
    }
    img {
      height: 100%;
      object-fit: contain;
    }
  }
  @media (max-width: 600px) {
    &__caption {
      align-items: flex-start;
    }
    &__labels {
      font-size: 10px;
    }
    &__heading p {
      font-size: 12px;
    }
  }
}
</style>
