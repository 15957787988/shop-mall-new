import http from '@/service/http'

export interface VipProduct {
  id: number
  name: string
  price: number
  points: number
  durationDay: number
  membershipType: 1 | 2 | 3
  productType: 1 | 2
  status: number
  displayConfig?: string
  displayConfigLines?: string[]
}

export interface CreatePayOrderResp {
  displayContent: string
  displayMode: 'qr_code'
  status: number
  payOrderId: number
}

export interface PayOrderStatus {
  id: string
  status: number
  price: number
}

const VIP_TYPE_LABEL: Record<1 | 2 | 3, string> = {
  1: '月',
  2: '季',
  3: '年',
}

export function getVipTypeLabel(type: 1 | 2 | 3): string {
  return VIP_TYPE_LABEL[type]
}

export async function getVipPage(params: {
  pageNo: number
  pageSize: number
  productType: 1 | 2
}): Promise<{ list: VipProduct[]; total: number }> {
  const res = await http.get<{ list: VipProduct[]; total: number }>(
    '/admin-api/product/mpconfig/public-page',
    params,
  )
  return {
    total: res.total,
    list: res.list.map((item) => ({
      ...item,
      price: Number((item.price / 100).toFixed(2)),
      displayConfigLines: item.displayConfig?.split('\n').filter(Boolean) ?? [],
    })),
  }
}

export async function createPayOrder(data: {
  channelCode: string
  spuId: string
  returnUrl?: string
}): Promise<CreatePayOrderResp> {
  return http.post<CreatePayOrderResp>('/admin-api/pay/demo-order/create-auto', data)
}

export async function queryPayOrderStatus(id: number): Promise<PayOrderStatus> {
  return http.get<PayOrderStatus>('/admin-api/pay/order/my-get', { id, sync: true })
}
