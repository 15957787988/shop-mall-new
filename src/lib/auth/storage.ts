/** Token 持久化 keys */
const ACCESS_TOKEN_KEY = "ec_access_token";
const REFRESH_TOKEN_KEY = "ec_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function clearTokens(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

const USER_INFO_KEY = "ec_user_info";

export function getUserInfoCache(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_INFO_KEY);
}

export function setUserInfoCache(json: string | null): void {
  if (typeof window === "undefined") return;
  if (json) {
    localStorage.setItem(USER_INFO_KEY, json);
  } else {
    localStorage.removeItem(USER_INFO_KEY);
  }
}

export function clearUserInfoCache(): void {
  setUserInfoCache(null);
}