const INVITE_CODE_KEY = "ec_invite_code";

export function getInviteCode(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const code = localStorage.getItem(INVITE_CODE_KEY)?.trim();
  return code || undefined;
}

export function setInviteCode(code: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INVITE_CODE_KEY, code.trim());
}
