"use client"

import type { User } from "@/context/AuthContext"

export const LS_SESSION_KEY = "mg26_session"
export const AUTH_COOKIE_KEY = "mg26_auth"
export const AUTH_ROLE_COOKIE_KEY = "mg26_role"

export type AuthSession = {
  userId: string
  token?: string
  user?: User
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function readAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null
  return safeParse<AuthSession | null>(localStorage.getItem(LS_SESSION_KEY), null)
}

export function writeAuthSession(session: AuthSession) {
  if (typeof window === "undefined") return
  localStorage.setItem(LS_SESSION_KEY, JSON.stringify(session))
  document.cookie = `${AUTH_COOKIE_KEY}=1; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=${encodeURIComponent(session.user?.role ?? "")}; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`
}

export function clearAuthSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem(LS_SESSION_KEY)
  document.cookie = `${AUTH_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
  document.cookie = `${AUTH_ROLE_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax`
}

export function getAuthToken() {
  return readAuthSession()?.token ?? null
}
