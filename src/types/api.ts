/** 后端 CommonResult 统一响应（Yudao 框架） */
export interface CommonResult<T> {
  code: number
  data: T
  msg: string
}

/** 后端分页结果 */
export interface PageResult<T> {
  list: T[]
  total: number
}

/** API 业务错误 */
export class ApiError extends Error {
  code: number
  body?: unknown

  constructor(message: string, code: number, body?: unknown) {
    super(message)
    this.name = "ApiError"
    this.code = code
    this.body = body
  }
}
