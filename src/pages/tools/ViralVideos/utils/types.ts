import type { ShopVideoRecord } from '../api'

export type TabKey = 'generate' | 'replicate'

export interface TabFormState {
  uploadedUrls: string[]
  primaryImageIndex: number
  sellingPoints: string
  referenceVideoUrl: string
}

export interface DemoVideoItem {
  url: string
  title: string
  desc?: string
}

export interface VideoDetailState {
  open: boolean
  loading: boolean
  record: ShopVideoRecord | null
}

export interface DemoPlayingState {
  open: boolean
  index: number
  playlist: DemoVideoItem[]
}

export interface MarketSelections {
  market: string
  language: string
  ratioLabel: string
}

export interface TypeSelection {
  checked: boolean
  count: number
}
