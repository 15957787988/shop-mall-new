/**
 * 切换 AI 面板节点前必须先 flush 旧节点。
 * 否则其它 watch（入边/上游输出）会先把新节点空内容灌进共享 promptText，
 * 再被 activePanelNodeId watch flush 写回旧节点 → 互相覆盖。
 */
export function flushBeforePanelSwitch(currentId, nextId, flush) {
  if (currentId && currentId !== nextId) flush(currentId)
}

/**
 * VueFlow selected 与 activePanelNodeId 解耦后，selection-on-drag 等路径
 * 只改选中框、不走 node-click → 面板仍挂旧节点。
 * 用选中的面板节点 id 列表推导下一个 activePanelNodeId。
 */
export function nextActivePanelId(selectedPanelIds, currentId) {
  if (selectedPanelIds.length === 1) return selectedPanelIds[0]
  if (selectedPanelIds.length === 0) return null
  if (currentId && selectedPanelIds.includes(currentId)) return currentId
  return selectedPanelIds[selectedPanelIds.length - 1]
}
