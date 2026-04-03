import type { AuthRepository, ResetTokenResult } from "@/repositories/authRepo"
import type {
  CreateAdminRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/api"
import { ENV } from "@/config/env"
import { getAuthToken } from "@/lib/authSession"
import { http } from "@/lib/http"
import type { User } from "@/context/AuthContext"
import type { MockAuthRepo } from "@/repositories/mock/authRepo.mock"

type BackendAuthUser = {
  id: string | number
  name?: string
  email?: string
  email_verified_at?: string | null
  type?: string
  institution_name?: string
  institution_type?: User["institutionType"]
  address?: string
  phone?: string
  account_status?: string
  created_at?: string
  assigned_sport_ids?: Array<string | number>
}

type BackendRoleItem =
  | string
  | {
      id?: string | number
      name?: string
      slug?: string
    }

type BackendLoginResponse = {
  success?: boolean
  message?: string
  data?: {
    token?: string
    user?: BackendAuthUser
    roles?: BackendRoleItem[]
  }
}

type BackendMeResponse = {
  message?: string
  user?: BackendAuthUser
  roles?: BackendRoleItem[]
}

export class HttpAuthRepo implements AuthRepository {
  constructor(private readonly fallback: MockAuthRepo) {}

  private baseUrl() {
    if (!ENV.API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL belum dikonfigurasi.")
    }
    return ENV.API_BASE_URL
  }

  private mapRole(roles?: BackendRoleItem[]): User["role"] {
    const lowered = (roles ?? [])
      .map((role) => (typeof role === "string" ? role : role.slug || role.name || ""))
      .map((role) => role.trim().toLowerCase())
    if (lowered.includes("super_admin") || lowered.includes("super-admin")) return "SUPER_ADMIN"
    if (lowered.includes("admin_cabor") || lowered.includes("admin-cabor")) return "ADMIN_CABOR"
    if (lowered.includes("admin")) return "ADMIN"
    return "PESERTA"
  }

  private normalizeInstitutionType(value?: string): User["institutionType"] {
    const normalized = (value || "").trim().toUpperCase()

    if (
      normalized === "SD_MI" ||
      normalized === "SMP_MTS" ||
      normalized === "SMA_MA" ||
      normalized === "UNIVERSITAS_PTMA" ||
      normalized === "PIMPINAN_WILAYAH_MUHAMMADIYAH" ||
      normalized === "PIMPINAN_DAERAH_MUHAMMADIYAH" ||
      normalized === "PIMPINAN_RANTING" ||
      normalized === "PIMPINAN_CABANG"
    ) {
      return normalized
    }

    if (normalized === "SCHOOL") return "SMA_MA"
    if (normalized === "UNIVERSITY") return "UNIVERSITAS_PTMA"

    return "PIMPINAN_CABANG"
  }

  private mapUser(raw: BackendAuthUser, roles?: BackendRoleItem[]): User {
    const role = this.mapRole(roles)
    const name = raw.name?.trim() || "Pengguna"
    const assignedSportIds = Array.isArray(raw.assigned_sport_ids)
      ? raw.assigned_sport_ids.map((item) => String(item))
      : undefined

    return {
      id: String(raw.id),
      role,
      institutionName:
        raw.institution_name?.trim() ||
        (role === "PESERTA" ? "Kontingen Muhammadiyah Games" : "Panitia Muhammadiyah Games"),
      institutionType: this.normalizeInstitutionType(raw.institution_type ?? raw.type),
      address: raw.address?.trim() || "-",
      picName: name,
      email: raw.email?.trim() || "",
      emailVerifiedAt: raw.email_verified_at ?? undefined,
      phone: raw.phone?.trim() || "-",
      isActive: (raw.account_status || "").toLowerCase() !== "inactive",
      assignedSportIds: assignedSportIds && assignedSportIds.length > 0 ? assignedSportIds : undefined,
      createdAt: raw.created_at || new Date().toISOString(),
    }
  }

  async login(input: LoginRequest): Promise<{ ok: boolean; message: string; data?: LoginResponse }> {
    try {
      const res = await http<BackendLoginResponse>(`${this.baseUrl()}/api/login`, {
        method: "POST",
        body: input,
      })

      const token = res.data?.token
      const rawUser = res.data?.user
      const roles = res.data?.roles ?? []

      if (!token || !rawUser) {
        return { ok: false, message: "Response login backend tidak lengkap." }
      }

      const data: LoginResponse = {
        accessToken: token,
        user: this.mapUser(rawUser, roles),
      }

      return {
        ok: true,
        message: res.message || "Login berhasil.",
        data,
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Login gagal.",
      }
    }
  }

  async register(input: RegisterRequest) {
    return this.fallback.register(input)
  }

  async me(): Promise<{ ok: boolean; message: string; data?: User }> {
    const token = getAuthToken()
    if (!token) return { ok: false, message: "Belum login." }

    try {
      const res = await http<BackendMeResponse>(`${this.baseUrl()}/api/me`, {
        method: "GET",
        token,
      })

      if (!res.user) {
        return { ok: false, message: "Response profil backend tidak lengkap." }
      }

      return {
        ok: true,
        message: res.message || "OK",
        data: this.mapUser(res.user, res.roles ?? []),
      }
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal memuat profil.",
      }
    }
  }

  async logout() {
    try {
      await http(`${this.baseUrl()}/api/logout`, { method: "POST", token: getAuthToken() ?? undefined })
    } catch {
      // ignore logout API failures to preserve existing UX
    }
    await this.fallback.logout()
  }

  async listUsers(): Promise<User[]> {
    return this.fallback.listUsers()
  }

  async updateUserPassword(userId: string, newPassword: string) {
    return this.fallback.updateUserPassword(userId, newPassword)
  }

  async setUserActive(userId: string, active: boolean) {
    return this.fallback.setUserActive(userId, active)
  }

  async deleteUser(userId: string) {
    return this.fallback.deleteUser(userId)
  }

  async createAdmin(input: CreateAdminRequest) {
    return this.fallback.createAdmin(input)
  }

  async generateResetToken(email: string): Promise<ResetTokenResult> {
    return this.fallback.generateResetToken(email)
  }

  async resetPasswordWithToken(input: ResetPasswordRequest) {
    return this.fallback.resetPasswordWithToken(input)
  }
}
