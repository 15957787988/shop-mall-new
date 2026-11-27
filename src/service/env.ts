const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const apiEnv = {
  baseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, ''),
  useMock: USE_MOCK,
} as const
