<template>
  <div ref="galleryRef" class="gallery" @scroll="onGalleryNativeScroll">
    <header class="gallery-top">
      <div class="tab-switch">
        <button
          :class="['tab-btn', { active: activeTab === 'templates' }]"
          @click="switchTab('templates')"
        >
          精选模板
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'mine' }]"
          @click="switchTab('mine')"
        >
          我的画布
        </button>
      </div>
    </header>

    <section v-if="activeTab === 'templates' && !canBrowseTemplates" class="template-login-state"
      ><h3>登录后浏览精选模板</h3><p>找到适合你的商品模板，一键复制到画布开始创作。</p
      ><button type="button" class="login-btn" @click="openLogin()">登录，探索模板</button
      ><button type="button" @click="router.push('/templates')">先看看灵感案例</button></section
    >
    <section v-else-if="activeTab === 'templates'" class="tpl-section">
      <div class="filter-row">
        <div class="search-wrap">
          <Icon icon="lucide:search" :size="17" class="search-icon" aria-hidden="true" />
          <input
            v-model="keyword"
            class="search-input"
            aria-label="搜索模板"
            placeholder="搜索灵感或模板..."
            @keyup.enter="onSearchEnter"
          />
        </div>
        <div class="category-list">
          <button
            :class="['chip', { active: selectedCategoryId == null }]"
            :aria-pressed="selectedCategoryId == null"
            @click="selectCategory(null)"
          >
            全部
          </button>
          <button
            v-for="cat in categories"
            :key="cat.id"
            :class="['chip', { active: selectedCategoryId === cat.id }]"
            :aria-pressed="selectedCategoryId === cat.id"
            @click="selectCategory(cat.id)"
          >
            <template v-if="keyword && cat.name.includes(keyword)">
              {{ cat.name.slice(0, cat.name.indexOf(keyword))
              }}<span class="kw-hl">{{ keyword }}</span
              >{{ cat.name.slice(cat.name.indexOf(keyword) + keyword.length) }}
            </template>
            <template v-else>{{ cat.name }}</template>
          </button>
        </div>
      </div>

      <div
        v-if="templatesLoading && !templates.length"
        class="card-grid"
        aria-label="正在加载模板"
        aria-busy="true"
      >
        <div v-for="n in 10" :key="n" class="tpl-card skeleton-card"
          ><div class="cover"></div><div class="skeleton-title"></div
        ></div>
      </div>
      <div v-else-if="templates.length" class="card-grid">
        <article
          v-for="t in templates"
          :key="t.id"
          class="tpl-card"
          tabindex="0"
          role="button"
          :aria-label="`查看模板：${t.title}`"
          @click="openDetail(t)"
          @keydown.enter.self="openDetail(t)"
          @keydown.space.self.prevent="openDetail(t)"
        >
          <div class="cover">
            <GalleryMedia
              :source="t.cover"
              :poster="!isVideoUrl(t.previewUrl) ? t.previewUrl : ''"
              :disabled="!!detail || !pageActive"
            />
          </div>
          <div class="card-body">
            <h3 class="card-title">{{ t.title }}</h3>
            <div class="card-meta">
              <span v-if="getCategoryName(t.categoryId)" class="category-tag">{{
                getCategoryName(t.categoryId)
              }}</span>
              <!-- <span v-if="t.author" class="meta-author">{{ t.author }}</span> -->
              <!-- <span v-if="t.views != null" class="meta-stat">⏵ {{ t.views }}</span>
              <span v-if="t.likes != null" class="meta-stat">♡ {{ t.likes }}</span> -->
            </div>
            <!-- <div class="card-stats">
              共 {{ t.nodeCount }} 个节点 · 预计消耗 约 {{ t.estimatedPoints }} 积分
            </div> -->
          </div>
        </article>
      </div>
      <div v-else-if="templatesError" class="empty-state"
        >模板加载失败，<button class="retry-btn" @click="loadTemplates(true)">点击重试</button></div
      >
      <div v-else class="empty-state">没有找到匹配的模板 </div>
      <div v-if="templatesError && templates.length" class="load-more-tip"
        ><button class="retry-btn" @click="loadTemplates(false)">加载失败，点击重试</button></div
      >
      <div v-else-if="templatesLoadingMore" class="load-more-tip">加载中…</div>
      <div v-else-if="templates.length && !templatesHasMore" class="load-more-tip">没有更多了</div>
    </section>

    <section v-else class="mine-section">
      <div class="mine-count">{{ projectsLoading ? '加载中…' : `${projects.length} 个画布` }}</div>
      <div v-for="g in mineGroupsWithCreate" :key="g.key" class="date-group">
        <h4>{{ g.key }}</h4>
        <div class="card-grid">
          <article
            v-if="g.showCreate"
            class="mine-card create"
            role="button"
            tabindex="0"
            aria-label="新建画布"
            @keydown.enter="openCreateDialog"
            @keydown.space.prevent="openCreateDialog"
            @click="openCreateDialog"
          >
            <span class="plus-circle">+</span>
            <span>新建</span>
          </article>
          <article
            v-for="p in g.items"
            :key="p.id"
            class="mine-card"
            role="button"
            tabindex="0"
            :aria-label="`打开画布：${p.title}`"
            @keydown.enter.self="router.push({ path: '/canvas', query: { projectId: p.id } })"
            @keydown.space.self.prevent="
              router.push({ path: '/canvas', query: { projectId: p.id } })
            "
            @click="router.push({ path: '/canvas', query: { projectId: p.id } })"
          >
            <div class="cover">
              <GalleryMedia :source="p.cover" :autoplay="false" :disabled="!pageActive" />
              <div class="hover-actions" @click.stop>
                <button type="button" title="编辑标题" aria-label="编辑标题" @click="renameMine(p)"
                  ><Icon icon="lucide:pencil" :size="14"
                /></button>
                <button
                  type="button"
                  title="复制"
                  aria-label="复制画布"
                  @click="copyMine(p, $event)"
                  ><Icon icon="lucide:copy" :size="14"
                /></button>
                <button
                  type="button"
                  title="删除"
                  aria-label="删除画布"
                  @click="deleteMine(p, $event)"
                  ><Icon icon="lucide:trash-2" :size="14"
                /></button>
              </div>
              <div class="footer">
                <div class="title">{{ p.title }}</div>
                <div class="time">{{ p.updatedAt }}</div>
              </div>
            </div>
          </article>
        </div>
      </div>
      <div v-if="projectsLoadingMore" class="load-more-tip">加载中…</div>
      <div v-else-if="projects.length && !projectsHasMore" class="load-more-tip">没有更多了</div>
    </section>

    <a-modal v-model:open="showCreateDialog" title="新建画布" width="440px" :footer="null">
      <div class="create-panel">
        <h3 class="create-title">新建画布</h3>
        <label class="create-label">画布名称</label>
        <input
          v-model="createName"
          class="create-input"
          placeholder="未命名画布"
          @keyup.enter="confirmCreate"
        />
        <div class="create-actions">
          <button type="button" class="create-btn cancel" @click="closeCreateDialog">取消</button>
          <button
            type="button"
            class="create-btn primary"
            :disabled="creating"
            @click="confirmCreate"
          >
            {{ creating ? '创建中…' : '创建' }}
          </button>
        </div>
      </div>
    </a-modal>

    <a-modal :open="!!detail" title="模板详情" width="800px" :footer="null" @cancel="closeDetail">
      <div v-if="detail" class="detail-panel">
        <div class="detail-body">
          <div class="detail-preview">
            <PreviewVideo
              v-if="isVideoUrl(detail.previewUrl || detail.cover)"
              :key="detail.id"
              :source="detail.previewUrl || detail.cover"
              :enabled="pageActive"
              controls
            />
            <img v-else :src="detail.previewUrl || detail.cover" alt="" />
          </div>
          <div class="detail-info">
            <h2 class="detail-title">{{ detail.title }}</h2>
            <!-- <div class="detail-meta">
                <span>{{ detail.author }}</span>
                <span v-if="detail.views != null">⏵ {{ detail.views }}</span>
                <span v-if="detail.likes != null">♡ {{ detail.likes }}</span>
              </div> -->
            <p class="detail-desc">{{ detail.description }}</p>
            <div v-if="detail.tags?.length" class="detail-tags">
              <span v-for="tag in detail.tags" :key="tag" class="tag">{{ tag }}</span>
            </div>
            <div class="detail-stats">
              <div class="stat-row">
                <span class="stat-label">节点数</span>
                <span class="stat-value">{{ detail.nodeCount }}</span>
              </div>
              <!-- <div class="stat-row">
                  <span class="stat-label">预计消耗</span>
                  <span class="stat-value">约 {{ detail.estimatedPoints }} 积分</span>
                </div> -->
              <small class="stat-note">以实际生成为准</small>
            </div>
            <button class="clone-btn" :disabled="cloning" @click="onClone(detail)">
              {{ cloning ? '生成中...' : '一键同款' }}
            </button>
          </div>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated, onDeactivated, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getAccessToken } from '@/lib/auth/storage'
import { useAuth } from '@/composables/useAuth'
import { storeToRefs } from 'pinia'
import { useProjectStore } from '../stores/projectStore'
import { templateApi } from '../api/templateApi'
import { ElMessage, ElMessageBox } from '../shims/feedback'
import GalleryMedia from './GalleryMedia.vue'
import Icon from '../shims/Icon.vue'
import PreviewVideo from './PreviewVideo.vue'
import { isVideoUrl } from '../utils/galleryMedia'
const fetchTemplateCategories = templateApi.categories
const fetchTemplateList = templateApi.list

const canBrowseTemplates = computed(() => !!getAccessToken())
const router = useRouter()
const { openLogin } = useAuth()
const projectStore = useProjectStore()
const {
  projects,
  loading: projectsLoading,
  loadingMore: projectsLoadingMore,
  hasMore: projectsHasMore
} = storeToRefs(projectStore)

const PAGE_SIZE = 15
const pageActive = ref(true)
let galleryActivated = true
let templateRequest = 0

const activeTab = ref('templates') // 'templates' | 'mine'
const keyword = ref('')
const selectedCategoryId = ref(null)
const categories = ref([])
const templates = ref([])
const templatesLoading = ref(false)
const templatesLoadingMore = ref(false)
const templatesError = ref(false)
const projectsLoadError = ref(false)
const templatesHasMore = ref(true)
const templatesCurrent = ref(1)
const detail = ref(null)
const cloning = ref(false)
const showCreateDialog = ref(false)
const createName = ref('未命名画布')
const creating = ref(false)
const galleryRef = ref(null)

function resetGalleryScroll() {
  if (galleryRef.value) galleryRef.value.scrollTop = 0
}

function switchTab(tab) {
  if (activeTab.value === tab) return
  clearTimeout(keywordTimer)
  templateRequest++
  activeTab.value = tab
  detail.value = null
  resetGalleryScroll()
  if (tab === 'templates') {
    loadCategories()
    loadTemplates(true)
  } else {
    projectStore.fetchProjects(true).catch(() => ElMessage.error('画布列表加载失败'))
  }
}

function parseDate(val) {
  if (!val) return new Date()
  if (typeof val === 'number') return new Date(val)
  const s = String(val)
  return new Date(s.includes(' ') && !s.includes('T') ? s.replace(' ', 'T') : s)
}

function groupByDate(list) {
  const today = new Date()
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  const map = new Map()
  for (const p of [...list].sort((a, b) => parseDate(b.updatedAt) - parseDate(a.updatedAt))) {
    const d = parseDate(p.updatedAt || p.updateTime)
    const key = isSameDay(d, today)
      ? '今天'
      : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(p)
  }
  return [...map.entries()].map(([key, items]) => ({ key, items }))
}

const mineGroups = computed(() => groupByDate(projects.value))

const mineGroupsWithCreate = computed(() => {
  const groups = mineGroups.value
  const todayIdx = groups.findIndex((g) => g.key === '今天')
  if (todayIdx >= 0) {
    return groups.map((g, i) => ({ ...g, showCreate: i === todayIdx }))
  }
  return [
    { key: '今天', items: [], showCreate: true },
    ...groups.map((g) => ({ ...g, showCreate: false }))
  ]
})

function openCreateDialog() {
  if (!getAccessToken()) {
    openLogin()
    return
  }
  createName.value = '未命名画布'
  showCreateDialog.value = true
}

function closeCreateDialog() {
  showCreateDialog.value = false
}

async function confirmCreate() {
  const name = (createName.value || '').trim() || '未命名画布'
  if (creating.value) return
  creating.value = true
  try {
    const p = await projectStore.createProject(name)
    showCreateDialog.value = false
    router.push({ path: '/canvas', query: { projectId: p.id } })
  } catch (e) {
    ElMessage.error(e?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function renameMine(p) {
  try {
    const { value } = await ElMessageBox.prompt('画布名称', '编辑标题', {
      inputValue: p.title || p.name
    })
    const name = (value || '').trim()
    if (!name) return
    await projectStore.renameProject(p.id, name)
  } catch (e) {
    if (e === 'cancel' || e?.action === 'cancel') return
    ElMessage.error(e?.message || '重命名失败')
  }
}

async function copyMine(p, e) {
  e?.stopPropagation()
  try {
    await projectStore.copyProject(p.id)
    ElMessage.success('已复制')
  } catch (err) {
    ElMessage.error(err?.message || '复制失败')
  }
}

async function deleteMine(p, e) {
  e?.stopPropagation()
  try {
    await ElMessageBox.confirm(
      `删除「${p.title}」？删除画布后无法从其生成历史找回成果，如需保留请先下载。`,
      '确认',
      { type: 'warning' }
    )
    await projectStore.deleteProject(p.id)
  } catch (err) {
    if (err === 'cancel' || err?.action === 'cancel') return
    ElMessage.error(err?.message || '删除失败')
  }
}

async function loadCategories() {
  if (!getAccessToken()) return
  try {
    categories.value = (await fetchTemplateCategories()) ?? []
  } catch (e) {
    categories.value = []
    ElMessage.error(e?.message || '分类加载失败')
  }
}

function getCategoryName(categoryId) {
  if (categoryId == null) return ''
  const cat = categories.value.find((c) => String(c.id) === String(categoryId))
  return cat?.name ?? ''
}

function selectCategory(id) {
  clearTimeout(keywordTimer)
  selectedCategoryId.value = id
  resetGalleryScroll()
  loadTemplates(true)
}

function onSearchEnter() {
  clearTimeout(keywordTimer)
  resetGalleryScroll()
  loadTemplates(true)
}

async function loadTemplates(reset = true) {
  if (!getAccessToken()) return
  if (activeTab.value !== 'templates') return
  if (reset) {
    templatesCurrent.value = 1
    templatesHasMore.value = true
    templatesLoading.value = true
    templatesLoadingMore.value = false
    templates.value = []
  } else {
    if (!templatesHasMore.value || templatesLoading.value || templatesLoadingMore.value) return
    templatesLoadingMore.value = true
  }
  templatesError.value = false
  const requestId = ++templateRequest
  try {
    const current = reset ? 1 : templatesCurrent.value + 1
    const res = await fetchTemplateList({
      keyword: keyword.value,
      categoryId: selectedCategoryId.value,
      current,
      size: PAGE_SIZE
    })
    if (requestId !== templateRequest) return
    const list = res?.list ?? []
    templates.value = reset ? list : [...templates.value, ...list]
    templatesCurrent.value = current
    const total = res?.total
    templatesHasMore.value =
      total != null ? templates.value.length < total : list.length >= PAGE_SIZE
  } catch (e) {
    if (requestId !== templateRequest) return
    templatesError.value = true
    if (reset) templates.value = []
    ElMessage.error(e?.message || '模板加载失败')
  } finally {
    if (requestId === templateRequest) {
      templatesLoading.value = false
      templatesLoadingMore.value = false
    }
  }
}

const galleryScrollDisabled = computed(() => {
  if (activeTab.value === 'templates') {
    return (
      templatesError.value ||
      templatesLoading.value ||
      templatesLoadingMore.value ||
      !templatesHasMore.value
    )
  }
  return (
    projectsLoading.value ||
    projectsLoadingMore.value ||
    !projectsHasMore.value ||
    projectsLoadError.value
  )
})

function onGalleryNativeScroll(event) {
  const el = event.target
  if (!el) return
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight
  if (distance > 120) {
    projectsLoadError.value = false
    return
  }
  if (galleryScrollDisabled.value) return
  onGalleryScrollLoad()
}

function onGalleryScrollLoad() {
  if (activeTab.value === 'templates') {
    loadTemplates(false)
    return
  }
  Promise.resolve(projectStore.loadMoreProjects()).catch(() => {
    projectsLoadError.value = true
  })
}

let keywordTimer
watch(keyword, () => {
  templateRequest++
  templatesLoading.value = true
  clearTimeout(keywordTimer)
  keywordTimer = setTimeout(() => {
    resetGalleryScroll()
    loadTemplates(true)
  }, 300)
})

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChange)
  onVisibilityChange()
  if (activeTab.value === 'templates') {
    loadCategories()
    loadTemplates()
  } else if (getAccessToken())
    projectStore.fetchProjects(true).catch(() => ElMessage.error('画布列表加载失败'))
})

onActivated(() => {
  const returning = !galleryActivated
  galleryActivated = true
  onVisibilityChange()
  if (returning && activeTab.value === 'templates') loadTemplates(true)
  if (returning && activeTab.value === 'mine' && getAccessToken())
    projectStore.fetchProjects(true).catch(() => {})
})
function onVisibilityChange() {
  pageActive.value = galleryActivated && !document.hidden
}
function suspendGallery() {
  galleryActivated = false
  pageActive.value = false
  detail.value = null
  clearTimeout(keywordTimer)
  templateRequest++
  templatesLoading.value = false
  templatesLoadingMore.value = false
}
onDeactivated(suspendGallery)
onBeforeUnmount(() => {
  suspendGallery()
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

function openDetail(tpl) {
  detail.value = tpl
}

function closeDetail() {
  detail.value = null
}

async function onClone(tpl) {
  if (cloning.value) return
  if (!getAccessToken()) {
    openLogin()
    return
  }
  cloning.value = true
  try {
    const project = await projectStore.cloneFromTemplate(tpl.id, tpl.title)
    await router.push({ path: '/canvas', query: { projectId: project.id } })
    detail.value = null
  } catch (e) {
    ElMessage.error(e?.message || '同款失败')
  } finally {
    cloning.value = false
  }
}
</script>
<style lang="scss" scoped>

.retry-btn {
  color: $accent-text;
  background: transparent;
  border: 0;
  cursor: pointer;
  font: inherit;
}
.skeleton-card {
  pointer-events: none;
}
.skeleton-card .cover {
  background: linear-gradient(120deg, #20201f, #292927, #20201f);
}
.skeleton-title {
  height: 18px;
  margin: 18px;
  width: 60%;
  border-radius: 4px;
  background: #292927;
}

.gallery {
  background: $bg-base;
  color: $text-primary;
  font-family: $font-family;
  height: 100vh;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 32px 40px 64px;
  box-sizing: border-box;
}

/* ── Top bar ── */
.gallery-top {
  position: fixed;
  align-items: center;
  justify-content: center;
  max-width: $max-width;
  left: 50%;
  transform: translateX(-50%);
  flex-wrap: wrap;
  gap: 16px;
  z-index: 100;
}

.tab-switch {
  display: flex;
  gap: 4px;
  background: $bg-surface;
  border: 1px solid $border-subtle;
  border-radius: 100px;
  padding: 4px;
  z-index: 100;
}

.tab-btn {
  padding: 8px 22px;
  border: none;
  background: none;
  border-radius: 100px;
  font-size: 14px;
  font-weight: 600;
  color: $text-dim;
  cursor: pointer;
  font-family: inherit;
  transition: $transition-fast;

  &:hover {
    color: $text-secondary;
  }

  &.active {
    background: $accent-primary;
    color: #fff;
  }
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: $bg-surface;
  border: 1px solid $border-default;
  border-radius: $radius-md;
  padding: 0 12px;
  width: 260px;
  transition: border-color 0.15s;

  &:focus-within {
    border-color: $accent-primary;
  }
}

.search-icon {
  color: $text-faint;
  font-size: 14px;
}

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: $text-primary;
  font-size: 13px;
  padding: 9px 0;
  font-family: inherit;

  &::placeholder {
    color: $text-faint;
  }
}

// 搜索框由外层 focus-within 提供焦点边框，覆盖主题给原生 input 添加的内层轮廓。
html.consumer-theme .gallery .search-wrap .search-input:focus-visible {
  outline: none;
}

/* ── Filter chips ── */
.filter-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin: 64px auto 20px;
}

.category-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.kw-hl {
  color: $accent-text;
  font-weight: 700;
}

.chip {
  padding: 6px 16px;
  border-radius: 100px;
  border: 1px solid $border-default;
  background: $bg-surface;
  color: $text-muted;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;

  &.active {
    border-color: $accent-primary;
    color: $accent-text;
    background: rgba($accent-primary, 0.1);
  }
}

/* ── Card grid ── */
.card-grid {
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.tpl-card {
  background: $bg-surface;
  border: 1px solid $border-subtle;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;

  &:hover {
    border-color: $accent-primary;
    transform: translateY(-3px);
  }
}

.cover {
  width: 100%;
  aspect-ratio: 3/4;
  background: #111110;
  overflow: hidden;
  position: relative;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cover-video {
    width: 100%;
    height: 100%;
    background: #111110;
    pointer-events: none;

    :deep(.vue3-video-player),
    :deep(.vcp-container) {
      width: 100% !important;
      height: 100% !important;
    }

    :deep(video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    :deep(.vcp-dashboard),
    :deep(.play-pause-layer),
    :deep(.vcp-controls) {
      display: none !important;
    }
  }
}

.card-body {
  padding: 12px 14px 14px;
}

.card-title {
  font-size: 14px;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: $text-dim;
  margin-bottom: 8px;

  .meta-author {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta-stat {
    flex-shrink: 0;
    color: $text-faint;
  }
}

.card-stats {
  font-size: 12px;
  color: $accent-text;
  opacity: 0.85;
}

.empty-state {
  max-width: $max-width;
  margin: 80px auto;
  text-align: center;
  color: $text-dim;
  font-size: 14px;
}

.load-more-tip {
  max-width: $max-width;
  margin: 24px auto 0;
  text-align: center;
  color: $text-dim;
  font-size: 13px;
}

/* ── Mine tab ── */
.mine-section {
  margin: 64px auto 0;
}

.mine-count {
  font-size: 13px;
  color: $text-dim;
  margin-bottom: 16px;
}

.date-group {
  margin-bottom: 28px;

  h4 {
    font-size: 13px;
    font-weight: 600;
    color: $text-dim;
    margin: 0 0 12px;
  }

  .card-grid {
    margin: 0;
  }
}

.mine-card {
  position: relative;
  aspect-ratio: 4 / 5;
  background: $bg-surface;
  border: 1px solid $border-subtle;
  border-radius: $radius-lg;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, transform 0.15s;

  &:hover {
    border-color: $accent-primary;
    transform: translateY(-3px);

    .hover-actions {
      opacity: 1;
    }
  }

  .cover {
    position: relative;
    width: 100%;
    height: 100%;
    background: #111110;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  .footer {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    padding: 28px 12px 10px;
    background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.72) 100%);
    pointer-events: none;
  }

  .title {
    font-size: 13px;
    font-weight: 700;
    color: $text-primary;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 4px;
  }

  .time {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    margin-bottom: 0;
  }

  .stats {
    font-size: 12px;
    color: $accent-text;
    opacity: 0.85;
  }

  &.create {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    border: 1px dashed $border-default;
    background: none;
    color: $text-dim;
    font-size: 13px;
    font-weight: 600;

    &:hover {
      border-color: $accent-primary;
      color: $accent-text;
      transform: none;
    }

    .plus-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid $border-default;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      line-height: 1;
      font-weight: 400;
    }
  }
}

.hover-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 1;

  button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid $border-default;
    background: rgba(10, 10, 20, 0.75);
    color: $text-secondary;
    font-size: 13px;
    cursor: pointer;

    &:hover {
      border-color: $accent-primary;
      color: $accent-text;
    }
  }
}

/* ── Create dialog ── */
.create-mask {
  position: fixed;
  inset: 0;
  background: rgba(4, 4, 10, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}

.create-panel {
  width: 100%;
  max-width: 420px;
  background: $bg-surface;
  border: 1px solid $border-default;
  border-radius: $radius-2xl;
  padding: 28px 28px 24px;
}

.create-title {
  font-size: 18px;
  font-weight: 700;
  color: $text-primary;
  margin: 0 0 20px;
}

.create-label {
  display: block;
  font-size: 13px;
  color: $text-dim;
  margin-bottom: 8px;
}

.create-input {
  width: 100%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid $border-default;
  border-radius: $radius-md;
  color: $text-primary;
  font-size: 14px;
  padding: 11px 14px;
  font-family: inherit;
  outline: none;
  margin-bottom: 24px;

  &:focus {
    border-color: $accent-primary;
  }

  &::placeholder {
    color: $text-faint;
  }
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.create-btn {
  min-width: 72px;
  padding: 9px 18px;
  border-radius: $radius-md;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  transition: $transition-fast;

  &.cancel {
    border: 1px solid $border-default;
    background: transparent;
    color: $text-secondary;

    &:hover {
      border-color: $accent-primary;
      color: $text-primary;
    }
  }

  &.primary {
    border: none;
    background: $accent-primary;
    color: #fff;

    &:hover:not(:disabled) {
      filter: brightness(1.08);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

/* ── Detail overlay ── */
.detail-mask {
  position: fixed;
  inset: 0;
  background: rgba(4, 4, 10, 0.72);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 24px;
}

.detail-panel {
  position: relative;
  background: $bg-surface;
  border: 1px solid $border-default;
  border-radius: $radius-2xl;
  width: 100%;
  max-width: 800px;
  max-height: 86vh;
  overflow-y: auto;
}

.detail-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid $border-default;
  background: rgba(0, 0, 0, 0.3);
  color: $text-secondary;
  font-size: 14px;
  cursor: pointer;
  z-index: 1;

  &:hover {
    border-color: $accent-primary;
    color: $text-primary;
  }
}

.detail-body {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 0;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
}

.detail-preview {
  background: #111110;
  aspect-ratio: 3/4;
  overflow: hidden;

  @media (max-width: 640px) {
    aspect-ratio: 16/9;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .cover-video {
    width: 100%;
    height: 100%;
    background: #111110;
    pointer-events: none;

    :deep(.vue3-video-player),
    :deep(.vcp-container) {
      width: 100% !important;
      height: 100% !important;
    }

    :deep(video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    :deep(.vcp-dashboard),
    :deep(.play-pause-layer),
    :deep(.vcp-controls) {
      display: none !important;
    }
  }
}

.detail-info {
  padding: 32px 28px;
  display: flex;
  flex-direction: column;
}

.detail-title {
  font-size: 20px;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 8px;
}

.detail-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: $text-dim;
  margin-bottom: 16px;
}

.detail-desc {
  font-size: 13px;
  color: $text-muted;
  line-height: 1.7;
  margin-bottom: 16px;
}

.detail-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;

  .tag {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 100px;
    background: rgba($accent-primary, 0.1);
    color: $accent-text;
    border: 1px solid rgba($accent-primary, 0.27);
  }
}

.detail-stats {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid $border-subtle;
  border-radius: $radius-lg;
  padding: 14px 16px;
  margin-bottom: 24px;
  margin-top: auto;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 6px;

  &:last-child {
    margin-bottom: 0;
  }
}

.stat-label {
  color: $text-dim;
}

.stat-value {
  font-weight: 600;
  color: $accent-text;
}

.stat-note {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: $text-faint;
}

.clone-btn {
  width: 100%;
  padding: 13px;
  border: none;
  border-radius: $radius-md;
  background: $accent-primary;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  transition: filter 0.15s;

  &:hover:not(:disabled) {
    filter: brightness(1.1);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// Gallery chrome sits on the light shell. Layout follows the pill / search / chip stack.
.template-login-state {
  padding: 64px 20px;
  text-align: center;
  border: 1px dashed var(--color-border-whisper);
  border-radius: $radius-lg;
  background: var(--color-surface-0);
  h3 {
    font-size: 22px;
    color: var(--color-ink-primary);
  }
  p {
    color: var(--color-ink-secondary);
    margin-bottom: 24px;
  }
}
.login-btn {
  margin-right: 8px;
  padding: 8px 16px;
  border: 0;
  border-radius: 999px;
  background: var(--color-ink-primary);
  color: #fff;
  font: inherit;
  cursor: pointer;
}
.gallery {
  background: transparent;
  color: var(--color-ink-primary);
  flex: 1;
  height: auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 72px 40px 64px;
}
.gallery-top {
  display: flex;
  position: static;
  left: auto;
  max-width: none;
  transform: none;
  justify-content: center;
  margin: 8px 0 28px;
}
.tab-switch {
  width: max-content;
  background: var(--color-surface-2);
  border: 0;
  border-radius: 999px;
  padding: 4px;
  gap: 4px;
}
.tab-btn {
  position: relative;
  padding: 8px 22px;
  border-radius: 999px;
  color: var(--color-ink-secondary);
  &::after {
    display: none;
  }
  &:hover {
    color: var(--color-ink-primary);
  }
  &.active {
    background: var(--color-surface-0);
    color: var(--color-ink-primary);
    box-shadow: var(--shadow-soft);
  }
}
.filter-row {
  align-items: center;
  margin: 0 0 28px;
  flex-direction: column;
  gap: 16px;
}
.search-wrap {
  width: min(100%, 480px);
  box-sizing: border-box;
  background: var(--color-surface-0);
  border-color: var(--color-border-whisper);
  border-radius: 999px;
  box-shadow: var(--shadow-soft);
}
.search-icon {
  color: var(--color-ink-tertiary);
}
.search-input {
  min-width: 0;
  padding: 12px 0;
  font-size: 14px;
  color: var(--color-ink-primary);
  &::placeholder {
    color: var(--color-ink-tertiary);
  }
}
.category-list {
  justify-content: center;
  max-width: 920px;
  gap: 8px;
}
.chip {
  background: var(--color-surface-2);
  color: var(--color-ink-secondary);
  border-color: transparent;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  &:hover {
    background: var(--color-surface-0);
    color: var(--color-ink-primary);
  }
  &.active {
    background: var(--color-surface-0);
    border-color: transparent;
    color: var(--color-ink-primary);
    box-shadow: var(--shadow-soft);
  }
}
.kw-hl {
  color: inherit;
}
.card-grid {
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 24px 18px;
}
.tpl-card {
  background: transparent;
  border-color: transparent;
  border-radius: $radius-md;
  &:hover {
    border-color: transparent;
    transform: none;
  }
  .cover {
    aspect-ratio: 4/5;
    height: auto;
    background: var(--color-surface-2);
    border-radius: $radius-md;
  }
  .card-body {
    padding: 12px 8px 8px;
  }
}
.card-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  margin: 0 0 6px;
  color: var(--color-ink-primary);
}
.card-meta {
  color: var(--color-ink-secondary);
  font-size: 12px;
  line-height: 1.5;
  margin: 0;
  gap: 8px;
}
.empty-state,
.load-more-tip,
.mine-count,
.date-group h4 {
  color: var(--color-ink-secondary);
}
.category-tag {
  flex-shrink: 0;
  max-width: 65%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.category-tag + .meta-author {
  border-left: 1px solid $border-default;
  padding-left: 8px;
}
.retry-btn {
  color: var(--color-creative-violet);
}
.skeleton-card .cover {
  background: linear-gradient(120deg, var(--color-surface-2), var(--color-surface-0), var(--color-surface-2));
}
.skeleton-title {
  background: var(--color-surface-2);
}
.detail-panel,
.create-panel {
  width: 100%;
  max-width: 100%;
  border: 0;
  box-shadow: none;
  background: var(--color-surface-0);
  color: var(--color-ink-primary);
}
.create-title,
.detail-title,
.stat-value {
  color: var(--color-ink-primary);
}
.create-label,
.detail-meta,
.detail-desc,
.stat-label,
.stat-note {
  color: var(--color-ink-secondary);
}
.create-input {
  background: var(--color-surface-1);
  border-color: var(--color-border-whisper);
  color: var(--color-ink-primary);
}
.create-btn.cancel {
  border-color: var(--color-border-whisper);
  color: var(--color-ink-secondary);
}
.detail-stats {
  background: var(--color-surface-1);
  border-color: var(--color-border-whisper);
}
.clone-btn,
.create-btn.primary {
  background: $accent-primary;
  color: #fff;
  &:hover:not(:disabled) {
    background: $accent-hover;
    filter: none;
  }
}
.tag {
  background: var(--color-warm-accent);
  color: var(--color-ink-secondary);
  border-color: transparent;
}
.detail-preview {
  background: var(--color-surface-2);
}
.mine-card {
  background: var(--color-surface-0);
  border: 1px solid var(--color-border-whisper);
  border-radius: $radius-lg;
}
.mine-card.create {
  color: var(--color-ink-secondary);
  background: var(--color-surface-0);
  border: 1px dashed var(--color-border-whisper);
}
.mine-card .cover {
  background: var(--color-surface-2);
}
.mine-card .plus-circle {
  background: var(--color-surface-2);
  border-color: var(--color-border-whisper);
  color: var(--color-ink-primary);
}
.mine-card:hover {
  border-color: var(--color-ink-quaternary);
  transform: none;
}
.mine-card .title {
  color: #fff;
}
.mine-card .footer {
  background: linear-gradient(transparent, rgba(17, 24, 39, 0.72));
}
.mine-card .time {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.78);
}
.mine-section {
  margin-top: 28px;
}
.hover-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: var(--color-surface-0);
  color: var(--color-ink-primary);
  border-color: var(--color-border-whisper);
}
button:focus-visible,
article:focus-visible {
  outline: 2px solid var(--color-creative-violet);
  outline-offset: 3px;
}
@media (max-width: 767px) {
  .gallery {
    padding: 88px 16px 48px;
  }
  .card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 18px 12px;
  }
  .filter-row {
    margin-top: 0;
  }
  .detail-panel {
    width: 100%;
    max-height: calc(100dvh - 100px);
    overflow: auto;
  }
  .detail-body {
    flex-direction: column;
  }
  .detail-preview {
    width: 100%;
    max-height: 36vh;
  }
  .detail-info {
    padding: 22px;
  }
  .search-wrap {
    width: 100%;
  }
}
@media (prefers-reduced-motion: reduce) {
  .tpl-card,
  .mine-card,
  .tab-btn,
  .hover-actions {
    transition: none;
  }
  .mine-card:hover {
    transform: none;
  }
}
</style>

<style scoped lang="scss">
.mine-card:focus-within .hover-actions {
  opacity: 1;
}
@media (hover: none), (max-width: 767px) {
  .mine-card .hover-actions {
    opacity: 1;
  }
}
</style>
