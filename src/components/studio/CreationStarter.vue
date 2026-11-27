<template>
  <section class="creation-starter" aria-label="开始创作">
    <header>
      <span class="creation-starter__eyebrow">你的创作空间</span>
      <h2>{{ video ? '让商品动起来' : '把想法变成第一张作品' }}</h2>
      <p>
        {{
          video
            ? '上传商品图，描述动作与运镜。生成的视频会出现在这里。'
            : '写下画面描述，也可以添加参考图。生成的图片会出现在这里。'
        }}
      </p>
    </header>
    <div class="creation-starter__intro">
      <h3>{{ video ? '从一个镜头开始' : '没有头绪？从这些方向开始' }}</h3>
      <span>{{ video ? '镜头灵感 · 静态示意' : '画面灵感' }}</span>
    </div>
    <div class="creation-starter__grid">
      <article v-for="example in examples" :key="example.title" class="creation-starter__card">
        <img :src="imageAssetUrl(`design-preview/${example.cover}.jpg`)" :alt="example.alt" />
        <div class="creation-starter__overlay">
          <h4>{{ example.title }}</h4>
          <button type="button" @click="emit('use-prompt', example.prompt)">
            使用这段提示词 <ArrowUpOutlined aria-hidden="true" />
          </button>
        </div>
      </article>
    </div>
    <div class="creation-starter__steps" aria-label="创作步骤">
      <span><b>01</b>{{ video ? '上传商品图' : '描述画面或添加参考图' }}</span>
      <span><b>02</b>{{ video ? '描述动作与镜头' : '选择模型与画幅' }}</span>
      <span><b>03</b>点击生成，查看作品</span>
    </div>
    <p class="creation-starter__note">点击示例只会填入提示词，你可以修改后再生成。</p>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { ArrowUpOutlined } from '@ant-design/icons-vue'
import { imageAssetUrl } from '@/lib/image-assets'
interface Props {
  kind: 'image' | 'video'
}
const props = defineProps<Props>()
const emit = defineEmits<{ (event: 'use-prompt', prompt: string): void }>()
const video = computed(() => props.kind === 'video')
const examples = computed(() =>
  video.value
    ? [
        {
          title: '光影中的商品',
          cover: 'perfume',
          alt: '香水商品的光影示意',
          prompt:
            '以参考图中的商品为主体，保持外观、颜色和标识一致。镜头缓慢推近，自然侧光扫过商品表面，呈现真实材质与细节。背景简洁，结尾完整展示商品，不添加字幕或虚构卖点。',
        },
        {
          title: '细节慢镜头',
          cover: 'shoe',
          alt: '鞋履商品的材质示意',
          prompt:
            '围绕参考图中的商品拍摄细节展示视频，保持商品结构与材质一致。镜头从可见的材质细节缓慢后拉至商品全貌，柔和商业布光，画面稳定、动作连贯，不新增参考图中不存在的结构。',
        },
        {
          title: '日常里的商品',
          cover: 'skincare',
          alt: '护肤商品的场景示意',
          prompt:
            '将参考图中的商品放在窗边桌面，保持原有外观与标识。晨间自然光，镜头缓慢横移，轻微景深变化，最后停留在清晰完整的商品画面。不添加文字或功效承诺。',
        },
      ]
    : [
        {
          title: '清透商品摄影',
          cover: 'skincare',
          alt: '护肤商品摄影的画面示意',
          prompt:
            '拍摄一张护肤品商业摄影：浅色瓶身放置在干净的石质台面上，窗边柔和自然光，背景清透，细腻的玻璃质感，构图简洁，主体完整，不添加文字或水印。',
        },
        {
          title: '自然光人像',
          cover: 'fashion',
          alt: '自然光时尚人像的画面示意',
          prompt:
            '一张自然光时尚人像，人物穿着简洁的日常服装，站在明亮的街角，自然放松的姿态，真实皮肤与衣料纹理，柔和色调，杂志摄影风格，不添加文字。',
        },
        {
          title: '质感静物',
          cover: 'perfume',
          alt: '香水静物摄影的画面示意',
          prompt:
            '一瓶琥珀色香水置于温暖的石台上，斜射的阳光形成清晰而柔和的阴影，通透玻璃、细腻反射，暖色背景，近景静物摄影，保留呼吸感，不添加文字或水印。',
        },
      ]
)
</script>
<style scoped lang="scss">
.creation-starter {
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: clamp(20px, 4vw, 56px) 0 24px;
  color: var(--color-ink-primary);
  &__eyebrow {
    color: var(--color-ink-muted);
    font-size: 12px;
  }
  h2 {
    margin: 12px 0;
    font-size: clamp(24px, 2.5vw, 36px);
    font-weight: 650;
    letter-spacing: -0.03em;
    line-height: 1.3;
  }
  header > p {
    margin: 0;
    color: var(--color-ink-secondary);
    line-height: 1.8;
    font-size: 14px;
  }
  &__intro {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin: 36px 0 16px;
    h3 {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
    }
    > span {
      color: var(--color-ink-muted);
      font-size: 12px;
    }
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }
  &__card {
    position: relative;
    min-width: 0;
    overflow: clip;
    border-radius: 16px;
    background: var(--color-surface-2);
    transition: transform 0.2s;
    &:hover {
      transform: translateY(-2px);
    }
    img {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 5;
      max-height: 340px;
      object-fit: cover;
      transition: transform 0.2s;
    }
    &:hover img {
      transform: scale(1.025);
    }
  }
  &__overlay {
    position: absolute;
    inset: auto 0 0;
    padding: 16px;
    background: var(--color-media-veil);
    color: var(--color-on-media);
    h4 {
      margin: 0 0 10px;
      font-size: 17px;
      color: inherit;
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 44px;
      width: 100%;
      padding: 8px 12px;
      border: 1px solid var(--color-border-whisper);
      border-radius: 8px;
      background: var(--color-surface-0);
      color: var(--color-ink-primary);
      font: inherit;
      font-size: 12px;
      cursor: pointer;
      transition: transform 0.15s;
      &:active {
        transform: scale(0.98);
      }
      .anticon {
        transform: rotate(45deg);
      }
    }
  }
  &__steps {
    display: flex;
    flex-wrap: wrap;
    gap: 16px 28px;
    margin-top: 28px;
    color: var(--color-ink-secondary);
    font-size: 12px;
    b {
      margin-right: 8px;
      color: var(--color-ink-muted);
      font-weight: 500;
    }
  }
  &__note {
    margin: 16px 0 0;
    font-size: 12px;
    color: var(--color-ink-muted);
  }
  @media (max-width: 700px) {
    &__grid {
      grid-template-columns: 1fr;
    }
    &__card img {
      aspect-ratio: 4 / 3;
      max-height: 280px;
    }
    &__intro {
      align-items: flex-start;
      flex-direction: column;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    &__card,
    &__card img,
    &__overlay button {
      transition: none;
    }
    &__card:hover,
    &__card:hover img {
      transform: none;
    }
  }
}
</style>
