<template>
  <div class="workbench-home">
    <div class="workbench-home__topline">
      <span><i />你的电商创作空间</span
      ><router-link to="/space">我的作品<ArrowRightOutlined /></router-link>
    </div>
    <section class="home-hero">
      <p class="home-hero__eyebrow">从想法，到好作品</p>
      <h1>让好商品，拥有<span>好画面。</span></h1>
      <p class="home-hero__description">
        用 AI 制作商品图片、品牌内容和视频，把创意变成下一件作品。
      </p>
      <form class="home-composer" @submit.prevent="startCreation">
        <div class="home-composer__modes">
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
        <textarea
          v-model="draft"
          maxlength="1000"
          aria-label="创作需求"
          placeholder="描述你想创作的画面，比如：为这款香水制作一组清透蓝调的商品图…"
        />
        <div class="home-composer__footer">
          <span>进入创作页后添加素材、选择模型</span
          ><button type="submit">开始创作<ArrowRightOutlined /></button>
        </div>
      </form>
      <div class="home-hero__ideas">
        <span>试试这些灵感</span
        ><button v-for="idea in ideas" :key="idea" type="button" @click="draft = idea">
          {{ idea }}<ArrowRightOutlined />
        </button>
      </div>
    </section>
    <ToolCatalog />
    <HomeExplore />
    <section class="home-canvas">
      <span class="home-canvas__icon"><PartitionOutlined /></span>
      <div>
        <p>需要更多自由？</p>
        <h2>在无限画布里，连接你的每一个创意。</h2>
        <span>让图片、视频和文字在同一张画布中协作。</span>
      </div>
      <router-link to="/canvas/index">打开无限画布<ArrowRightOutlined /></router-link>
    </section>
    <footer class="workbench-home__footer">
      <span>从一张素材开始，创作属于你的作品。</span
      ><router-link to="/agent-lib"><FolderOpenOutlined />管理我的资产</router-link>
    </footer>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowRightOutlined,
  CopyOutlined,
  FolderOpenOutlined,
  PartitionOutlined,
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
  { label: '视频创作', path: '/video', icon: VideoCameraOutlined },
  { label: '图片复刻', path: '/image-remix', icon: CopyOutlined },
]
const ideas = ['清透蓝调商品图', '自然光穿搭大片', '温暖居家产品视频']
function startCreation() {
  router.push({ path: mode.value, query: draft.value.trim() ? { prompt: draft.value.trim() } : {} })
}
</script>
<style scoped lang="scss">
.workbench-home {
  max-width: 1650px;
  margin: 0 auto;
  padding: 24px clamp(20px, 3.8vw, 64px) 28px;
  color: var(--color-ink-primary);
  &__topline {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: var(--color-ink-secondary);
    span,
    a {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    i {
      width: 6px;
      height: 6px;
      background: var(--color-success-mint);
      border-radius: 50%;
    }
    a {
      color: var(--color-ink-secondary);
    }
  }
  &__footer {
    display: flex;
    justify-content: space-between;
    gap: 18px;
    font-size: 12px;
    color: var(--color-ink-muted);
    a {
      display: inline-flex;
      gap: 8px;
      color: var(--color-ink-secondary);
    }
  }
}
.home-hero {
  max-width: 840px;
  margin: 52px auto 62px;
  text-align: center;
  &__eyebrow {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.12em;
    color: var(--color-creative-violet);
  }
  h1 {
    margin: 14px 0 16px;
    font-size: clamp(30px, 3.6vw, 50px);
    font-weight: 700;
    letter-spacing: -0.05em;
    line-height: 1.35;
    span {
      color: var(--color-creative-violet);
    }
  }
  &__description {
    color: var(--color-ink-secondary);
    line-height: 1.8;
    font-size: 15px;
    margin-bottom: 30px;
  }
  &__ideas {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 9px;
    margin-top: 16px;
    font-size: 11px;
    color: var(--color-ink-muted);
    button {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: var(--color-surface-0);
      border: 1px solid var(--color-border-whisper);
      border-radius: 20px;
      padding: 7px 12px;
      color: var(--color-ink-secondary);
      cursor: pointer;
    }
  }
}
.home-composer {
  padding: 16px 18px 16px;
  text-align: left;
  border: 1px solid var(--color-accent-border);
  border-radius: 18px;
  background: var(--color-surface-0);
  box-shadow: var(--shadow-soft);
  &__modes {
    display: flex;
    gap: 6px;
    button {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 7px 12px;
      border: 0;
      border-radius: 7px;
      background: transparent;
      color: var(--color-ink-secondary);
      cursor: pointer;
      font-size: 12px;
    }
    .active {
      background: var(--color-accent-soft);
      color: var(--color-creative-violet);
      font-weight: 600;
    }
  }
  textarea {
    width: 100%;
    min-height: 100px;
    resize: vertical;
    max-height: 240px;
    padding: 18px 8px;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--color-ink-primary);
    line-height: 1.8;
    font-size: 14px;
    &::placeholder {
      color: var(--color-ink-muted);
    }
  }
  &__footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    color: var(--color-ink-muted);
    font-size: 11px;
    button {
      border: 0;
      border-radius: 9px;
      background: var(--color-creative-violet);
      color: var(--color-on-media);
      display: flex;
      gap: 18px;
      align-items: center;
      padding: 11px 20px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      flex-shrink: 0;
    }
  }
}
.home-canvas {
  display: flex;
  gap: 22px;
  align-items: center;
  margin: 38px 0 30px;
  padding: 30px;
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent-border);
  border-radius: 16px;
  &__icon {
    display: grid;
    place-items: center;
    width: 54px;
    height: 54px;
    flex-shrink: 0;
    background: var(--color-surface-0);
    border-radius: 14px;
    font-size: 25px;
    color: var(--color-creative-violet);
  }
  p {
    margin: 0 0 5px;
    font-size: 11px;
    color: var(--color-creative-violet);
  }
  h2 {
    font-size: 19px;
    font-weight: 600;
    margin: 0 0 6px;
  }
  div > span {
    color: var(--color-ink-secondary);
    font-size: 13px;
  }
  a {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;
    margin-left: auto;
    padding: 11px 16px;
    background: var(--color-surface-0);
    border: 1px solid var(--color-accent-border);
    border-radius: 9px;
    color: var(--color-creative-violet);
    font-size: 13px;
  }
}
@media (max-width: 700px) {
  .home-hero {
    margin: 30px auto 38px;
  }
  .home-hero__description {
    font-size: 13px;
  }
  .home-canvas {
    flex-wrap: wrap;
    padding: 22px;
    gap: 16px;
  }
  .home-canvas__icon {
    display: none;
  }
  .home-canvas a {
    margin-left: 0;
  }
  .workbench-home__footer {
    flex-direction: column;
  }
  .home-composer__footer > span {
    display: none;
  }
  .home-composer__footer {
    justify-content: flex-end;
  }
}
</style>
