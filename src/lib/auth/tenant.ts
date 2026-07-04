const TENANT_STORAGE_KEY = "tenant_id";
export const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID ?? "2045";

let runtimeTenantId: string | null = null;

export function initTenantFromStorage(): void {
  if (typeof window === "undefined") return;
  const stored = localStorage.getItem(TENANT_STORAGE_KEY);
  if (stored) {
    runtimeTenantId = stored;
    return;
  }
  setTenantId(DEFAULT_TENANT_ID);
}

/** 当前请求使用的 tenant-id */
export function getTenantId(): string {
  if (runtimeTenantId) return runtimeTenantId;
  return DEFAULT_TENANT_ID;
}

export function setTenantId(id: string | number): void {
  runtimeTenantId = String(id);
  if (typeof window !== "undefined") {
    localStorage.setItem(TENANT_STORAGE_KEY, runtimeTenantId);
  }
}

export function isTenantEnabled(): boolean {
  return import.meta.env.VITE_TENANT_ENABLE !== "false";
}
