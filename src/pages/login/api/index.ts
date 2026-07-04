import http from '@/service/http'
import type { LoginResp, TenantInfo, WechatQrCodeResp } from './types'
import { SMS_SCENE } from './types'

const AUTH_PREFIX = '/admin-api/system/auth'
const TENANT_PREFIX = '/admin-api/system/tenant'

/** 用户名 + 密码登录（无需已登录） */
export async function loginByPassword(
  username: string,
  password: string,
): Promise<LoginResp> {
  return http.post<LoginResp>(
    `${AUTH_PREFIX}/login`,
    {
      username,
      password,
      captchaVerification: '',
    },
    { skipAuth: true },
  )
}

/** 手机号 + 验证码登录（无需已登录） */
export async function loginBySms(mobile: string, code: string): Promise<LoginResp> {
  return http.post<LoginResp>(`${AUTH_PREFIX}/sms-login`, { mobile, code }, { skipAuth: true })
}

/** @deprecated 使用 loginBySms */
export async function loginByMobile(mobile: number, code: number): Promise<LoginResp> {
  return loginBySms(String(mobile), String(code))
}

/**
 * 发送短信验证码
 * - 登录 / 忘记密码：匿名，skipAuth
 * - 绑手机：需已登录，带 Token
 */
export async function sendSmsCode(mobile: string, scene: number): Promise<boolean> {
  const isAnonymous =
    scene === SMS_SCENE.MEMBER_LOGIN || scene === SMS_SCENE.MEMBER_RESET_PASSWORD
  return http.post<boolean>(
    `${AUTH_PREFIX}/send-sms-code`,
    { mobile, scene },
    { skipAuth: isAnonymous },
  )
}

/** 微信登录二维码 */
export async function getWechatLoginQrCode(): Promise<WechatQrCodeResp> {
  return http.get<WechatQrCodeResp>(`${AUTH_PREFIX}/wechat/qr-code`, undefined, {
    skipAuth: true,
  })
}

/** 轮询微信扫码；未扫码时 data 为 null */
export async function checkWechatLogin(
  scanToken: string,
  inviteCode?: string,
): Promise<LoginResp | null> {
  const params: Record<string, string> = { scanToken }
  if (inviteCode) {
    params.inviteCode = inviteCode
  }
  return http.get<LoginResp | null>(`${AUTH_PREFIX}/wechat/check-login`, params, {
    skipAuth: true,
  })
}

/** 登出（需 Token） */
export async function logout(): Promise<boolean> {
  return http.post<boolean>(`${AUTH_PREFIX}/logout`)
}

/** 刷新 Token（匿名，用 refreshToken 参数） */
export async function refreshToken(refreshTokenValue: string): Promise<LoginResp> {
  return http.post<LoginResp>(
    `${AUTH_PREFIX}/refresh-token?refreshToken=${encodeURIComponent(refreshTokenValue)}`,
    undefined,
    { skipAuth: true },
  )
}

/** 忘记密码（匿名，对齐 humanAI-pc POST） */
export async function resetPassword(
  mobile: string,
  code: string,
  password: string,
): Promise<boolean> {
  return http.post<boolean>(
    `${AUTH_PREFIX}/reset-password`,
    { mobile, code, password },
    { skipAuth: true },
  )
}

/** 按域名获取租户 */
export async function getTenantByWebsite(website: string): Promise<TenantInfo | null> {
  return http.get<TenantInfo | null>(
    `${TENANT_PREFIX}/get-by-website`,
    { website },
    { skipAuth: true },
  )
}

/** 获取默认租户 */
export async function getDefaultTenant(): Promise<TenantInfo | null> {
  return http.get<TenantInfo | null>(`${TENANT_PREFIX}/simple-by-default`, undefined, {
    skipAuth: true,
  })
}

/** 按租户名获取 tenant id */
export async function getTenantIdByName(name: string): Promise<number> {
  return http.get<number>(`${TENANT_PREFIX}/get-id-by-name`, { name }, { skipAuth: true })
}

/** 用户注册（匿名） */
export async function registerAccount(params: {
  username: string
  password: string
  tenantName?: string
}): Promise<LoginResp> {
  return http.post<LoginResp>(
    `${AUTH_PREFIX}/register`,
    {
      username: params.username,
      password: params.password,
      tenantName: params.tenantName ?? '',
      nickname: params.username,
      captchaVerification: '',
    },
    { skipAuth: true },
  )
}

export { SMS_SCENE } from './types'
export type { LoginResp, TenantInfo, WechatQrCodeResp } from './types'
