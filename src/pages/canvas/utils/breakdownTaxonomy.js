export const SHOT_SIZES = {
  none: { zh: '无景别', color: '#e4e8d9' },
  'extreme-wide': { zh: '大远景', color: '#dae0c8' },
  wide: { zh: '全景', color: '#c4cfaa' },
  'medium-wide': { zh: '中远景', color: '#b0c091' },
  medium: { zh: '中景', color: '#94aa74' },
  'medium-close': { zh: '中近景', color: '#788f58' },
  close: { zh: '特写', color: '#526f45' },
  'extreme-close': { zh: '大特写', color: '#345136' }
}

export const SHOT_CATEGORIES = {
  establishing: { zh: '定场' },
  subject: { zh: '主体' },
  dialogue: { zh: '对话' },
  reaction: { zh: '反应' },
  insert: { zh: '插入特写' },
  pov: { zh: '主观' },
  empty: { zh: '空镜' },
  product: { zh: '产品展示' },
  'text-card': { zh: '字卡' },
  transition: { zh: '转场镜头' },
  archive: { zh: '引用素材' }
}

export const CAMERA_MOVES = {
  static: { zh: '固定' },
  'push-in': { zh: '推' },
  'pull-out': { zh: '拉' },
  'zoom-in': { zh: '变焦推' },
  'zoom-out': { zh: '变焦拉' },
  'pan-left': { zh: '左摇' },
  'pan-right': { zh: '右摇' },
  'tilt-up': { zh: '上摇' },
  'tilt-down': { zh: '下摇' },
  'truck-left': { zh: '左移' },
  'truck-right': { zh: '右移' },
  'pedestal-up': { zh: '升' },
  'pedestal-down': { zh: '降' },
  tracking: { zh: '跟拍' },
  arc: { zh: '环绕' },
  'whip-pan': { zh: '甩镜' },
  handheld: { zh: '手持微晃' },
  shake: { zh: '剧烈晃动' },
  'rack-focus': { zh: '变焦点' },
  'micro-push': { zh: '微推' },
  roll: { zh: '旋转' },
  drone: { zh: '航拍移动' }
}

export const RHYTHM_ROLES = {
  hook: { zh: '钩子' },
  setup: { zh: '铺垫' },
  build: { zh: '递进' },
  beat: { zh: '重音' },
  turn: { zh: '转折' },
  payoff: { zh: '兑现' },
  breath: { zh: '换气' },
  close: { zh: '收口' }
}

const TABLES = {
  size: SHOT_SIZES,
  category: SHOT_CATEGORIES,
  camera: CAMERA_MOVES,
  rhythm: RHYTHM_ROLES
}

export function labelOf(table, key) {
  const dict = typeof table === 'string' ? TABLES[table] : table
  if (!key) return ''
  return dict?.[key]?.zh || key
}

export const STAGE_LABEL = {
  idle: '待开始',
  queued: '排队中',
  seed: '切分镜头',
  frames: '抽取关键帧',
  analyze: '分析镜头',
  validate: '校验质量门',
  done: '完成',
  failed: '失败'
}
