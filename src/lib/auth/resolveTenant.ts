import { getTenantByWebsite } from '@/pages/login/api'
import { setTenantId } from "./tenant";

/** 按域名解析租户（对齐 humanAI-pc LoginForm onMounted） */
export async function resolveTenantFromWebsite(): Promise<void> {
  try {
    const res = await getTenantByWebsite(location.host);
    if (res?.id) {
      setTenantId(res.id);
    }
  } catch {
    // 保留 env / 缓存 tenant
  }
}
