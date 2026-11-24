/** 将商品信息编译为生成指令，比例与时长仍由所选模型参数控制。 */
export function buildProductVideoPrompt(
  title: string,
  sellingPoints: string,
  requirements: string
): string {
  return [
    '制作商品展示短视频。全部参考图片展示同一商品的不同角度，保持商品的外形、颜色、材质、包装及现有标识一致。',
    ...(title.trim() ? [`商品名称：${title.trim()}`] : []),
    sellingPoints.trim()
      ? `用户提供的卖点或口播文案：${sellingPoints.trim()}`
      : '没有提供宣传文案，不自行编造口播、字幕或功效承诺。',
    requirements.trim()
      ? `创作要求：${requirements.trim()}`
      : '以清晰的商品全貌开始，展示可观察的材质与结构细节，以完整商品展示收尾。画面衔接自然，动作符合商品用途。',
    '参考视频和音频仅作用户提供的创作参考，不改变商品身份。不要凭空添加认证、价格、销量、功效、品牌标识或不存在的功能。画面中的人物与商品保持合理比例，避免物体穿透和结构变形。',
  ].join('\n')
}
