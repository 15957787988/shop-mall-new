import request from './request'

export const projectApi = {
  list: (current = 1, size = 20) =>
    request.get({ url: '/canvas/projects', params: { current, size } }),

  get: (id) =>
    request.get({ url: `/canvas/projects/${id}` }),

  create: (name) =>
    request.post({ url: '/canvas/projects', data: { name } }),

  rename: (id, name) =>
    request.put({ url: `/canvas/projects/${id}`, data: { name } }),

  // 对标 documents PUT：graph 为 JSON 字符串
  autosaveCanvas: (id, { title, graph, cover, clientUpdatedAt, expectedRevision } = {}) =>
    request.put({
      url: `/canvas/projects/${id}/canvas/autosave`,
      data: {
        title,
        ...(expectedRevision != null ? { expectedRevision } : {}),
        graph: typeof graph === 'string' ? graph : JSON.stringify(graph ?? {}),
        cover: cover ?? null,
        clientUpdatedAt: clientUpdatedAt || new Date().toISOString(),
      },
    }),

  delete: (id) =>
    request.delete({ url: `/canvas/projects/${id}` }),

  copy: (id, name) =>
    request.post({
      url: `/canvas/projects/${id}/copy`,
      data: name ? { name } : {},
    }),
}
