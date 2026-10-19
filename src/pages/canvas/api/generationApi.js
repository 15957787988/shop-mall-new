import request from './request'

const mediaPath = (projectId, item) =>
  `/canvas/projects/${encodeURIComponent(projectId)}/generations/${encodeURIComponent(item.kind)}/${encodeURIComponent(item.taskId)}`

export const generationApi = {
  prepare: (projectId, item, signal) => request.post({
    url: `${mediaPath(projectId, item)}/prepare`, timeout: 120000, silentError: true, signal
  }),
  download: (projectId, item, signal) => request.download({
    url: `${mediaPath(projectId, item)}/download`, timeout: 120000, silentError: true, signal
  }),
  nodes: (projectId) => request.get({
    url: `/canvas/projects/${encodeURIComponent(projectId)}/generations/nodes`, silentError: true
  }),
  videoTasks: (projectId) =>
    request.get({
      url: `/canvas/projects/${encodeURIComponent(projectId)}/video-tasks`,
      timeout: 10000,
      silentError: true
    }),
  list: (projectId, params) =>
    request.get({
      url: `/canvas/projects/${encodeURIComponent(projectId)}/generations`,
      params,
      silentError: true
    })
}
