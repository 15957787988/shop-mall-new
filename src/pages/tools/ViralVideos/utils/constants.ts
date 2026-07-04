/** 视频风格 videoType 与展示配置 */
export const VIDEO_TYPE_CONFIG = [
  {
    id: 'ugc',
    videoType: 101,
    label: 'UGC 种草',
    desc: '用户视角真实分享体验',
    tip: '真实用户口吻分享，突出使用感受与种草理由',
    previewVideo:
      'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/9c7622aa7fce46b03bd3a7c587c83e7c.mp4',
  },
  {
    id: 'drama',
    videoType: 102,
    label: '带货短剧',
    desc: '短剧带货情节植入',
    hot: true,
    tip: '卖点框输入：古装、现代、家庭、搞笑',
    previewVideo:
      'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/3e0a3449bfd145fdea1e9c60a50d2ede.mov',
  },
  {
    id: 'demo',
    videoType: 103,
    label: '产品演示',
    desc: '多角度展示 + 使用演示',
    tip: '多角度展示产品细节与使用方式',
    previewVideo:
      'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/282d4b7820031c0c9e20c0d65013fafb.mp4',
  },
  {
    id: 'talk',
    videoType: 104,
    label: '产品口播',
    desc: '面对镜头讲解产品卖点',
    tip: '卖点框输入：古装、现代、家庭、搞笑',
    previewVideo:
      'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/a26f8e81b9eec3ae34b03217c045d013.mp4'
  },
  {
    id: 'tvc',
    videoType: 105,
    label: 'TVC 广告',
    desc: '品牌广告片质感',
    tip: '强调品牌氛围与视觉质感，适合品牌形象展示',
    previewVideo:
      'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/8c9e8d11e8ff4364d768e7406da422df.mp4',
  },
  {
    id: 'pain',
    videoType: 106,
    label: '痛点解决',
    desc: '痛点场景 → 产品解决',
    tip: '先呈现用户痛点场景，再引出产品解决方案',
    previewVideo:
      'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/a41390f99cf32add8b02939d4957b223.mp4',
  },
  {
    id: 'unbox',
    videoType: 107,
    label: '开箱种草',
    desc: '第一视角拆包惊喜体验',
    tip: '第一视角拆包，营造惊喜与真实感',
    previewVideo:
      'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/2cdeecb79dfa5886839505ddd78a5aeb.mp4',
  },
  {
    id: 'reaction',
    videoType: 108,
    label: '反应展示',
    desc: '首次使用惊喜反应',
    tip: '首次使用反应镜头，突出产品惊艳效果',
    previewVideo:
      'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/03bbd4c05105c9a45a889d6bda5d8279.mp4',
  },
] as const

export type VideoTypeId = (typeof VIDEO_TYPE_CONFIG)[number]['id']

export const VIDEO_TYPE_LABEL_MAP: Record<number, string> = Object.fromEntries(
  VIDEO_TYPE_CONFIG.map((t) => [t.videoType, t.label]),
)

export const SAMPLE_VIDEOS = VIDEO_TYPE_CONFIG.map((t) => t.previewVideo)

export const REPLICATE_DEMOS = [
  {
    productImage: 'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/2aaa72ea08575ca831adcf2603c41058.png',
    reference: {
      label: '参考视频',
      video: 'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/79d3a52c053684f785479d8acbe9f859.mp4',
    },
    output: {
      label: '复刻视频',
      video: 'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/1edc986be22b42708286ac3af205846c.mp4',
    },
  },
  {
    productImage: 'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/83fef0612cb66988d5b59083c582de55.png',
    reference: {
      label: '参考视频',
      video: 'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/3c7c6979cd1b73a08bed6d542fc51f40.mp4',
    },
    output: {
      label: '复刻视频',
      video: 'https://muxunai.oss-cn-hangzhou.aliyuncs.com/mall/8b768709e6bc46c02d560f83f49bb549.mp4',
    },
  },
] as const

export const MARKETS = ['北美', '欧洲', '东南亚', '中国']
export const LANGUAGES = ['英语', '西班牙语', '法语', '中文']

export const RATIO_OPTIONS = [
  { label: '9:16', value: '9:16' },
  { label: '16:9', value: '16:9' },
  { label: '3:4', value: '3:4' },
]

export const MAX_VIDEO_COUNT = 5
export const POLL_INTERVAL_MS = 4000
export const MAX_POLL_COUNT = 90
export const HISTORY_PAGE_SIZE = 12
export const UPLOAD_MAX_COUNT = 5
