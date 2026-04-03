"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { Repos } from "@/repositories"
import { clearAuthSession, readAuthSession, writeAuthSession } from "@/lib/authSession"

export type Role = "PESERTA" | "ADMIN" | "ADMIN_CABOR" | "SUPER_ADMIN"

export type InstitutionType =
  | "SD_MI"
  | "SMP_MTS"
  | "SMA_MA"
  | "UNIVERSITAS_PTMA"
  | "PIMPINAN_WILAYAH_MUHAMMADIYAH"
  | "PIMPINAN_DAERAH_MUHAMMADIYAH"
  | "PIMPINAN_RANTING"
  | "PIMPINAN_CABANG"

export type User = {
  id: string
  role: Role
  institutionName: string
  institutionType: InstitutionType
  originProvince?: string
  originRegion?: string
  address: string
  picName: string
  email: string
  emailVerifiedAt?: string
  phone: string
  isActive?: boolean
  assignedSportIds?: string[]
  createdAt: string
}

type StoredUser = User & {
  password: string
  emailVerificationCode?: string
  emailVerificationExpiresAt?: string
  emailVerificationSentAt?: string
}

type RegisterInput = {
  institutionName: string
  institutionType: InstitutionType
  originProvince?: string
  originRegion?: string
  address: string
  picName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
}

type LoginInput = {
  email: string
  password: string
}

const LS_USERS_KEY = "mg26_users"
const LS_RESET_TOKENS_KEY = "mg26_reset_tokens"
const DEV_SUPERADMIN_EMAIL = "superadmin.dev@local.test"
const DEV_SUPERADMIN_PASSWORD = "SuperAdmin123!"

type ResetToken = {
  token: string
  userId: string
  email: string
  expiresAt: string
  used: boolean
  createdAt: string
}

type AuthContextValue = {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  register: (input: RegisterInput) => Promise<{ ok: boolean; message: string }>
  requestEmailVerification: (email: string) => { ok: boolean; message: string; code?: string }
  verifyEmail: (input: { email: string; code: string }) => { ok: boolean; message: string }
  login: (input: LoginInput) => Promise<{ ok: boolean; message: string }>
  logout: () => Promise<void>
  requestPasswordReset: (email: string) => { ok: boolean; message: string; token?: string }
  generateResetToken: (email: string) => { ok: boolean; message: string; token?: string }
  resetPasswordWithToken: (input: {
    email: string
    token: string
    newPassword: string
    confirmPassword: string
  }) => { ok: boolean; message: string }
  getAllUsers: () => StoredUser[]
  seedDefaultAdminsIfEmpty: () => void
  canAccessSport: (sportId: string) => boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function uid() {
  return "u_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16)
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function randomToken(len = 6) {
  const digits = "0123456789"
  let out = ""
  for (let i = 0; i < len; i++) out += digits[Math.floor(Math.random() * digits.length)]
  return out
}

function buildVerificationData() {
  const now = new Date()
  const expires = new Date(now.getTime() + 30 * 60 * 1000)
  return {
    code: randomToken(6),
    sentAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  }
}

function getResetTokens(): ResetToken[] {
  return safeParse<ResetToken[]>(localStorage.getItem(LS_RESET_TOKENS_KEY), [])
}

function setResetTokens(tokens: ResetToken[]) {
  localStorage.setItem(LS_RESET_TOKENS_KEY, JSON.stringify(tokens))
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isLocalDevAccount(email: string) {
  return normalizeEmail(email) === DEV_SUPERADMIN_EMAIL
}

function isLegacyLocalAdminAccount(email: string) {
  const normalized = normalizeEmail(email)
  return normalized.endsWith("@mg.local")
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const session = readAuthSession()
    if (!session?.userId) return null

    if (session.user) {
      return session.user
    }

    const users = safeParse<StoredUser[]>(localStorage.getItem(LS_USERS_KEY), [])
    const found = users.find((u) => u.id === session.userId)
    if (!found) return null

    const { password: _pw, ...publicUser } = found
    void _pw
    return publicUser
  })
  const [token, setToken] = useState<string | null>(() => readAuthSession()?.token ?? null)

  useEffect(() => {
    const session = readAuthSession()
    if (!session) return
    writeAuthSession(session)
  }, [])

  useEffect(() => {
    const session = readAuthSession()
    if (!session?.token) return

    let cancelled = false

    void Repos.auth.me().then((result) => {
      if (cancelled || !session.token) return

      if (!result.ok || !result.data || result.data.isActive === false) {
        clearAuthSession()
        setUser(null)
        setToken(null)
        return
      }

      writeAuthSession({
        userId: result.data.id,
        token: session.token,
        user: result.data,
      })
      setUser(result.data)
      setToken(session.token)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const getAllUsers = () => {
    return safeParse<StoredUser[]>(localStorage.getItem(LS_USERS_KEY), [])
  }

  const setAllUsers = (users: StoredUser[]) => {
    localStorage.setItem(LS_USERS_KEY, JSON.stringify(users))
  }

  const seedDefaultAdminsIfEmpty = () => {
    const users = getAllUsers().filter((user) => {
      if (!isLegacyLocalAdminAccount(user.email)) return true
      return user.role === "PESERTA"
    })
    const now = new Date().toISOString()

    const superAdmin: StoredUser = {
      id: uid(),
      role: "SUPER_ADMIN",
      institutionName: "Panitia Muhammadiyah Games",
      institutionType: "PIMPINAN_CABANG",
      address: "-",
      picName: "Super Admin Dev",
      email: DEV_SUPERADMIN_EMAIL,
      phone: "0000000000",
      password: DEV_SUPERADMIN_PASSWORD,
      isActive: true,
      createdAt: now,
    }
    const existingEmails = new Set(users.map((item) => normalizeEmail(item.email)))
    const missingDefaults = [superAdmin].filter((item) => !existingEmails.has(item.email))
    if (missingDefaults.length === 0) {
      setAllUsers(users)
      return
    }
    setAllUsers([...missingDefaults, ...users])

  }
  const register = async (input: RegisterInput) => {
    if (!input.institutionName.trim()) return { ok: false, message: "Nama instansi wajib diisi." }
    if (!input.picName.trim()) return { ok: false, message: "Nama PIC wajib diisi." }
    if (!isValidEmail(input.email)) return { ok: false, message: "Format email tidak valid." }
    if (!input.phone.trim()) return { ok: false, message: "No HP/WA wajib diisi." }
    if (!input.address.trim()) return { ok: false, message: "Alamat wajib diisi." }
    if (input.password.length < 6) return { ok: false, message: "Password minimal 6 karakter." }
    if (input.password !== input.confirmPassword)
      return { ok: false, message: "Konfirmasi password tidak sama." }

    const users = getAllUsers()
    const email = normalizeEmail(input.email)

    if (users.some((u) => normalizeEmail(u.email) === email)) {
      return { ok: false, message: "Email sudah terdaftar. Silakan login." }
    }

    const now = new Date().toISOString()
    const verification = buildVerificationData()

    const newUser: StoredUser = {
      id: uid(),
      role: "PESERTA",
      institutionName: input.institutionName.trim(),
      institutionType: input.institutionType,
      originProvince: input.originProvince?.trim() || undefined,
      originRegion: input.originRegion?.trim() || undefined,
      address: input.address.trim(),
      picName: input.picName.trim(),
      email,
      emailVerifiedAt: undefined,
      phone: input.phone.trim(),
      password: input.password,
      emailVerificationCode: verification.code,
      emailVerificationExpiresAt: verification.expiresAt,
      emailVerificationSentAt: verification.sentAt,
      createdAt: now,
    }

    setAllUsers([newUser, ...users])

    return { ok: true, message: "Akun berhasil dibuat. Silakan verifikasi email terlebih dahulu." }
  }

  const requestEmailVerification = (emailInput: string) => {
    const email = normalizeEmail(emailInput)
    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }

    const users = getAllUsers()
    const idx = users.findIndex((u) => normalizeEmail(u.email) === email)
    if (idx === -1) return { ok: false, message: "Akun tidak ditemukan." }

    const target = users[idx]
    if (target.role !== "PESERTA") {
      return { ok: false, message: "Verifikasi email hanya untuk akun peserta." }
    }
    if (target.emailVerifiedAt) {
      return { ok: false, message: "Email akun ini sudah terverifikasi." }
    }

    const verification = buildVerificationData()
    const updated: StoredUser = {
      ...target,
      emailVerificationCode: verification.code,
      emailVerificationExpiresAt: verification.expiresAt,
      emailVerificationSentAt: verification.sentAt,
    }
    users[idx] = updated
    setAllUsers(users)

    return {
      ok: true,
      message: "Kode verifikasi baru berhasil dibuat. (Mock) Gunakan kode yang tampil.",
      code: verification.code,
    }
  }

  const verifyEmail = (input: { email: string; code: string }) => {
    const email = normalizeEmail(input.email)
    const code = (input.code || "").trim()

    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }
    if (code.length < 4) return { ok: false, message: "Kode verifikasi tidak valid." }

    const users = getAllUsers()
    const idx = users.findIndex((u) => normalizeEmail(u.email) === email)
    if (idx === -1) return { ok: false, message: "Akun tidak ditemukan." }

    const target = users[idx]
    if (target.role !== "PESERTA") {
      return { ok: false, message: "Verifikasi email hanya untuk akun peserta." }
    }
    if (target.emailVerifiedAt) {
      return { ok: true, message: "Email sudah terverifikasi. Silakan login." }
    }
    if (!target.emailVerificationCode || !target.emailVerificationExpiresAt) {
      return { ok: false, message: "Kode verifikasi belum tersedia. Kirim ulang kode terlebih dahulu." }
    }

    if (target.emailVerificationCode !== code) {
      return { ok: false, message: "Kode verifikasi salah." }
    }

    if (new Date(target.emailVerificationExpiresAt).getTime() < Date.now()) {
      return { ok: false, message: "Kode verifikasi kedaluwarsa. Kirim ulang kode." }
    }

    const nextUser: StoredUser = {
      ...target,
      emailVerifiedAt: new Date().toISOString(),
      emailVerificationCode: undefined,
      emailVerificationExpiresAt: undefined,
    }
    users[idx] = nextUser
    setAllUsers(users)

    return { ok: true, message: "Email berhasil diverifikasi. Silakan login." }
  }

  const login = async (input: LoginInput) => {
    const email = normalizeEmail(input.email)
    const password = input.password

    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }
    if (!password) return { ok: false, message: "Password wajib diisi." }
    if (email.endsWith("@mg.local")) {
      return { ok: false, message: "Email atau password salah." }
    }

    const users = getAllUsers()
    const found = users.find((u) => normalizeEmail(u.email) === email)

    if (found && found.role === "PESERTA" && !found.emailVerifiedAt) {
      return {
        ok: false,
        message: "Email belum diverifikasi. Buka menu Verifikasi Email terlebih dahulu.",
      }
    }
    if (found && isLocalDevAccount(email)) {
      if (found.password !== password) return { ok: false, message: "Email atau password salah." }
      if (found.isActive === false) return { ok: false, message: "Akun nonaktif. Hubungi panitia." }

      const { password: _pw, ...publicUser } = found
      void _pw

      writeAuthSession({
        userId: publicUser.id,
        user: publicUser,
      })

      setUser(publicUser)
      setToken(null)
      return { ok: true, message: "Login berhasil." }
    }
    const result = await Repos.auth.login({ email, password })
    if (!result.ok || !result.data) return { ok: false, message: result.message }
    if (result.data.user.isActive === false) {
      clearAuthSession()
      setUser(null)
      setToken(null)
      return { ok: false, message: "Akun nonaktif. Hubungi panitia." }
    }

    writeAuthSession({
      userId: result.data.user.id,
      token: result.data.accessToken,
      user: result.data.user,
    })

    setUser(result.data.user)
    setToken(result.data.accessToken)
    return { ok: true, message: result.message || "Login berhasil." }
  }

  const logout = async () => {
    await Repos.auth.logout()
    clearAuthSession()
    setUser(null)
    setToken(null)
  }

  const requestPasswordReset = (emailInput: string) => {
    const email = normalizeEmail(emailInput)
    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }

    const users = getAllUsers()
    const target = users.find((u) => normalizeEmail(u.email) === email)
    if (!target) return { ok: false, message: "Akun tidak ditemukan." }
    if (target.isActive === false) return { ok: false, message: "Akun nonaktif. Hubungi panitia." }

    const now = new Date()
    const expires = new Date(now.getTime() + 30 * 60 * 1000)
    const token = randomToken(6)

    const tokens = getResetTokens().filter((item) => item.email !== email || item.used)
    const newToken: ResetToken = {
      token,
      userId: target.id,
      email,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      used: false,
    }

    setResetTokens([newToken, ...tokens])

    return {
      ok: true,
      message: "Kode reset berhasil dibuat. Silakan cek email Anda. (Mock: gunakan kode yang tampil.)",
      token,
    }
  }

  const generateResetToken = (emailInput: string) => {
    return requestPasswordReset(emailInput)
  }

  const resetPasswordWithToken = (input: {
    email: string
    token: string
    newPassword: string
    confirmPassword: string
  }) => {
    const email = normalizeEmail(input.email)
    const token = input.token.trim()
    const newPassword = input.newPassword
    const confirmPassword = input.confirmPassword

    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }
    if (token.length < 4) return { ok: false, message: "Kode reset tidak valid." }
    if (newPassword.length < 6) return { ok: false, message: "Password minimal 6 karakter." }
    if (newPassword !== confirmPassword) return { ok: false, message: "Konfirmasi password tidak sama." }

    const tokens = getResetTokens()
    const found = tokens.find((t) => t.email === email && t.token === token)

    if (!found) return { ok: false, message: "Kode reset salah." }
    if (found.used) return { ok: false, message: "Kode reset sudah digunakan." }

    const now = new Date()
    if (new Date(found.expiresAt).getTime() < now.getTime()) {
      return { ok: false, message: "Kode reset sudah kedaluwarsa. Minta kode baru dari menu lupa password." }
    }

    const users = getAllUsers()
    const idx = users.findIndex((u) => u.id === found.userId)
    if (idx === -1) return { ok: false, message: "Akun tidak ditemukan." }

    users[idx] = { ...users[idx], password: newPassword }
    setAllUsers(users)

    const nextTokens = tokens.map((t) => (t === found ? { ...t, used: true } : t))
    setResetTokens(nextTokens)

    return { ok: true, message: "Password berhasil direset. Silakan login." }
  }

  const canAccessSport = (sportId: string) => {
    if (!user) return false
    if (user.role === "SUPER_ADMIN") return true
    if (user.role === "ADMIN") return true
    if (user.role === "ADMIN_CABOR") {
      const legacyCabang = (user as unknown as { cabang?: string }).cabang
      const allowed = user.assignedSportIds ?? (legacyCabang ? [legacyCabang] : [])
      return allowed.includes(sportId)
    }
    return false
  }

  const value: AuthContextValue = {
    user,
    token,
    isAuthenticated: !!user,
    register,
    requestEmailVerification,
    verifyEmail,
    login,
    logout,
    requestPasswordReset,
    generateResetToken,
    resetPasswordWithToken,
    getAllUsers,
    seedDefaultAdminsIfEmpty,
    canAccessSport,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}

