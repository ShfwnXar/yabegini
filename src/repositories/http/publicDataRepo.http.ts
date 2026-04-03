import { ENV } from "@/config/env"
import { http } from "@/lib/http"
import { unwrapApiData } from "@/lib/registrationApi"
import type {
  ApiEnvelope,
  BackendDashboardStats,
  BackendMasterCategory,
  BackendMasterEvent,
  BackendMedalTableRow,
  BackendResult,
  BackendSport,
} from "@/types/api"
import type { DashboardStats, PublicDataRepository, PublicMedalRow, PublicResultItem } from "@/repositories/publicDataRepo"

type ApiListResponse<T> =
  | T[]
  | ApiEnvelope<T[]>
  | {
      data: T[]
      meta?: Record<string, unknown>
    }

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }
  return ""
}

function pickNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value
    if (typeof value === "string" && value.trim() && !Number.isNaN(Number(value))) return Number(value)
  }
  return 0
}

function unwrapList<T>(value: ApiListResponse<T>): T[] {
  if (Array.isArray(value)) return value
  const unwrapped = unwrapApiData(value as ApiEnvelope<T[]>)
  return Array.isArray(unwrapped) ? unwrapped : []
}

export class HttpPublicDataRepo implements PublicDataRepository {
  private baseUrl() {
    if (!ENV.API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL belum dikonfigurasi.")
    }
    return ENV.API_BASE_URL
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const res = await http<ApiEnvelope<BackendDashboardStats> | BackendDashboardStats>(
      `${this.baseUrl()}/api/stats/dashboard`
    )
    const stats = unwrapApiData(res)

    return {
      totalUsers: pickNumber(stats.users),
      totalContingents: pickNumber(stats.contingents),
      totalAthletes: pickNumber(stats.athletes),
      totalTeams: pickNumber(stats.teams),
      totalRegistrations: pickNumber(stats.registrations),
    }
  }

  async listResults(): Promise<PublicResultItem[]> {
    const res = await http<ApiListResponse<BackendResult>>(`${this.baseUrl()}/api/results`)
    return unwrapList(res).map((item) => ({
      id: pickString(item.id),
      categoryName: pickString(item.category?.name) || `Kategori #${pickString(item.category?.id) || pickString(item.id)}`,
      firstPlaceRegistrationId: pickString(item.first_place_registration_id) || undefined,
      secondPlaceRegistrationId: pickString(item.second_place_registration_id) || undefined,
      thirdPlaceRegistrationId: pickString(item.third_place_registration_id) || undefined,
    }))
  }

  async getMedalTable(): Promise<PublicMedalRow[]> {
    const res = await http<ApiListResponse<BackendMedalTableRow>>(`${this.baseUrl()}/api/results/medal-table`)

    return unwrapList(res)
      .map((row, index) => {
        const gold = pickNumber(row.gold)
        const silver = pickNumber(row.silver)
        const bronze = pickNumber(row.bronze)
        const total = pickNumber(row.total) || gold + silver + bronze
        const name =
          pickString(row.name, row.institution_name, row.contingent_name, row.team_name, row.category?.name) ||
          `Kontingen ${index + 1}`

        return {
          id: pickString(row.id) || `${index + 1}`,
          name,
          gold,
          silver,
          bronze,
          total,
        }
      })
      .filter((row) => row.name.trim().length > 0)
      .sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold
        if (b.silver !== a.silver) return b.silver - a.silver
        if (b.bronze !== a.bronze) return b.bronze - a.bronze
        return b.total - a.total
      })
  }

  async listSports(): Promise<BackendSport[]> {
    const res = await http<ApiListResponse<BackendSport>>(`${this.baseUrl()}/api/master/sports`)
    return unwrapList(res)
  }

  async listEvents(): Promise<BackendMasterEvent[]> {
    const res = await http<ApiListResponse<BackendMasterEvent>>(`${this.baseUrl()}/api/master/events`)
    return unwrapList(res)
  }

  async listCategories(): Promise<BackendMasterCategory[]> {
    const res = await http<ApiListResponse<BackendMasterCategory>>(`${this.baseUrl()}/api/master/categories`)
    return unwrapList(res)
  }
}
