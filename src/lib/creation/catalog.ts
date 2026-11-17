export type ImageToolCode =
  | 'product-set'
  | 'detail-page'
  | 'image-remix'
  | 'product-retouch'
  | 'virtual-try-on'
  | 'fashion-set'

export interface ReferenceGroup {
  key: string
  label: string
  hint: string
  min: number
  max: number
}
export interface CreationModule {
  id: string
  name: string
  description?: string
  instruction: string
}
export interface ImageTool {
  code: ImageToolCode
  name: string
  description: string
  icon: string
  cover: string
  tone: string
  groups: ReferenceGroup[]
  modules: CreationModule[]
  defaults: string[]
  rule: string
}
const product: ReferenceGroup = {
  key: 'product',
  label: '商品参考图',
  hint: '同一商品的不同角度，保留外形、颜色、材质与包装',
  min: 1,
  max: 3,
}
const modules = (...rows: [string, string, string][]): CreationModule[] =>
  rows.map(([id, name, instruction]) => ({ id, name, instruction }))

export const imageTools: ImageTool[] = [
  {
    code: 'product-set',
    name: '商品套图',
    description: '从一张商品图，制作风格统一的电商图片。',
    icon: 'picture',
    cover: 'skincare',
    tone: 'sky',
    groups: [product],
    modules: modules(
      ['hero', '商品主图', '清晰完整地展示商品，简洁背景，突出主体，不添加文字。'],
      ['white', '白底图', '纯白背景、自然接触阴影，商品完整无裁切，不添加道具和文字。'],
      ['scene', '场景图', '在与商品用途相关的真实场景中展示商品，尺度和摆放合理。'],
      ['detail', '细节图', '展示参考图中真实可见的材质与结构细节，不臆造内部构造。'],
      ['selling', '卖点图', '围绕用户明确提供的卖点设计视觉展示，只使用提供的文案。']
    ),
    defaults: ['hero', 'white', 'scene'],
    rule: '每张图都是同一商品的独立展示，保持全套色调一致。',
  },
  {
    code: 'detail-page',
    name: 'A+ / 详情页',
    description: '上传商品图、填写卖点，按需生成风格统一的详情页图片。',
    icon: 'layout',
    cover: 'interior',
    tone: 'mint',
    groups: [product],
    modules: [
      {
        id: 'banner',
        name: '首屏主视觉',
        description: '传递商品核心价值',
        instruction:
          '设计详情页首屏主视觉：完整清晰的商品主体、醒目的标题与有层次的留白。围绕用户提供的核心卖点设计，不自行创造品牌或口号。',
      },
      {
        id: 'benefits',
        name: '核心卖点图',
        description: '突出差异化优势',
        instruction:
          '设计核心卖点说明图：将用户提供的主要卖点提炼为简短标题与说明，结合对应商品局部展示；不虚构认证、功效、销量、奖项或测试数据。',
      },
      {
        id: 'usage',
        name: '使用场景图',
        description: '呈现真实使用场景',
        instruction:
          '设计使用场景图：将同一商品置于与其用途及目标人群相符的真实环境，展示合理的使用动作和空间尺度，不改变商品结构。',
      },
      {
        id: 'angles',
        name: '多角度图',
        description: '多角度呈现外观',
        instruction:
          '设计多角度外观展示图：用整洁的分区呈现参考图中已知的不同视角，保持商品比例、颜色、材质和标识一致；未提供背面或内部参考时不臆造其结构，以已知视角和可见细节组织版面。',
      },
      {
        id: 'brand',
        name: '品牌故事图',
        description: '表达品牌理念与故事',
        instruction:
          '设计品牌故事图：依据用户提供的品牌名称、理念和故事组织文字与商品画面；未提供品牌故事时仅展示商品与已提供文案，不编造品牌历史、创始人、产地或品牌标识。',
      },
      {
        id: 'comparison',
        name: '效果对比图',
        description: '展示有依据的对比',
        instruction:
          '设计效果对比图：仅使用用户明确提供的对比对象、前后效果和数据，清晰标明对比条件；缺少对比依据时改为商品特性分区展示，不编造使用前后效果、竞品、提升百分比或功效承诺。',
      },
      {
        id: 'craft',
        name: '工艺制作图',
        description: '展示材质与制作细节',
        instruction:
          '设计工艺制作图：以真实可见的材质、缝线、表面处理或用户明确提供的制作工序为重点；没有制作信息时只展示可见细节，不虚构工厂、生产流程、技术专利或内部剖面。',
      },
      {
        id: 'size',
        name: '尺寸尺码图',
        description: '清晰说明尺寸与尺码',
        instruction:
          '设计尺寸尺码图：仅按用户提供的尺寸、单位、尺码及测量说明排版，以清晰的标注线对应商品部位；未提供数值时只呈现商品轮廓，不从图片估算尺寸，也不生成虚假尺码表。',
      },
      {
        id: 'specs',
        name: '规格/参数表',
        description: '展示详细商品数据',
        instruction:
          '设计规格参数图：把用户提供的型号、容量、重量、规格等信息整理为易读的参数表，单位保持准确；缺失字段省略，不编造参数或填写示例数字。',
      },
      {
        id: 'accessories',
        name: '配件/赠品图',
        description: '明确包装内物品',
        instruction:
          '设计配件赠品图：仅展示用户明确列出的随箱配件、包装内容或赠品，分区排列并标注其名称；不得把场景道具当作赠品，未提供清单时只展示主商品。',
      },
      {
        id: 'series',
        name: '系列展示图',
        description: '展示已有颜色或 SKU',
        instruction:
          '设计系列展示图：按用户提供的颜色、款式、型号或 SKU 展示商品系列，统一尺度与背景；没有系列信息时只展示当前款，不擅自增加颜色、型号和套装。',
      },
      {
        id: 'ingredients',
        name: '商品成分图',
        description: '说明已知配方与材质',
        instruction:
          '设计商品成分图：只使用用户提供的配方、成分、材质及含量，结合对应材料的视觉表达；未知成分或比例省略，不凭外观推断配方，不生成医疗或安全认证承诺。',
      },
      {
        id: 'warranty',
        name: '售后保障图',
        description: '说明实际售后政策',
        instruction:
          '设计售后保障图：只展示用户提供的保修、退换货、客服和售后条件；没有政策时不编造保修期限、无理由退换、包邮、退款承诺或第三方保障标识。',
      },
      {
        id: 'tips',
        name: '使用建议图',
        description: '展示使用与养护建议',
        instruction:
          '设计使用建议图：依据用户提供的使用、安装、清洁或养护说明组织步骤与图示；未提供说明时不虚构操作步骤、适用禁忌或安全结论，以商品展示为主。',
      },
    ],
    defaults: ['banner', 'benefits', 'usage', 'angles', 'comparison'],
    rule: '输出可组合的详情页图片模块，不包含网页代码。参考图属于同一商品，以其真实颜色、外形、包装与标识为准；所有模块共用同一套背景配色、灯光风格、字体层级和版式间距。文字清晰简洁，保留安全留白，不将整套内容挤入一张图片。图片尺寸与比例以生成设置为准，不声称已通过上架平台审核。',
  },
  {
    code: 'image-remix',
    name: '图片复刻',
    description: '保留参考画面的构图，用你的商品重新创作。',
    icon: 'copy',
    cover: 'fashion',
    tone: 'peach',
    groups: [
      {
        key: 'layout',
        label: '构图参考图',
        hint: '确定构图、背景、光线与视觉风格',
        min: 1,
        max: 1,
      },
      product,
    ],
    modules: modules([
      'remix',
      '复刻画面',
      '沿用构图参考图的主体位置、画面层次、灯光方向和配色，将其中商品替换为商品参考图。不要把商品图的背景复制进画面。',
    ]),
    defaults: ['remix'],
    rule: '构图参考与商品参考用途不同，明确区分。原参考中未提供替代内容的文字不要擅自改写为虚构品牌宣传。',
  },
  {
    code: 'product-retouch',
    name: '产品精修',
    description: '改善光线与背景，保留商品真实结构和质感。',
    icon: 'magic',
    cover: 'shoe',
    tone: 'cream',
    groups: [product],
    modules: modules(
      [
        'clean',
        '商业精修',
        '保持参考图1的构图、结构和颜色，改善曝光、清理背景杂物，保留真实材质纹理，不改变商标与包装内容。',
      ],
      ['white', '白底精修', '将背景处理为干净白色，保留自然接触阴影与完整商品轮廓。'],
      [
        'texture',
        '质感优化',
        '柔和调整反光与光线，呈现参考中真实存在的材质纹理，不新增构造和配件。',
      ]
    ),
    defaults: ['clean'],
    rule: '这是商品参考图的精修，不是重新设计商品；避免过度磨皮和材质塑料化。',
  },
  {
    code: 'virtual-try-on',
    name: '模特穿戴',
    description: '指定模特与服装，制作协调自然的穿戴展示。',
    icon: 'person',
    cover: 'fashion',
    tone: 'lavender',
    groups: [],
    modules: [],
    defaults: [],
    rule: '',
  },
  {
    code: 'fashion-set',
    name: '服装组图',
    description: '为同一套服装制作全身、侧面和细节展示。',
    icon: 'grid',
    cover: 'fashion',
    tone: 'rose',
    groups: [],
    modules: [],
    defaults: [],
    rule: '',
  },
]

export const creationTools = [
  ...imageTools
    .slice(0, 3)
    .map((tool) => ({ ...tool, href: `/${tool.code}`, media: '图片' })),
  {
    code: 'video-remix',
    name: '视频复刻',
    description: '分析原片镜头与节奏，按参考素材制作新视频。',
    icon: 'video',
    cover: 'landscape',
    tone: 'lavender',
    href: '/video-remix',
    media: '视频',
  },
  {
    code: 'product-video',
    name: '带货视频',
    description: '上传商品、描述卖点，制作产品展示短片。',
    icon: 'play',
    cover: 'perfume',
    tone: 'cream',
    href: '/product-video',
    media: '视频',
  },
  ...imageTools.slice(3).map((tool) => ({ ...tool, href: `/${tool.code}`, media: '图片' })),
]

export function imageTool(code: string): ImageTool {
  return imageTools.find((tool) => tool.code === code) || imageTools[0]
}

export function buildImagePrompts(
  tool: ImageTool,
  form: {
    title: string
    sellingPoints: string
    requirements: string
    platform: string
    language: string
    references: Record<string, string[]>
    selectedModules: string[]
  }
): { label: string; prompt: string }[] {
  let offset = 0
  const bindings = tool.groups.flatMap((group) => {
    const count = (form.references[group.key] || []).length
    const indexes = Array.from({ length: count }, (_, i) => `参考图${offset + i + 1}`).join('、')
    offset += count
    return count ? [`${indexes}：${group.label}。${group.hint}。`] : []
  })
  const selected = tool.modules.filter((module) => form.selectedModules.includes(module.id))
  return selected.map((module) => ({
    label: module.name,
    prompt: [
      `任务：${tool.name} / ${module.name}。输出一张完成的图片。`,
      ...bindings,
      form.title.trim() ? `商品或品牌名称：${form.title.trim()}` : '',
      form.sellingPoints.trim()
        ? `用户提供的卖点 / 文案：${form.sellingPoints.trim()}`
        : '未提供宣传文案，不生成宣传文字。',
      `使用场景：${form.platform}。需要文字时使用${form.language}。`,
      tool.rule,
      tool.code === 'detail-page'
        ? `本套详情页模块顺序：${selected.map((item) => item.name).join(' → ')}。当前只制作“${
            module.name
          }”，作为独立图片交付，与其他模块保持统一视觉。缺少必要事实时省略相应文字和数据，不在成图上写“未提供”或占位内容。`
        : '',
      module.instruction,
      form.requirements.trim() ? `补充要求：${form.requirements.trim()}` : '',
      '严格参考商品、服装和人物的对应关系。不得凭空添加品牌标识、认证、尺寸数值或宣传承诺。',
    ]
      .filter(Boolean)
      .join('\n'),
  }))
}
