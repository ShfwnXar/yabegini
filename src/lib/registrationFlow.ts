export function getRevisionKey(userId: string) {
  return `mg26_revision_open_${userId}`
}

export function readRevisionMode(userId: string) {
  if (typeof window === "undefined") return false
  return localStorage.getItem(getRevisionKey(userId)) === "true"
}

export function writeRevisionMode(userId: string, value: boolean) {
  if (typeof window === "undefined") return
  localStorage.setItem(getRevisionKey(userId), value ? "true" : "false")
}