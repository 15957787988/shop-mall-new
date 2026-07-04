const LOGIN_FORM_KEY = "login_form";

export interface CachedLoginForm {
  username: string;
  password: string;
  rememberMe: boolean;
}

export function getLoginFormCache(): CachedLoginForm | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LOGIN_FORM_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CachedLoginForm;
  } catch {
    return null;
  }
}

export function setLoginFormCache(form: CachedLoginForm): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOGIN_FORM_KEY, JSON.stringify(form));
}

export function removeLoginFormCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOGIN_FORM_KEY);
}
