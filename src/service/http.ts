import axios, { type AxiosRequestConfig } from 'axios'
import NProgress from 'nprogress'
import { ApiError, type CommonResult } from '@/types/api'
import { getAccessToken } from '@/lib/auth/storage'
import { getTenantId } from '@/lib/auth/tenant'
import { apiEnv } from '@/service/env'

axios.defaults.baseURL = apiEnv.baseUrl
axios.defaults.timeout = 120000
axios.defaults.headers.post['Content-Type'] = 'application/json;charset=UTF-8'

export interface HttpRequestOptions {
  /** 跳过鉴权头（登录等匿名接口） */
  skipAuth?: boolean
  /** 覆盖默认 Authorization */
  authorization?: string
  headers?: Record<string, string>
}

let onUnauthorized: (() => void) | null = null

export function setOnUnauthorized(cb: (() => void) | null) {
  onUnauthorized = cb
}

function resolveUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${apiEnv.baseUrl}${normalized}`
}

export { resolveUrl as resolveApiUrl }

export function buildApiHeaders(
  init?: Record<string, string>,
  options?: { skipAuth?: boolean },
): Record<string, string> {
  const headers: Record<string, string> = { ...init }
  if (!headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  headers['tenant-id'] = getTenantId()
  if (!options?.skipAuth) {
    const token = getAccessToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }
  return headers
}

function unwrapResponse<T>(json: CommonResult<T>, skipAuth?: boolean): T {
  if (!skipAuth && json.code === 401) {
    onUnauthorized?.()
    throw new ApiError(json.msg || '登录已过期，请重新登录', 401, json)
  }
  if (json.code !== 0) {
    throw new ApiError(json.msg || '请求失败', json.code, json)
  }
  return json.data
}

function assertNotMock() {
  if (apiEnv.useMock) {
    throw new ApiError('VITE_USE_MOCK=true，未走真实接口', -1)
  }
}

function mergeAxiosConfig(
  options?: HttpRequestOptions,
  extra?: AxiosRequestConfig,
): AxiosRequestConfig {
  const headers = buildApiHeaders(options?.headers, {
    skipAuth: options?.skipAuth,
  })
  if (options?.authorization && !options.skipAuth) {
    const auth = options.authorization.startsWith('Bearer ')
      ? options.authorization
      : `Bearer ${options.authorization}`
    headers.Authorization = auth
  }
  return {
    ...extra,
    headers: {
      ...headers,
      ...extra?.headers,
    },
  }
}

axios.interceptors.request.use(
  (config) => {
   // NProgress.start()
    return config
  },
  (error) => {
   // NProgress.done()
    return Promise.reject(error)
  },
)

axios.interceptors.response.use(
  (res) => {
  //  NProgress.done()
    return res
  },
  (error) => {
  //  NProgress.done()
    return Promise.reject(error)
  },
)

interface Http {
  get<T>(url: string, params?: unknown, options?: HttpRequestOptions): Promise<T>
  post<T>(url: string, params?: unknown, options?: HttpRequestOptions): Promise<T>
  put<T>(url: string, params?: unknown, options?: HttpRequestOptions): Promise<T>
  delete<T>(url: string, params?: unknown, options?: HttpRequestOptions): Promise<T>
  upload<T>(url: string, formData: FormData, options?: HttpRequestOptions): Promise<T>
  getBlob(
    url: string,
    params?: unknown,
    options?: HttpRequestOptions,
  ): Promise<Blob>
  fetchStream(
    url: string,
    body: unknown,
    options?: HttpRequestOptions,
  ): Promise<Response>
}

const http: Http = {
  get<T>(url: string, params?: unknown, options?: HttpRequestOptions) {
    assertNotMock()
    return axios
      .get<CommonResult<T>>(url, mergeAxiosConfig(options, { params }))
      .then((res) => unwrapResponse(res.data, options?.skipAuth))
  },

  post<T>(url: string, params?: unknown, options?: HttpRequestOptions) {
    assertNotMock()
    return axios
      .post<CommonResult<T>>(url, params, mergeAxiosConfig(options))
      .then((res) => unwrapResponse(res.data, options?.skipAuth))
  },

  put<T>(url: string, params?: unknown, options?: HttpRequestOptions) {
    assertNotMock()
    return axios
      .put<CommonResult<T>>(url, params, mergeAxiosConfig(options))
      .then((res) => unwrapResponse(res.data, options?.skipAuth))
  },

  delete<T>(url: string, params?: unknown, options?: HttpRequestOptions) {
    assertNotMock()
    return axios
      .delete<CommonResult<T>>(url, mergeAxiosConfig(options, { params }))
      .then((res) => unwrapResponse(res.data, options?.skipAuth))
  },

  upload<T>(url: string, formData: FormData, options?: HttpRequestOptions) {
    assertNotMock()
    const headers = buildApiHeaders({}, { skipAuth: options?.skipAuth })
    delete headers['Content-Type']
    return axios
      .post<CommonResult<T>>(url, formData, {
        headers: {
          ...headers,
          ...options?.headers,
        },
      })
      .then((res) => unwrapResponse(res.data, options?.skipAuth))
  },

  getBlob(url, params, options) {
    assertNotMock()
    return axios
      .get(url, {
        ...mergeAxiosConfig(options, { params }),
        responseType: 'blob',
      })
      .then((res) => res.data as Blob)
  },

  async fetchStream(url, body, options) {
    assertNotMock()
    const response = await fetch(resolveUrl(url), {
      method: 'POST',
      headers: buildApiHeaders(options?.headers, { skipAuth: options?.skipAuth }),
      body: JSON.stringify(body),
    })
    if (response.status === 401) {
      onUnauthorized?.()
      throw new ApiError('登录已过期，请重新登录', 401)
    }
    if (!response.ok) {
      throw new ApiError(`请求失败 (${response.status})`, response.status)
    }
    return response
  },
}

export default http
