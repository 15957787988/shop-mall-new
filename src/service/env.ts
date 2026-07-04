const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

export const apiEnv = {
  baseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, ''),
  tenantId: import.meta.env.VITE_TENANT_ID ?? '2045',
  useMock: USE_MOCK,
} as const
