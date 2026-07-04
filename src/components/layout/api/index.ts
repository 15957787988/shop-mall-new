import http from '@/service/http'

/** 后端 AppMemberUserInfoRespVO（/app-api/member/user/get） */
interface MemberUserRespVO {
  id: number
  nickname: string
  avatar: string
  mobile: string
  sex: number
  point: number
  experience: number
  level: MemberLevelInfo | null
  brokerageEnabled: boolean | null
}

interface MemberLevelSimpleRespVO {
  id: number
  name: string
  icon: string
}

export interface MemberLevelInfo {
  id: number
  name: string
  level: number
  icon: string
}

export interface MemberInfo {
  id: number
  nickname: string
  avatar: string
  mobile: string
  sex: number
  point: number
  experience: number
  level: MemberLevelInfo | null
  brokerageEnabled: boolean | null
}

export interface MemberLevel {
  name: string
  level: number
  experience: number
  discountPercent: number
  icon: string
  backgroundUrl: string
}

function mapMemberUserToInfo(user: MemberUserRespVO): MemberInfo {
  return {
    id: user.id,
    nickname: user.nickname,
    avatar: user.avatar,
    mobile: user.mobile,
    sex: user.sex,
    point: user.point,
    experience: user.experience,
    level: user.level,
    brokerageEnabled: user.brokerageEnabled,
  }
}

function mapSimpleLevelToMemberLevel(level: MemberLevelSimpleRespVO): MemberLevel {
  return {
    name: level.name,
    level: 0,
    experience: 0,
    discountPercent: 100,
    icon: level.icon,
    backgroundUrl: '',
  }
}

/** 获取当前会员用户信息（含积分 point） */
export async function getMemberInfo(): Promise<MemberInfo> {
  const user = await http.get<MemberUserRespVO>('/admin-api/app-api/member/user/get')
  return mapMemberUserToInfo(user)
}

/** 获取会员等级列表 */
export async function getMemberLevels(): Promise<MemberLevel[]> {
  const levels = await http.get<MemberLevelSimpleRespVO[]>(
    '/admin-api/member/level/list-all-simple',
  )
  return levels.map(mapSimpleLevelToMemberLevel)
}

/** 绑定 / 修改手机号（微信扫码后无手机号时） */
export async function updateUserMobile(mobile: string, code: string): Promise<boolean> {
  return http.put<boolean>('/admin-api/system/user/profile/update-mobile', { mobile, code })
}
