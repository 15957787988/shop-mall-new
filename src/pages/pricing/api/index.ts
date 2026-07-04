import http from '@/service/http'

/** 钱包信息 */
export interface WalletInfo {
  id: number
  balance: number
  totalExpense: number
  totalRecharge: number
}

/** 钱包交易流水 */
export interface WalletTransaction {
  title: string
  price: number
  bizType: number
  createTime: string
}

/** 充值套餐（后端 AppPayWalletPackageRespVO） */
export interface WalletRechargePackage {
  id: number
  name: string
  payPrice: number
  bonusPrice: number
}

/** 创建充值请求 */
export interface CreateRechargeReq {
  payPrice?: number
  packageId?: number
}

/** 创建充值响应 */
export interface CreateRechargeResp {
  id: number
  payOrderId: number
}

/** 充值记录（后端 AppPayWalletRechargeRespVO） */
export interface WalletRechargeRecord {
  id: number
  totalPrice: number
  payPrice: number
  bonusPrice: number
  payChannelCode: string
  payChannelName: string
  payOrderId: number
  payOrderChannelOrderNo: string
  payTime: string
  refundStatus: number
}

/** 获取钱包信息 */
export async function getWallet(): Promise<WalletInfo> {
  return http.get<WalletInfo>('/admin-api/pay/wallet/my-get')
}

/** 获取钱包交易流水分页 */
export async function getWalletTransactions(params: {
  pageNo: number
  pageSize: number
}): Promise<{ list: WalletTransaction[]; total: number }> {
  return http.get('/admin-api/pay/wallet/my-transaction-page', params)
}

/** 充值套餐列表 */
export async function getWalletRechargePackageList(): Promise<WalletRechargePackage[]> {
  return http.get<WalletRechargePackage[]>('/admin-api/pay/wallet/my-recharge-package-list')
}

/** 发起充值（创建充值订单） */
export async function createWalletRecharge(req: CreateRechargeReq): Promise<CreateRechargeResp> {
  return http.post<CreateRechargeResp>('/admin-api/pay/wallet/my-create', req)
}

/** 充值记录分页 */
export async function getWalletRechargePage(params: {
  pageNo: number
  pageSize: number
}): Promise<{ list: WalletRechargeRecord[]; total: number }> {
  return http.get('/admin-api/pay/wallet/my-page', params)
}

/** 卡密兑换 */
export async function redeemCardCode(cardCode: string): Promise<string> {
  return http.post<string>('/admin-api/system/card-code/redeem', { cardCode })
}
