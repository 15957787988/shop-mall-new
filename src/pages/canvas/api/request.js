import axios from 'axios'
import { ApiError } from '@/types/api'
import { buildApiHeaders } from '@/service/http'

function prefix(url) {
  if (!url) return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/admin-api')) return url
  return `/admin-api${url.startsWith('/') ? url : `/${url}`}`
}

async function unwrap(promise) {
  const res = await promise
  const json = res.data
  if (json && typeof json === 'object' && 'code' in json) {
    if (json.code === 401) {
      throw new ApiError(json.msg || '登录已过期，请重新登录', 401, json)
    }
    if (json.code !== 0) {
      throw new ApiError(json.msg || '请求失败', json.code, json)
    }
    return json.data
  }
  return json
}

function config({ timeout, signal }) {
  return { timeout, signal, headers: buildApiHeaders() }
}

const request = {
  get({ url, params, timeout, signal }) {
    return unwrap(axios.get(prefix(url), { ...config({ timeout, signal }), params }))
  },
  post({ url, data, timeout, signal }) {
    return unwrap(axios.post(prefix(url), data, config({ timeout, signal })))
  },
  put({ url, data, timeout, signal }) {
    return unwrap(axios.put(prefix(url), data, config({ timeout, signal })))
  },
  delete({ url, params, timeout, signal }) {
    return unwrap(axios.delete(prefix(url), { ...config({ timeout, signal }), params }))
  },
  upload({ url, data, timeout }) {
    const headers = buildApiHeaders()
    delete headers['Content-Type']
    return unwrap(axios.post(prefix(url), data, { headers, timeout: timeout || 300000 }))
  },
  download({ url, timeout, signal }) {
    return axios
      .get(prefix(url), { ...config({ timeout, signal }), responseType: 'blob' })
      .then((res) => res.data)
  },
}

export default request
