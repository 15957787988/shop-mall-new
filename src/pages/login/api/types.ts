/** 登录响应 */
export interface LoginResp {
  accessToken: string
  refreshToken: string
  userId: number
  expiresTime?: string
  openid?: string
}

/** 微信扫码二维码 */
export interface WechatQrCodeResp {
  qrUrl: string
  scanToken: string
}

/** 短信场景（对齐 SmsSceneEnum，C 端走 admin-api 用 ADMIN_* 场景） */
export const SMS_SCENE = {
  /** 后台用户手机号登录 → 模板 admin-sms-login */
  MEMBER_LOGIN: 21,
  /** 绑手机 / 改手机 → 模板 user-update-mobile */
  MEMBER_UPDATE_MOBILE: 2,
  /** 忘记密码 → 模板 admin-reset-password */
  MEMBER_RESET_PASSWORD: 23,
} as const

export interface TenantInfo {
  id: number
  name: string
}
