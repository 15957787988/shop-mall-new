import request from './request'

const root = '/ai/video-depth'
export const videoDepthApi = {
  config: () => request.get({ url: `${root}/config`, timeout: 15000 }),
  create: (data) => request.post({ url: `${root}/tasks`, data, timeout: 20000 }),
  get: (id, signal) => request.get({ url: `${root}/tasks/${id}`, timeout: 15000, signal }),
  history: (projectId, signal) =>
    request.get({ url: `${root}/tasks`, params: { projectId }, timeout: 15000, signal }),
}
