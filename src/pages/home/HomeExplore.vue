<template>
  <div class="home-explore">
    <!-- <section class="recommendations" aria-labelledby="recommendation-title">
      <header class="explore-heading">
        <div>
          <p>从灵感开始</p>
          <h2 id="recommendation-title">为你推荐</h2>
        </div>
        <router-link to="/tools">查看全部工具<ArrowRightOutlined /></router-link>
      </header>
      <div class="recommendations__grid">
        <router-link
          v-for="item in recommendations"
          :key="item.title"
          :to="{ path: item.path, query: { prompt: item.prompt } }"
          class="recommendation"
        >
          <img :src="imageAssetUrl(`design-preview/${item.cover}.jpg`)" alt="" loading="lazy" />
          <div>
            <span>{{ item.label }}</span>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
            <strong>试试这个创意<ArrowRightOutlined /></strong>
          </div>
        </router-link>
      </div>
    </section> -->

    <section class="inspiration" aria-labelledby="inspiration-title">
      <header class="explore-heading">
        <div>
          <p>让下一件作品有迹可循</p>
          <h2 id="inspiration-title">发现灵感</h2>
        </div>
        <router-link to="/canvas/index">全部模板<ArrowRightOutlined /></router-link>
      </header>
      <div v-if="!isLoggedIn" class="inspiration__state">
        <PictureOutlined />
        <h3>找到下一件作品的灵感</h3>
        <p>登录后浏览精选模板，将喜欢的创意复制到你的画布。</p>
        <Button type="primary" @click="openLogin()">登录，探索模板</Button>
      </div>
      <div v-else-if="loading && !templates.length" class="inspiration__state" aria-live="polite">
        <Spin />
        <p>正在加载灵感…</p>
      </div>
      <div v-else-if="error && !templates.length" class="inspiration__state" role="alert">
        <p>{{ error }}</p>
        <Button @click="load()">重新加载</Button>
      </div>
      <div v-else-if="!templates.length" class="inspiration__state">
        <PictureOutlined />
        <h3>暂时没有匹配的模板</h3>
        <p>稍后再来看看，或前往画布浏览更多模板。</p>
      </div>
      <div v-else class="inspiration__grid">
        <article
          v-for="item in templates"
          :key="item.id"
          role="button"
          tabindex="0"
          class="inspiration-card"
          @click="detail = item"
          @keydown.enter.self="detail = item"
          @keydown.space.self.prevent="detail = item"
        >
          <div class="inspiration-card__media">
            <GalleryMedia
              :source="item.cover || item.previewUrl"
              :poster="poster(item)"
              :autoplay="false"
              :disabled="!!detail"
            /><span>查看模板<ArrowRightOutlined /></span>
          </div>
          <strong>{{ item.title }}</strong
          ><small>{{ item.tags?.slice(0, 2).join(' · ') || '精选画布模板' }}</small>
        </article>
      </div>
      <p v-if="error && templates.length" class="inspiration__error" role="alert">{{ error }}</p>
      <!-- <router-link v-if="templates.length" class="inspiration__more" to="/canvas/index"
        >查看更多模板<ArrowRightOutlined
      /></router-link> -->
    </section>
    <Modal
      :open="!!detail"
      title="灵感模板"
      :footer="null"
      width="900px"
      centered
      destroy-on-close
      @cancel="detail = undefined"
    >
      <div v-if="detail" class="inspiration-preview">
        <PreviewVideo
          v-if="isVideoUrl(detail.previewUrl || detail.cover)"
          :key="detail.id"
          :source="detail.previewUrl || detail.cover"
          controls
        />
        <img
          v-else
          :src="detail.previewUrl || detail.cover"
          :alt="detail.title"
          referrerpolicy="no-referrer"
        />
        <div>
          <h3>{{ detail.title }}</h3>
          <p>{{ detail.description }}</p>
          <p v-if="cloneError" role="alert" class="inspiration__error">{{ cloneError }}</p>
          <Button type="primary" :loading="cloning" @click="cloneTemplate"
            >使用同款模板<ArrowRightOutlined
          /></Button>
        </div>
      </div>
    </Modal>
  </div>
</template>
<script setup lang="ts">
import { imageAssetUrl } from '@/lib/image-assets'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Button, Modal, Spin } from 'ant-design-vue'
import { ArrowRightOutlined, PictureOutlined } from '@ant-design/icons-vue'
import { useAuth } from '@/composables/useAuth'
import { templateApi } from '@/pages/home/api'
import GalleryMedia from '@/pages/canvas/index/GalleryMedia.vue'
import PreviewVideo from '@/pages/canvas/index/PreviewVideo.vue'
import { isVideoUrl } from '@/pages/canvas/utils/galleryMedia'

interface InspirationTemplate {
  id: number
  title: string
  cover: string
  previewUrl?: string
  description?: string
  tags?: string[]
}
const recommendations = [
  {
    title: '一张商品图，一套品牌视觉',
    label: '商品套图',
    cover: 'skincare',
    path: '/product-set',
    description: '统一主图、场景与细节的表达。',
    prompt: '为商品制作一套清透蓝调的电商图片，突出真实材质，保持商品结构与品牌标识一致。',
  },
  {
    title: '把日常穿搭，变成灵感大片',
    label: '',
    cover: 'fashion',
    path: '/virtual-try-on',
    description: '让服装与人物自然地融合。',
    prompt: '制作自然光下的日常穿搭展示，保持模特身份与服装版型、图案一致。',
  },
  {
    title: '让产品细节，自己说话',
    label: '产品精修',
    cover: 'shoe',
    path: '/product-retouch',
    description: '干净光线，呈现真实质感。',
    prompt: '保留商品原本的外形和颜色，清理背景，使用柔和商业布光呈现材质与细节。',
  },
  {
    title: '让商品拥有自己的故事',
    label: '带货视频',
    cover: 'perfume',
    path: '/product-video',
    description: '从静态商品到生动展示。',
    prompt:
      '制作一段简洁的商品展示视频，用自然光、缓慢运镜和产品细节表现真实质感，不添加虚构卖点。',
  },
]
const router = useRouter()
const { isLoggedIn, userInfo, openLogin } = useAuth()
const templates = ref<InspirationTemplate[]>([])
const loading = ref(false)
const error = ref('')
const detail = ref<InspirationTemplate>()
const cloning = ref(false)
const cloneError = ref('')
let version = 0
function poster(item: InspirationTemplate) {
  return !isVideoUrl(item.previewUrl) ? item.previewUrl || '' : ''
}
async function load() {
  if (!isLoggedIn.value) return
  const token = ++version
  templates.value = []
  loading.value = true
  error.value = ''
  try {
    const result = await templateApi.list({ current: 1, size: 8 })
    if (token !== version) return
    templates.value = (result.list || []).slice(0, 8)
  } catch (e) {
    if (token === version) error.value = e instanceof Error ? e.message : '灵感加载失败，请重试'
  } finally {
    if (token === version) loading.value = false
  }
}
async function cloneTemplate() {
  if (!detail.value || cloning.value) return
  if (!isLoggedIn.value) {
    openLogin()
    return
  }
  cloning.value = true
  cloneError.value = ''
  try {
    const project = await templateApi.clone(detail.value.id, detail.value.title)
    await router.push({ path: '/canvas', query: { projectId: project.id } })
  } catch (e) {
    cloneError.value = e instanceof Error ? e.message : '模板创建失败，请重试'
  } finally {
    cloning.value = false
  }
}
watch(detail, () => {
  cloneError.value = ''
})
watch([isLoggedIn, () => userInfo.value?.id], () => {
  version++
  templates.value = []
  detail.value = undefined
  loading.value = false
  error.value = ''
  if (isLoggedIn.value) load()
})
onMounted(() => {
  void load()
})
onBeforeUnmount(() => {
  version++
})
</script>
<style scoped lang="scss">
.home-explore {
  margin-top: 56px;
}
.explore-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
  p {
    margin: 0 0 7px;
    font-size: 12px;
    color: var(--color-ink-muted);
  }
  h2 {
    margin: 0;
    font-size: 25px;
    font-weight: 650;
    letter-spacing: -0.03em;
  }
  a {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    color: var(--color-ink-secondary);
    font-size: 12px;
    white-space: nowrap;
  }
}
.recommendations__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 20px;
}
.recommendation {
  position: relative;
  display: flex;
  min-height: 292px;
  overflow: hidden;
  border-radius: 18px;
  color: var(--color-on-media);
  background: var(--color-media-backdrop);
  text-decoration: none;
  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.25s;
  }
  &:hover img {
    transform: scale(1.04);
  }
  div {
    position: relative;
    align-self: flex-end;
    width: 100%;
    padding: 60px 20px 20px;
    background: linear-gradient(transparent, var(--color-media-backdrop));
  }
  span {
    font-size: 11px;
    opacity: 0.9;
  }
  h3 {
    margin: 8px 0;
    color: inherit;
    font-size: 18px;
    line-height: 1.5;
  }
  p {
    margin: 0 0 16px;
    font-size: 12px;
    opacity: 0.85;
  }
  strong {
    display: inline-flex;
    gap: 12px;
    align-items: center;
    font-size: 12px;
    font-weight: 500;
  }
}
.inspiration {
  margin-top: 56px;
  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    margin-bottom: 24px;
  }
  &__categories {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    flex: 1;
  }
  &__categories button {
    border: 1px solid transparent;
    background: var(--color-surface-0);
    color: var(--color-ink-secondary);
    border-radius: 20px;
    padding: 7px 15px;
    font-size: 12px;
    cursor: pointer;
  }
  &__categories button.active {
    background: var(--color-accent-soft);
    border-color: var(--color-accent-border);
    color: var(--color-creative-violet);
  }
  &__search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 12px;
    border: 1px solid var(--color-border-whisper);
    border-radius: 20px;
    background: var(--color-surface-0);
    color: var(--color-ink-muted);
  }
  &__search:focus-within {
    outline: 2px solid var(--color-accent-border);
  }
  &__search input {
    width: 150px;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--color-ink-primary);
    font-size: 12px;
  }
  &__search button {
    border: 0;
    background: transparent;
    color: var(--color-creative-violet);
    font-size: 12px;
    cursor: pointer;
    &:disabled {
      color: var(--color-ink-muted);
      cursor: not-allowed;
    }
  }
  &__state {
    display: flex;
    min-height: 240px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px;
    text-align: center;
    background: var(--color-surface-0);
    border: 1px solid var(--color-border-whisper);
    border-radius: 18px;
    color: var(--color-ink-secondary);
    > .anticon {
      font-size: 30px;
      color: var(--color-accent-border);
    }
    h3 {
      color: var(--color-ink-primary);
      margin: 15px 0 0;
    }
    p {
      margin: 12px 0 18px;
      font-size: 13px;
    }
  }
  &__grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 22px;
    > :nth-child(n + 9) {
      display: none;
    }
  }
  &__more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: fit-content;
    margin: 24px auto 0;
    color: var(--color-ink-secondary);
  }
  &__error {
    color: var(--color-danger);
    font-size: 13px;
  }
}
.inspiration-card {
  min-width: 0;
  text-align: left;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  color: var(--color-ink-primary);
  &__media {
    position: relative;
    aspect-ratio: 4/5;
    border-radius: 16px;
    overflow: hidden;
    background: var(--color-surface-2);
    span {
      position: absolute;
      bottom: 12px;
      right: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      border-radius: 8px;
      padding: 8px 10px;
      background: var(--color-surface-0);
      color: var(--color-ink-primary);
      font-size: 12px;
      opacity: 0;
      transition: opacity 0.2s;
    }
  }
  &:hover .inspiration-card__media span,
  &:focus-visible .inspiration-card__media span {
    opacity: 1;
  }
  strong {
    display: block;
    margin: 12px 0 5px;
    font-size: 14px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  small {
    color: var(--color-ink-muted);
    font-size: 12px;
  }
}
.inspiration-preview {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  align-items: center;
  gap: 24px;
  padding-top: 18px;
  img,
  :deep(.preview-video) {
    width: 100%;
    height: 440px;
    object-fit: contain;
    border-radius: 10px;
    background: var(--color-media-backdrop);
  }
  h3 {
    font-size: 20px;
  }
  p {
    color: var(--color-ink-secondary);
    line-height: 1.8;
  }
}
a:focus-visible,
button:focus-visible,
.inspiration-card:focus-visible {
  outline: 2px solid var(--color-creative-violet);
  outline-offset: 3px;
}
@media (max-width: 1100px) {
  .recommendations__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .inspiration__grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    > :nth-child(n + 7) {
      display: none;
    }
  }
}
@media (max-width: 700px) {
  .home-explore,
  .inspiration {
    margin-top: 36px;
  }
  .explore-heading h2 {
    font-size: 22px;
  }
  .recommendations__grid {
    gap: 12px;
  }
  .recommendation {
    min-height: 250px;
    div {
      padding: 60px 14px 16px;
    }
    h3 {
      font-size: 16px;
    }
  }
  .inspiration__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    > :nth-child(n + 5) {
      display: none;
    }
  }
  .inspiration__toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .inspiration__search input {
    flex: 1;
    width: 0;
  }
  .inspiration-preview {
    grid-template-columns: 1fr;
    img,
    :deep(.preview-video) {
      height: 300px;
    }
  }
}
@media (prefers-reduced-motion: reduce) {
  .recommendation img {
    transition: none;
  }
}
</style>
