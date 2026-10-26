import request from './request'

const base = (projectId) => `/canvas/projects/${encodeURIComponent(projectId)}/breakdown`

export const breakdownApi = {
  submit: (projectId, body) => request.post({ url: base(projectId), data: body, timeout: 30000 }),
  status: (projectId, nodeId) => request.get({
    url: `${base(projectId)}/status`,
    params: { nodeId },
    timeout: 10000
  }),
  get: (projectId, id) => request.get({
    url: `${base(projectId)}/${encodeURIComponent(id)}`,
    timeout: 30000
  }),
  exportMd: (projectId, id) => request.download({
    url: `${base(projectId)}/${encodeURIComponent(id)}/export?format=md`,
    timeout: 60000
  })
}
