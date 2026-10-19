import { ref, reactive } from 'vue'
import { useMessage } from '../shims/message'
import { uploadCanvasFile } from '../utils/uploadFile'
import {
  ACCEPT_AUDIO,
  AUDIO_EXTS,
  AUDIO_MAX_SIZE,
  AUDIO_TYPES,
  isAudioFile,
  readAudioDuration,
  validateAudioUpload
} from '../utils/audioConstraints'
import {
  isValidVideoDuration,
  validateVideoUpload,
  VIDEO_TOTAL_MAX_DURATION
} from '../utils/videoConstraints'
import { validateAudioTotalDuration, AUDIO_TOTAL_MAX_DURATION } from '../utils/audioConstraints'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const VIDEO_TYPES = ['video/mp4', 'video/quicktime']
const DOC_EXTS = ['pdf', 'doc', 'docx', 'txt', 'ppt', 'pptx', 'xls', 'xlsx']
const DOC_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

const ACCEPT_IMAGE = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'
const ACCEPT_VIDEO = 'video/mp4,video/quicktime,.mp4,.mov'
const ACCEPT_DOC = '.pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx'

export function buildMediaAccept({
  allowImage = true,
  allowVideo = true,
  allowAudio = false,
  allowDoc = false
} = {}) {
  const parts = []
  if (allowImage) parts.push(ACCEPT_IMAGE)
  if (allowVideo) parts.push(ACCEPT_VIDEO)
  if (allowAudio) parts.push(ACCEPT_AUDIO)
  if (allowDoc) parts.push(ACCEPT_DOC)
  return parts.join(',')
}

export function detectFileKind(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (IMAGE_TYPES.includes(file.type) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext))
    return 'image'
  if (VIDEO_TYPES.includes(file.type) || ['mp4', 'mov'].includes(ext)) return 'video'
  if (AUDIO_TYPES.includes(file.type) || AUDIO_EXTS.includes(ext)) return 'audio'
  if (DOC_TYPES.includes(file.type) || DOC_EXTS.includes(ext)) return 'document'
  return null
}

let uid = 0

function nextId(kind) {
  return `upload-${kind}-${++uid}`
}

function kindPrefix(kind) {
  if (kind === 'image') return '图片'
  if (kind === 'video') return '视频'
  if (kind === 'audio') return '音频'
  return '文档'
}

function relabelItems(items) {
  const counters = { image: 0, video: 0, audio: 0, document: 0 }
  items.forEach((item) => {
    counters[item.kind] = (counters[item.kind] || 0) + 1
    item.label = `${kindPrefix(item.kind)}${counters[item.kind]}`
  })
}

function readMediaDuration(file) {
  return new Promise((resolve, reject) => {
    const el = document.createElement(file.type.startsWith('video/') ? 'video' : 'audio')
    const url = URL.createObjectURL(file)
    el.preload = 'metadata'
    el.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(el.duration)
    }
    el.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('metadata failed'))
    }
    el.src = url
  })
}

async function resolveUploadUrl(file) {
  return uploadCanvasFile(file)
}

/**
 * 画布资产墙上传逻辑 — 图片 / 视频 / 音频 / 文档
 * ponytail: 校验宽松；限额由 setConfig 按节点类型切换
 */
export function useMediaAssetUpload(options = {}) {
  const message = useMessage()
  const config = reactive({
    maxImages: options.maxImages ?? 6,
    maxVideos: options.maxVideos ?? 3,
    maxAudios: options.maxAudios ?? 1,
    maxDocs: options.maxDocs ?? 0,
    maxTotal: options.maxTotal ?? Infinity,
    maxImageSize: options.maxImageSize ?? 10 * 1024 * 1024,
    maxVideoSize: options.maxVideoSize ?? 50 * 1024 * 1024,
    maxAudioSize: options.maxAudioSize ?? AUDIO_MAX_SIZE,
    maxDocSize: options.maxDocSize ?? 20 * 1024 * 1024,
    allowImage: options.allowImage ?? true,
    allowVideo: options.allowVideo ?? true,
    allowAudio: options.allowAudio ?? true,
    allowDoc: options.allowDoc ?? false,
    /** 图片+视频共享池上限；设置后 image/video 共用此配额 */
    maxVisual: options.maxVisual ?? null,
    /** 外部已占用数量（连线节点资产），计入限额 */
    externalCount: options.externalCount ?? 0,
    /** 外部已占用的图片+视频数量（与 maxVisual 配合） */
    externalVisualCount: options.externalVisualCount ?? 0,
    /** 外部已占用的音频数量 */
    externalAudioCount: options.externalAudioCount ?? 0,
    /** 外部已占用的图片数量（连线节点） */
    externalImageCount: options.externalImageCount ?? 0,
    /** 外部已占用的视频数量（连线节点） */
    externalVideoCount: options.externalVideoCount ?? 0,
    /** 外部已占用音频总时长（秒） */
    externalAudioDuration: options.externalAudioDuration ?? 0,
    /** 外部已占用视频总时长（秒） */
    externalVideoDuration: options.externalVideoDuration ?? 0,
    /** 参考视频总时长上限（秒），来自模型 maxTotalVideoDuration */
    maxVideoTotalDuration: options.maxVideoTotalDuration ?? VIDEO_TOTAL_MAX_DURATION,
    /** 参考音频总时长上限（秒），来自模型 maxTotalAudioDuration */
    maxAudioTotalDuration: options.maxAudioTotalDuration ?? AUDIO_TOTAL_MAX_DURATION
  })

  const items = ref([])

  function setConfig(patch) {
    Object.assign(config, patch)
  }

  // 含 uploading，避免同批多选时超额
  const uploadImageCount = () =>
    items.value.filter((i) => i.kind === 'image' && !i.linkedNodeId).length
  const imageCount = () => items.value.filter((i) => i.kind === 'image').length
  const videoCount = () => items.value.filter((i) => i.kind === 'video').length
  const audioCount = () => items.value.filter((i) => i.kind === 'audio').length
  const imageTotalCount = () => uploadImageCount() + (Number(config.externalImageCount) || 0)
  const videoTotalCount = () => videoCount() + (Number(config.externalVideoCount) || 0)
  const docCount = () => items.value.filter((i) => i.kind === 'document').length
  const totalCount = () => items.value.length + (Number(config.externalCount) || 0)
  /** 未挂节点的上传项；已 linked 的由 externalVisualCount 侧计入 */
  const uploadVisualCount = () =>
    items.value.filter((i) => (i.kind === 'image' || i.kind === 'video') && !i.linkedNodeId).length
  const uploadAudioCount = () =>
    items.value.filter((i) => i.kind === 'audio' && !i.linkedNodeId).length
  const visualCount = () => uploadVisualCount() + (Number(config.externalVisualCount) || 0)
  const audioTotalCount = () => uploadAudioCount() + (Number(config.externalAudioCount) || 0)
  const currentAudioDuration = () => {
    let total = Number(config.externalAudioDuration) || 0
    for (const item of items.value) {
      if (item.kind === 'audio' && !item.linkedNodeId && item.duration) {
        total += Number(item.duration) || 0
      }
    }
    return total
  }
  const currentVideoDuration = () => {
    let total = Number(config.externalVideoDuration) || 0
    for (const item of items.value) {
      if (item.kind === 'video' && !item.linkedNodeId && item.duration) {
        total += Number(item.duration) || 0
      }
    }
    return total
  }
  const usesVisualPool = () => config.maxVisual != null

  function remainVisual() {
    if (!usesVisualPool()) return config.maxImages - imageTotalCount()
    return config.maxVisual - visualCount()
  }

  function canAdd(kind) {
    if (kind === 'image') {
      if (!config.allowImage) return false
      if (usesVisualPool()) return visualCount() < config.maxVisual
      if (totalCount() >= config.maxTotal) return false
      return imageTotalCount() < config.maxImages
    }
    if (kind === 'video') {
      if (!config.allowVideo) return false
      if (usesVisualPool()) return visualCount() < config.maxVisual
      if (totalCount() >= config.maxTotal) return false
      return videoTotalCount() < config.maxVideos
    }
    if (kind === 'audio') {
      if (!config.allowAudio) return false
      if (usesVisualPool()) return audioTotalCount() < config.maxAudios
      if (totalCount() >= config.maxTotal) return false
      return audioTotalCount() < config.maxAudios
    }
    if (kind === 'document') {
      if (!config.allowDoc) return false
      if (totalCount() >= config.maxTotal) return false
      return docCount() < config.maxDocs
    }
    return false
  }

  function limitHint(kind) {
    if (kind === 'image' || kind === 'video') {
      if (usesVisualPool()) return `最多上传 ${config.maxVisual} 个图片/视频/文本`
      if (totalCount() >= config.maxTotal) return `最多上传 ${config.maxTotal} 个文件`
      if (kind === 'image') return `图片上传和连线总共不能超过 ${config.maxImages} 个`
      return `参考视频已达上限 ${config.maxVideos} 个`
    }
    if (kind === 'document') return `最多上传 ${config.maxDocs} 个文档`
    if (usesVisualPool()) return `参考音频已达上限 ${config.maxAudios} 个`
    if (totalCount() >= config.maxTotal) return `最多上传 ${config.maxTotal} 个文件`
    return `参考音频已达上限 ${config.maxAudios} 个`
  }

  /** allow* 为 false 时：platformMax*===0 → 模型不支持；否则 → 已达上限 */
  function kindNotAllowedHint(kind) {
    if (kind === 'image') {
      if (config.maxImages === 0) return '该模型不支持上传参考图片'
      return `图片上传和连线总共不能超过 ${config.maxImages} 个`
    }
    if (kind === 'video') {
      if (config.maxVideos === 0) return '该模型不支持上传参考视频'
      return `参考视频已达上限 ${config.maxVideos} 个`
    }
    if (kind === 'audio') {
      if (config.maxAudios === 0) return '该模型不支持上传参考音频'
      return `参考音频已达上限 ${config.maxAudios} 个`
    }
    if (kind === 'document') return '当前节点不支持上传文档'
    return limitHint(kind)
  }

  function addPlaceholder(kind) {
    const id = nextId(kind)
    items.value.unshift({
      id,
      source: 'upload',
      kind,
      label: '',
      url: '',
      thumb: '',
      uploading: true,
      linkedNodeId: null
    })
    relabelItems(items.value)
    return id
  }

  function finishItem(id, url, extra = {}) {
    const item = items.value.find((i) => i.id === id)
    if (!item) return
    item.url = url
    item.thumb = extra.thumb ?? (item.kind === 'image' ? url : item.kind === 'video' ? url : '')
    item.uploading = false
    Object.assign(item, extra)
    relabelItems(items.value)
  }

  function removePlaceholder(id) {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx >= 0) items.value.splice(idx, 1)
    relabelItems(items.value)
  }

  async function uploadImageFiles(files) {
    const remainByKind = remainVisual()
    const remainTotal = usesVisualPool() ? remainByKind : config.maxTotal - totalCount()
    const remain = Math.min(remainByKind, remainTotal)
    if (remain <= 0) {
      message.warning(limitHint('image'))
      return
    }

    for (const file of files.slice(0, remain)) {
      if (
        !IMAGE_TYPES.includes(file.type) &&
        !['jpg', 'jpeg', 'png', 'webp'].includes((file.name.split('.').pop() || '').toLowerCase())
      ) {
        message.error('图片仅支持 jpg、png、webp')
        continue
      }
      if (file.size > config.maxImageSize) {
        message.error(`图片不能超过 ${config.maxImageSize / 1024 / 1024}MB`)
        continue
      }

      const id = addPlaceholder('image')
      try {
        const url = await resolveUploadUrl(file)
        if (items.value.some((i) => i.url === url && i.id !== id)) {
          removePlaceholder(id)
          continue
        }
        finishItem(id, url)
      } catch {
        removePlaceholder(id)
        message.error('图片上传失败')
      }
    }
  }

  async function uploadVideoFile(file) {
    if (!canAdd('video')) {
      message.warning(limitHint('video'))
      return
    }
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!VIDEO_TYPES.includes(file.type) && !['mp4', 'mov'].includes(ext)) {
      message.error('视频仅支持 mp4、mov')
      return
    }
    if (file.size > config.maxVideoSize) {
      message.error(`视频不能超过 ${config.maxVideoSize / 1024 / 1024}MB`)
      return
    }

    let duration
    try {
      duration = await readMediaDuration(file)
    } catch {
      message.error('无法读取视频时长，请更换文件后重试')
      return
    }
    if (!isValidVideoDuration(duration)) {
      message.error('无法读取视频时长，请更换文件后重试')
      return
    }
    const uploadErr = validateVideoUpload(
      duration,
      currentVideoDuration(),
      config.maxVideoTotalDuration
    )
    if (uploadErr) {
      message.error(uploadErr)
      return
    }

    const id = addPlaceholder('video')
    try {
      const url = await resolveUploadUrl(file)
      finishItem(id, url, { duration })
    } catch {
      removePlaceholder(id)
      message.error('视频上传失败')
    }
  }

  async function uploadAudioFile(file) {
    if (!canAdd('audio')) {
      message.warning(limitHint('audio'))
      return
    }
    if (!isAudioFile(file)) {
      message.error('音频仅支持 mp3、wav')
      return
    }
    if (file.size > config.maxAudioSize) {
      message.error(`音频不能超过 ${config.maxAudioSize / 1024 / 1024}MB`)
      return
    }

    let duration
    try {
      duration = await readAudioDuration(file)
    } catch {
      message.error('无法读取音频时长，请更换文件后重试')
      return
    }
    const err = validateAudioUpload(file, duration, config.maxAudioTotalDuration)
    if (err) {
      message.error(err)
      return
    }
    const totalErr = validateAudioTotalDuration(
      currentAudioDuration(),
      duration,
      config.maxAudioTotalDuration
    )
    if (totalErr) {
      message.error(totalErr)
      return
    }

    const id = addPlaceholder('audio')
    try {
      const url = await resolveUploadUrl(file)
      finishItem(id, url, { duration, thumb: url })
    } catch {
      removePlaceholder(id)
      message.error('音频上传失败')
    }
  }

  async function uploadDocFile(file) {
    if (!canAdd('document')) {
      message.warning(limitHint('document'))
      return
    }
    if (file.size > config.maxDocSize) {
      message.error(`文档不能超过 ${config.maxDocSize / 1024 / 1024}MB`)
      return
    }

    const id = addPlaceholder('document')
    try {
      const url = await resolveUploadUrl(file)
      finishItem(id, url, { fileName: file.name })
    } catch {
      removePlaceholder(id)
      message.error('文档上传失败')
    }
  }

  function removeItem(id) {
    const idx = items.value.findIndex((i) => i.id === id)
    if (idx >= 0) items.value.splice(idx, 1)
    relabelItems(items.value)
  }

  /** 从资产库选用：写入墙内上传项（不走文件上传） */
  function addLibraryItem({ url, kind = 'image', name = '', cover = '', duration } = {}) {
    if (!url) return null
    const k = kind === 'video' ? 'video' : kind === 'audio' ? 'audio' : 'image'
    if (!canAdd(k)) {
      message.warning(limitHint(k))
      return null
    }
    if (items.value.some((i) => i.url === url && !i.uploading)) {
      message.warning('该素材已添加')
      return null
    }
    const id = nextId(k)
    items.value.unshift({
      id,
      source: 'upload',
      kind: k,
      label: name || '',
      url,
      thumb: cover || url,
      uploading: false,
      linkedNodeId: null,
      fromLibrary: true,
      duration: Number.isFinite(Number(duration)) ? Number(duration) : undefined
    })
    relabelItems(items.value)
    return id
  }

  function setLinkedNodeId(id, nodeId) {
    const item = items.value.find((i) => i.id === id)
    if (item) item.linkedNodeId = nodeId
  }

  function updateItem(id, patch) {
    const item = items.value.find((i) => i.id === id)
    if (item) Object.assign(item, patch)
  }

  function clear() {
    items.value = []
  }

  function replaceItems(list) {
    items.value = (list || []).map((item) => ({ ...item }))
    relabelItems(items.value)
  }

  /** 合并墙内上传 + 保留进行中的占位，避免刷新冲掉同批多选 */
  function mergeReplaceItems(wallUploads, linkedNodeIds = []) {
    const linkedShown = new Set(linkedNodeIds)
    const byId = new Map()
    for (const u of wallUploads || []) {
      byId.set(u.id, { ...u })
      if (u.linkedNodeId) linkedShown.add(u.linkedNodeId)
    }
    for (const cur of items.value) {
      if (cur.uploading) {
        byId.set(cur.id, cur)
        continue
      }
      // 已挂到连线节点的上传项由 nodeAssets 展示，这里丢掉避免重复
      if (cur.linkedNodeId && linkedShown.has(cur.linkedNodeId)) continue
      if (!byId.has(cur.id)) byId.set(cur.id, { ...cur })
    }
    items.value = [...byId.values()]
    relabelItems(items.value)
  }

  async function uploadFiles(files) {
    const list = Array.from(files || [])
    if (!list.length) return

    const pendingImages = []
    for (const file of list) {
      const kind = detectFileKind(file)
      if (!kind) {
        message.error(`${file.name} 不支持，请检查文件格式`)
        continue
      }
      if (kind === 'image') {
        if (!config.allowImage) {
          message.warning(kindNotAllowedHint('image'))
          continue
        }
        // 同批已入队的也计入，避免一次选超限
        const canQueue = usesVisualPool()
          ? visualCount() + pendingImages.length < config.maxVisual
          : imageTotalCount() + pendingImages.length < config.maxImages &&
            totalCount() + pendingImages.length < config.maxTotal
        if (canQueue) {
          pendingImages.push(file)
        } else {
          message.warning(limitHint('image'))
        }
      } else if (kind === 'video') {
        if (!config.allowVideo) {
          message.warning(kindNotAllowedHint('video'))
          continue
        }
        await uploadVideoFile(file)
      } else if (kind === 'audio') {
        if (!config.allowAudio) {
          message.warning(kindNotAllowedHint('audio'))
          continue
        }
        await uploadAudioFile(file)
      } else if (kind === 'document') {
        if (!config.allowDoc) {
          message.warning('当前节点不支持上传文档')
          continue
        }
        await uploadDocFile(file)
      }
    }
    if (pendingImages.length) await uploadImageFiles(pendingImages)
  }

  const canAddAny = () =>
    canAdd('image') || canAdd('video') || canAdd('audio') || canAdd('document')

  const ACCEPT = buildMediaAccept(config)

  return {
    items,
    config,
    setConfig,
    canAdd,
    canAddAny,
    uploadFiles,
    removeItem,
    addLibraryItem,
    setLinkedNodeId,
    updateItem,
    clear,
    replaceItems,
    mergeReplaceItems,
    ACCEPT,
    buildMediaAccept
  }
}
