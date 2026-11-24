<template>
  <div class="design-review">
    <header class="review-bar">
      <div class="review-bar__label">
        <span class="review-dot" /> 官网设计提案 <small>01—03</small>
      </div>
      <nav aria-label="切换设计方案" class="review-options">
        <router-link
          v-for="option in concepts"
          :key="option.id"
          :to="{ path: '/design-preview', query: { concept: option.id } }"
          :class="{ active: concept === option.id }"
          :aria-current="concept === option.id ? 'page' : undefined"
        >
          <span>{{ option.id.toUpperCase() }}</span
          >{{ option.name }}
        </router-link>
      </nav>
      <router-link to="/" class="review-return">返回现有官网 <ArrowUpOutlined /></router-link>
    </header>

    <div :class="['concept', `concept--${concept}`]">
      <header class="site-header">
        <router-link to="/design-preview" class="brand" aria-label="电商工作室设计预览">
          <span class="brand-mark"><AppstoreOutlined /></span>
          <span>电商工作室<small>COMMERCE STUDIO</small></span>
        </router-link>
        <nav class="site-nav" aria-label="主导航">
          <a href="#create" class="current">创作工作台</a><a href="#toolkit">创作工具</a
          ><a href="#inspiration">灵感精选</a
          ><router-link to="/canvas/index">无限画布 <ArrowUpOutlined /></router-link>
        </nav>
        <router-link to="/agent-lib" class="header-assets"
          ><FolderOpenOutlined /><span>我的资产</span><ArrowRightOutlined
        /></router-link>
      </header>

      <main>
        <section id="create" class="creative-hero">
          <div class="hero-copy">
            <div class="eyebrow"><span />{{ currentConcept.eyebrow }}</div>
            <h1 v-if="concept === 'a'">
              让好商品，<br class="mobile-break" /><em>拥有好画面。</em>
            </h1>
            <h1 v-else-if="concept === 'b'">你的下一支<br /><em>出圈作品。</em></h1>
            <h1 v-else>把品牌的想象，<br /><em>变成看得见的作品。</em></h1>
            <p class="hero-description">{{ currentConcept.description }}</p>
            <div v-if="concept === 'c'" class="editorial-index">
              <span>STUDIO JOURNAL / 001</span
              ><span>为每一个好商品而创作 <ArrowDownOutlined /></span>
            </div>
          </div>

          <div v-if="concept !== 'a'" class="hero-art" aria-label="创作视觉示例">
            <img
              :src="image(concept === 'b' ? 'landscape' : 'skincare')"
              :alt="concept === 'b' ? '山峰与云海的品牌影像示意' : '自然光中的护肤品商拍示意'"
              fetchpriority="high"
            />
            <div class="art-caption">
              <span>{{
                concept === 'b' ? 'BRAND FILM / OUTDOORS' : 'STILL LIFE / NATURAL LIGHT'
              }}</span
              ><span>视觉示例</span>
            </div>
            <template v-if="concept === 'b'">
              <span class="art-frame-label">FRAME 001 <span /> 16:9</span>
              <div class="art-film-title">BEYOND<br /><i>THE ORDINARY.</i></div>
              <div class="film-contact">
                <img :src="image('shoe')" alt="运动鞋商拍示例" /><img
                  :src="image('interior')"
                  alt="室内空间示例"
                /><span>从灵感<br />到成片 <ArrowUpOutlined /></span>
              </div>
            </template>
            <div v-else class="editorial-stamp">
              好画面<br /><span>源于好想法</span><PlusOutlined />
            </div>
          </div>

          <div class="composer">
            <div class="composer-tabs" role="tablist" aria-label="创作类型">
              <button
                v-for="mode in modes"
                :key="mode.id"
                role="tab"
                :id="`tab-${mode.id}`"
                :aria-selected="activeMode === mode.id"
                aria-controls="creation-panel"
                :class="{ active: activeMode === mode.id }"
                @click="activeMode = mode.id"
              >
                <component :is="mode.icon" />{{ mode.name }}
              </button>
              <span class="composer-tabs__hint">从一个想法开始</span>
            </div>
            <div
              id="creation-panel"
              class="composer-body"
              role="tabpanel"
              :aria-labelledby="`tab-${activeMode}`"
            >
              <div class="composer-input">
                <label class="reference-upload" :class="{ 'has-reference': previewUrl }">
                  <img v-if="previewUrl" :src="previewUrl" alt="本地参考图片预览" /><PlusOutlined
                    v-else
                  /><span v-if="!previewUrl">参考图</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="选择参考图片，仅在本页预览"
                    @change="previewFile"
                  />
                </label>
                <textarea
                  v-model="prompts[activeMode]"
                  :placeholder="selectedMode.placeholder"
                  aria-label="描述你的创作需求"
                  rows="3"
                  maxlength="2000"
                />
              </div>
              <p v-if="fileError" class="file-error" role="alert">{{ fileError }}</p>
              <div class="composer-toolbar">
                <span class="model-chip"
                  ><component :is="selectedMode.icon" />{{ selectedMode.model }}</span
                >
                <span class="output-chip">{{ selectedMode.output }}</span>
                <router-link :to="selectedMode.href" class="create-button"
                  >进入创作 <ArrowUpOutlined
                /></router-link>
              </div>
            </div>
            <div class="prompt-examples">
              <span>试试这样开始</span
              ><button
                v-for="example in selectedMode.examples"
                :key="example"
                @click="prompts[activeMode] = example"
              >
                {{ example }} <ArrowUpOutlined />
              </button>
            </div>
          </div>
        </section>

        <section v-if="concept === 'a'" class="quick-tools" aria-label="常用创作工具">
          <router-link v-for="tool in shortcuts" :key="tool.name" :to="tool.href"
            ><span><component :is="tool.icon" /></span>{{ tool.name }}<ArrowUpOutlined
          /></router-link>
        </section>
        <div v-else class="capability-strip">
          <span>一个工作室，连接你的全部创作。</span><span>图片创作</span><span>视频生成</span
          ><span>爆款复刻</span><span>无限画布</span>
        </div>

        <section id="toolkit" class="tool-section section-container">
          <div class="section-heading">
            <div>
              <p class="section-kicker">YOUR CREATIVE TOOLKIT</p>
              <h2>{{ concept === 'c' ? '让创作，回归简单。' : '选一个工具，开始好作品。' }}</h2>
            </div>
            <router-link to="/tools">探索全部工具 <ArrowUpOutlined /></router-link>
          </div>
          <div class="tool-filter" role="group" aria-label="工具分类">
            <button
              v-for="filter in filters"
              :key="filter"
              :class="{ active: activeFilter === filter }"
              :aria-pressed="activeFilter === filter"
              @click="activeFilter = filter"
            >
              {{ filter }}</button
            ><span>{{ filteredTools.length }} 个创作入口</span>
          </div>
          <div class="tool-grid">
            <router-link
              v-for="(tool, index) in filteredTools"
              :key="tool.name"
              :to="tool.href"
              class="tool-card"
            >
              <div class="tool-card__image">
                <img :src="image(tool.image)" :alt="tool.alt" loading="lazy" /><span
                  class="tool-card__tag"
                  >{{ tool.tag }}</span
                ><span class="card-arrow"><ArrowUpOutlined /></span
                ><span v-if="concept === 'c'" class="tool-number">0{{ index + 1 }}</span>
              </div>
              <div class="tool-card__body">
                <div>
                  <h3>{{ tool.name }}</h3>
                  <p>{{ tool.description }}</p>
                </div>
                <component :is="tool.icon" />
              </div>
            </router-link>
          </div>
        </section>

        <section id="inspiration" class="inspiration-section section-container">
          <div class="section-heading">
            <div>
              <p class="section-kicker">MADE TO INSPIRE</p>
              <h2>{{ concept === 'b' ? '好的灵感，值得被看见。' : '你的下一个想法，在这里。' }}</h2>
            </div>
            <router-link to="/templates">发现更多灵感 <ArrowUpOutlined /></router-link>
          </div>
          <div class="inspiration-grid">
            <router-link
              v-for="work in inspirations"
              :key="work.title"
              :to="work.href"
              class="inspiration-card"
              ><img :src="image(work.image)" :alt="work.alt" loading="lazy" />
              <div class="inspiration-caption">
                <span>{{ work.category }}</span>
                <h3>{{ work.title }}</h3>
                <ArrowUpOutlined /></div
            ></router-link>
          </div>
        </section>

        <section class="closing-section section-container">
          <span class="closing-symbol"><AppstoreOutlined /></span>
          <div>
            <p class="section-kicker">LESS FRICTION. MORE CREATION.</p>
            <h2>创意不必等，<em>现在就开始。</em></h2>
          </div>
          <router-link to="/canvas/index">打开我的画布 <ArrowRightOutlined /></router-link>
        </section>
      </main>
      <footer class="site-footer">
        <router-link to="/" class="footer-brand"
          >电商工作室 <span>COMMERCE STUDIO</span></router-link
        ><span>让每个好商品，都有被看见的机会。</span
        ><router-link to="/agent-lib">我的素材 <ArrowUpOutlined /></router-link>
      </footer>
    </div>
    <footer class="review-note">
      <span>{{ currentConcept.name }} · {{ currentConcept.summary }}</span
      ><span
        >设计预览 ·
        图片为示意素材；输入与选图仅在本页预览，创作入口跳转现有工具，不提交生成任务。</span
      >
    </footer>
  </div>
</template>

<script setup lang="ts">
import { imageAssetUrl } from '@/lib/image-assets'
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  AppstoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowRightOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  CopyOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  ScissorOutlined,
  ExpandOutlined,
  SkinOutlined,
} from '@ant-design/icons-vue'

type ConceptId = 'a' | 'b' | 'c'
type ModeId = 'image' | 'video' | 'replicate'
const route = useRoute()
const concepts = [
  {
    id: 'a',
    name: '清爽工作台',
    eyebrow: 'IDEAS IN. POSSIBILITIES OUT.',
    description: '商品图、品牌视频、灵感复刻。把复杂的制作，留给工具。',
    summary: '蓝白留白 · 集中创作入口 · 适合日常高频使用',
  },
  {
    id: 'b',
    name: '深色创意工作室',
    eyebrow: 'A SPACE FOR YOUR NEXT BIG IDEA',
    description: '从第一帧灵感，到最后一秒表达。在这里，放开想象。',
    summary: '深色电影感 · 大幅视觉 · 适合视频与创作者品牌',
  },
  {
    id: 'c',
    name: '暖色品牌官网',
    eyebrow: 'THE ART OF EVERYDAY COMMERCE',
    description: '从一张商品图出发，为你的品牌，创造更多可能。',
    summary: '奶油白与墨绿 · 杂志排版 · 适合品牌官网与电商商家',
  },
] as const
const concept = computed<ConceptId>(() =>
  route.query.concept === 'b' ? 'b' : route.query.concept === 'c' ? 'c' : 'a'
)
const currentConcept = computed(
  () => concepts.find((item) => item.id === concept.value) || concepts[0]
)
const modes = [
  {
    id: 'image' as const,
    name: '图片创作',
    icon: PictureOutlined,
    model: 'AI 图片',
    output: '商品图 / 人像 / 场景',
    href: '/image',
    placeholder: '描述你想要的画面，比如：一瓶精华液置于暖色石台上，晨光穿过叶片，投下柔和的影子……',
    examples: ['自然光护肤品商拍', '极简风商品主图', '春日服装穿搭'],
  },
  {
    id: 'video' as const,
    name: '视频创作',
    icon: VideoCameraOutlined,
    model: 'AI 视频',
    output: '商品视频 / 品牌短片',
    href: '/product-video',
    placeholder: '描述你想拍的视频：主角、场景、动作和运镜，让每一帧都有你的想法……',
    examples: ['一支运动鞋品牌短片', '香水的微距产品镜头', '窗边自然光人物视频'],
  },
  {
    id: 'replicate' as const,
    name: '爆款复刻',
    icon: CopyOutlined,
    model: '视频复刻',
    output: '参考原片 / 替换素材',
    href: '/video-remix',
    placeholder: '说说你想保留什么、替换什么，比如：保留参考片的动作和节奏，将人物换成我的参考图……',
    examples: ['保留运镜，替换人物', '保留节奏，替换产品', '用我的素材重新创作'],
  },
]
const activeMode = ref<ModeId>('image')
const prompts = reactive<Record<ModeId, string>>({ image: '', video: '', replicate: '' })
const selectedMode = computed(() => modes.find((item) => item.id === activeMode.value) || modes[0])
const previewUrl = ref('')
const fileError = ref('')
function previewFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  ) {
    fileError.value = '请选择 20MB 以内的 JPG、PNG 或 WebP 图片。'
    input.value = ''
    return
  }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  fileError.value = ''
  input.value = ''
}
onBeforeUnmount(() => {
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
})
const image = (name: string) => imageAssetUrl(`design-preview/${name}.jpg`)
const filters = ['为你推荐', '商品视觉', '视频制作', '人物穿搭']
const activeFilter = ref('为你推荐')
const tools = [
  {
    name: '商品套图',
    description: '一件商品，一整套好画面。',
    category: '商品视觉',
    image: 'skincare',
    alt: '暖光下的精华液商品摄影示例',
    tag: 'PRODUCT IMAGES',
    icon: AppstoreOutlined,
    href: '/product-set',
  },
  {
    name: 'AI 视频',
    description: '让你的想法，真正动起来。',
    category: '视频制作',
    image: 'landscape',
    alt: '山脉风景影像示例',
    tag: 'MOTION & STORY',
    icon: VideoCameraOutlined,
    href: '/product-video',
  },
  {
    name: '爆款复刻',
    description: '参考好创意，换上你的素材。',
    category: '视频制作',
    image: 'perfume',
    alt: '香水广告视觉示例',
    tag: 'CREATIVE REMIX',
    icon: CopyOutlined,
    href: '/video-remix',
  },
  {
    name: 'AI 模特',
    description: '为每种风格，找到新的表达。',
    category: '人物穿搭',
    image: 'fashion',
    alt: '时尚穿搭场景示例',
    tag: 'FASHION STUDIO',
    icon: SkinOutlined,
    href: '/tools/try-on',
  },
]
const filteredTools = computed(() =>
  tools.filter((tool) => activeFilter.value === '为你推荐' || tool.category === activeFilter.value)
)
const shortcuts = [
  { name: 'AI 制图', href: '/image', icon: PictureOutlined },
  { name: 'AI 视频', href: '/product-video', icon: VideoCameraOutlined },
  { name: '爆款复刻', href: '/video-remix', icon: CopyOutlined },
  { name: '商品套图', href: '/product-set', icon: AppstoreOutlined },
  { name: '人物穿搭', href: '/tools/try-on', icon: SkinOutlined },
  { name: '无限画布', href: '/canvas/index', icon: ExpandOutlined },
  { name: '我的素材', href: '/agent-lib', icon: FolderOpenOutlined },
  { name: '全部工具', href: '/tools', icon: ScissorOutlined },
]
const inspirations = [
  {
    title: '让日常，多一点质感。',
    category: '家居 · 空间氛围',
    image: 'interior',
    alt: '温暖自然光下的现代客厅',
    href: '/image',
  },
  {
    title: '每一步，都有新可能。',
    category: '运动 · 商品视觉',
    image: 'shoe',
    alt: '红色运动鞋的产品摄影',
    href: '/product-set',
  },
  {
    title: '把香气，拍成一种心情。',
    category: '美妆 · 品牌表达',
    image: 'perfume',
    alt: '香水瓶的静物摄影',
    href: '/product-video',
  },
]
</script>

<style scoped lang="scss" src="./design-preview.scss" />
