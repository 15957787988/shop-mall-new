// 画布项目 Store — 对接 /canvas/projects + /canvas/templates
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { computeProjectStats } from '../utils/projectStats'
import { projectApi } from '../api/projectApi'
import { templateApi } from '../api/templateApi'

function normalizeDoc(doc) {
  if (!doc) return null
  const title = doc.title || doc.name || '未命名项目'
  const updatedAt = doc.updatedAt || doc.updateTime || new Date().toISOString()
  const createdAt = doc.createdAt || doc.createTime || updatedAt
  const stats = doc.nodeCount == null || doc.estimatedPoints == null
    ? computeProjectStats(doc.graph)
    : {}
  return {
    ...doc,
    id: doc.id,
    title,
    name: title,
    updatedAt,
    updateTime: updatedAt,
    createdAt,
    createTime: createdAt,
    userId: doc.userId,
    favorited: doc.favorited ?? false,
    cover: doc.cover ?? null,
    graph: doc.graph ?? null,
    sourceCaseId: doc.sourceCaseId ?? null,
    nodeCount: doc.nodeCount ?? stats.nodeCount,
    estimatedPoints: doc.estimatedPoints ?? stats.estimatedPoints,
  }
}

function upsertLocal(listRef, project) {
  const id = String(project.id)
  listRef.value = [project, ...listRef.value.filter((p) => String(p.id) !== id)]
}

const PAGE_SIZE = 15

export const useProjectStore = defineStore('canvas_projects', () => {
  const projects = ref([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const hasMore = ref(true)
  const currentPage = ref(1)

  async function fetchProjects(reset = true) {
    if (reset) {
      currentPage.value = 1
      hasMore.value = true
      loading.value = true
      loadingMore.value = false
      projects.value = []
    } else {
      if (!hasMore.value || loading.value || loadingMore.value) return
      loadingMore.value = true
    }
    try {
      const page = reset ? 1 : currentPage.value + 1
      const res = await projectApi.list(page, PAGE_SIZE)
      const list = (res?.list ?? []).map(normalizeDoc)
      projects.value = reset ? list : [...projects.value, ...list]
      currentPage.value = page
      const total = res?.total
      hasMore.value =
        total != null ? projects.value.length < total : list.length >= PAGE_SIZE
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  function loadMoreProjects() {
    return fetchProjects(false)
  }

  function getProject(id) {
    return projects.value.find((p) => String(p.id) === String(id)) ?? null
  }

  async function fetchProject(id) {
    const remote = await projectApi.get(id)
    const project = normalizeDoc(remote)
    if (!project?.id) throw new Error(`Project ${id} not found`)
    upsertLocal(projects, project)
    return project
  }

  async function createProject(name = '未命名项目') {
    const remote = await projectApi.create(name)
    const project = normalizeDoc(remote)
    if (!project?.id) throw new Error('创建项目失败')
    upsertLocal(projects, project)
    return project
  }

  async function renameProject(id, name) {
    const remote = await projectApi.rename(id, name)
    const project = normalizeDoc(remote)
    if (project?.id) {
      upsertLocal(projects, project)
      return project
    }
    const idx = projects.value.findIndex((p) => String(p.id) === String(id))
    if (idx >= 0) {
      projects.value[idx] = normalizeDoc({
        ...projects.value[idx],
        title: name,
        updatedAt: new Date().toISOString(),
      })
    }
    return projects.value[idx] ?? null
  }

  /** 自动保存 — graphDoc 为 GraphDocument 对象或已序列化字符串 */
  async function saveCanvas(id, graphDoc) {
    const { stringifyGraph, extractCoverFromGraph } = await import('../utils/graphAdapter')
    const graphStr = typeof graphDoc === 'string' ? graphDoc : stringifyGraph(graphDoc)
    const parsed = typeof graphDoc === 'string' ? JSON.parse(graphDoc) : graphDoc
    const cover = extractCoverFromGraph(parsed)
    const remote = await projectApi.autosaveCanvas(id, {
      title: parsed?.title,
      graph: graphStr,
      cover,
      clientUpdatedAt: new Date().toISOString(),
    })
    const project = normalizeDoc(remote)
    if (project?.id) {
      upsertLocal(projects, project)
      return project
    }
    // 兜底：接口未回完整对象时仍更新本地缓存
    const idx = projects.value.findIndex((p) => String(p.id) === String(id))
    if (idx >= 0) {
      const stats = computeProjectStats(parsed)
      projects.value[idx] = normalizeDoc({
        ...projects.value[idx],
        title: parsed?.title || projects.value[idx].title,
        graph: graphStr,
        cover: cover || projects.value[idx].cover,
        updatedAt: new Date().toISOString(),
        nodeCount: stats.nodeCount,
        estimatedPoints: stats.estimatedPoints,
      })
      return projects.value[idx]
    }
    return null
  }

  async function deleteProject(id) {
    await projectApi.delete(id)
    projects.value = projects.value.filter((p) => String(p.id) !== String(id))
  }

  async function copyProject(id, name) {
    const remote = await projectApi.copy(id, name)
    const project = normalizeDoc(remote)
    if (!project?.id) throw new Error('复制失败')
    upsertLocal(projects, project)
    return project
  }

  async function cloneFromTemplate(templateId, name) {
    const remote = await templateApi.clone(templateId, name)
    let project = normalizeDoc(remote)
    if (!project?.id) throw new Error('同款失败')
    if (project.graph != null) {
      // 编辑器进页会 fetchProject 覆盖本地，必须先把补齐后的 prompt 写回服务端
      const { hydrateGraphPrompts } = await import('../utils/hydrateGraphPrompts')
      project.graph = hydrateGraphPrompts(project.graph)
      project = (await saveCanvas(project.id, project.graph)) || project
    }
    upsertLocal(projects, project)
    return project
  }

  return {
    projects,
    loading,
    loadingMore,
    hasMore,
    fetchProjects,
    loadMoreProjects,
    fetchProject,
    getProject,
    createProject,
    renameProject,
    saveCanvas,
    deleteProject,
    copyProject,
    cloneFromTemplate,
  }
})
