import type { AuthRepository } from "@/repositories/authRepo"
import type { Role, User } from "@/context/AuthContext"
import type {
  CreateAdminRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/api"

type StoredUser = User & { password: string }

const LS_USERS_KEY = "mg26_users"
const LS_SESSION_KEY = "mg26_session"
const LS_RESET_TOKENS_KEY = "mg26_reset_tokens"

type ResetToken = {
  token: string
  userId: string
  email: string
  expiresAt: string
  used: boolean
  createdAt: string
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function uid() {
  return "u_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16)
}

function randomToken(len = 6) {
  const digits = "0123456789"
  let out = ""
  for (let i = 0; i < len; i++) out += digits[Math.floor(Math.random() * digits.length)]
  return out
}

function getAllUsers(): StoredUser[] {
  return safeParse<StoredUser[]>(localStorage.getItem(LS_USERS_KEY), [])
}
function setAllUsers(users: StoredUser[]) {
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(users))
}
function getTokens(): ResetToken[] {
  return safeParse<ResetToken[]>(localStorage.getItem(LS_RESET_TOKENS_KEY), [])
}
function setTokens(tokens: ResetToken[]) {
  localStorage.setItem(LS_RESET_TOKENS_KEY, JSON.stringify(tokens))
}

export class MockAuthRepo implements AuthRepository {
  async login(input: LoginRequest) {
    const email = normalizeEmail(input.email)
    const password = input.password

    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }
    if (!password) return { ok: false, message: "Password wajib diisi." }

    const users = getAllUsers()
    const found = users.find((u) => normalizeEmail(u.email) === email)
    if (!found) return { ok: false, message: "Akun tidak ditemukan." }
    if (found.isActive === false) return { ok: false, message: "Akun nonaktif. Hubungi panitia." }
    if (found.password !== password) return { ok: false, message: "Password salah." }

    localStorage.setItem(LS_SESSION_KEY, JSON.stringify({ userId: found.id }))

    const { password: _pw, ...publicUser } = found
    const data: LoginResponse = { accessToken: "mock-token", user: publicUser }
    return { ok: true, message: "Login berhasil.", data }
  }

  async register(input: RegisterRequest) {
    if (!input.institutionName.trim()) return { ok: false, message: "Nama instansi wajib diisi." }
    if (!input.picName.trim()) return { ok: false, message: "Nama PIC wajib diisi." }
    if (!isValidEmail(input.email)) return { ok: false, message: "Format email tidak valid." }
    if (!input.phone.trim()) return { ok: false, message: "No HP/WA wajib diisi." }
    if (!input.address.trim()) return { ok: false, message: "Alamat wajib diisi." }
    if ((input.password || "").length < 6) return { ok: false, message: "Password minimal 6 karakter." }

    const users = getAllUsers()
    const email = normalizeEmail(input.email)
    if (users.some((u) => normalizeEmail(u.email) === email)) {
      return { ok: false, message: "Email sudah terdaftar. Silakan login." }
    }

    const now = new Date().toISOString()
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
      phone: input.phone.trim(),
      password: input.password,
      isActive: true,
      createdAt: now,
    }

    setAllUsers([newUser, ...users])
    return { ok: true, message: "Akun berhasil dibuat. Silakan login." }
  }

  async me() {
    const session = safeParse<{ userId: string } | null>(localStorage.getItem(LS_SESSION_KEY), null)
    if (!session?.userId) return { ok: false, message: "Belum login." }

    const users = getAllUsers()
    const found = users.find((u) => u.id === session.userId)
    if (!found) return { ok: false, message: "User tidak ditemukan." }

    const { password: _pw, ...publicUser } = found
    void _pw
    return { ok: true, message: "OK", data: publicUser }
  }

  async logout() {
    localStorage.removeItem(LS_SESSION_KEY)
  }

  async listUsers() {
    const users = getAllUsers()
    return users.map(({ password: _pw, ...u }) => u)
  }

  async updateUserPassword(userId: string, newPassword: string) {
    if (newPassword.length < 6) return { ok: false, message: "Password minimal 6 karakter." }

    const users = getAllUsers()
    const idx = users.findIndex((u) => u.id === userId)
    if (idx === -1) return { ok: false, message: "User tidak ditemukan." }

    users[idx] = { ...users[idx], password: newPassword }
    setAllUsers(users)

    return { ok: true, message: "Password berhasil diubah." }
  }

  async setUserActive(userId: string, active: boolean) {
    const users = getAllUsers()
    const idx = users.findIndex((u) => u.id === userId)
    if (idx === -1) return { ok: false, message: "User tidak ditemukan." }

    users[idx] = { ...users[idx], isActive: active }
    setAllUsers(users)

    const session = safeParse<{ userId: string } | null>(localStorage.getItem(LS_SESSION_KEY), null)
    if (session?.userId === userId && !active) {
      localStorage.removeItem(LS_SESSION_KEY)
    }

    return { ok: true, message: active ? "Akun diaktifkan." : "Akun dinonaktifkan." }
  }

  async deleteUser(userId: string) {
    const users = getAllUsers()
    const found = users.find((u) => u.id === userId)
    if (!found) return { ok: false, message: "User tidak ditemukan." }

    const next = users.filter((u) => u.id !== userId)
    setAllUsers(next)

    try {
      localStorage.removeItem(`mg26_registration_${userId}`)
    } catch {}

    const session = safeParse<{ userId: string } | null>(localStorage.getItem(LS_SESSION_KEY), null)
    if (session?.userId === userId) {
      localStorage.removeItem(LS_SESSION_KEY)
    }

    return { ok: true, message: "Akun berhasil dihapus." }
  }

  async createAdmin(input: CreateAdminRequest) {
    // mock: allow create admin from UI guard only; still validate
    const email = normalizeEmail(input.email)
    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }
    if ((input.password || "").length < 6) return { ok: false, message: "Password minimal 6 karakter." }
    if (!input.picName.trim()) return { ok: false, message: "Nama admin wajib diisi." }
    if (!input.phone.trim()) return { ok: false, message: "No HP admin wajib diisi." }

    const users = getAllUsers()
    if (users.some((u) => normalizeEmail(u.email) === email)) return { ok: false, message: "Email sudah terdaftar." }

    const now = new Date().toISOString()
    const newAdmin: StoredUser = {
      id: uid(),
      role: input.role as Role,
      institutionName: input.institutionName?.trim() || "Panitia Muhammadiyah Games",
      institutionType: "PIMPINAN_CABANG",
      address: "—",
      picName: input.picName.trim(),
      email,
      phone: input.phone.trim(),
      password: input.password,
      isActive: true,
      createdAt: now,
    }

    setAllUsers([newAdmin, ...users])
    return { ok: true, message: "Akun admin berhasil dibuat." }
  }

  async generateResetToken(emailInput: string) {
    const email = normalizeEmail(emailInput)
    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }

    const users = getAllUsers()
    const target = users.find((u) => normalizeEmail(u.email) === email)
    if (!target) return { ok: false, message: "Akun tidak ditemukan." }

    const now = new Date()
    const expires = new Date(now.getTime() + 30 * 60 * 1000)
    const token = randomToken(6)

    const tokens = getTokens()
    const t: ResetToken = {
      token,
      userId: target.id,
      email,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      used: false,
    }
    setTokens([t, ...tokens])

    return { ok: true, message: "Token reset berhasil dibuat.", token }
  }

  async resetPasswordWithToken(input: ResetPasswordRequest) {
    const email = normalizeEmail(input.email)
    const token = (input.token || "").trim()
    const newPassword = input.newPassword || ""

    if (!isValidEmail(email)) return { ok: false, message: "Format email tidak valid." }
    if (token.length < 4) return { ok: false, message: "Kode reset tidak valid." }
    if (newPassword.length < 6) return { ok: false, message: "Password minimal 6 karakter." }

    const tokens = getTokens()
    const found = tokens.find((t) => t.email === email && t.token === token)

    if (!found) return { ok: false, message: "Kode reset salah." }
    if (found.used) return { ok: false, message: "Kode reset sudah digunakan." }

    const now = new Date()
    if (new Date(found.expiresAt).getTime() < now.getTime()) {
      return { ok: false, message: "Kode reset kedaluwarsa. Minta token baru ke admin." }
    }

    const users = getAllUsers()
    const idx = users.findIndex((u) => u.id === found.userId)
    if (idx === -1) return { ok: false, message: "Akun tidak ditemukan." }

    users[idx] = { ...users[idx], password: newPassword }
    setAllUsers(users)

    setTokens(tokens.map((t) => (t === found ? { ...t, used: true } : t)))
    return { ok: true, message: "Password berhasil direset. Silakan login." }
  }
}
