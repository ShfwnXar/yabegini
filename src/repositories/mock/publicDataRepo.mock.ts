import { buildMedalTable, getWinnerResults } from "@/lib/winnerResults"
import type { PublicDataRepository, DashboardStats, PublicMedalRow, PublicResultItem } from "@/repositories/publicDataRepo"
import type { BackendMasterCategory, BackendMasterEvent, BackendSport } from "@/types/api"

type StoredUser = { id: string; role?: string }
type StoredRegistration = { athletes?: unknown[] }

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export class MockPublicDataRepo implements PublicDataRepository {
  async getDashboardStats(): Promise<DashboardStats> {
    const users = safeParse<StoredUser[]>(localStorage.getItem("mg26_users"), [])
    const peserta = users.filter((user) => user.role === "PESERTA")

    let totalAthletes = 0
    let totalRegistrations = 0

    for (const user of peserta) {
      const registration = safeParse<StoredRegistration | null>(
        localStorage.getItem(`mg26_registration_${user.id}`),
        null
      )
      if (!registration) continue
      totalRegistrations += 1
      totalAthletes += Array.isArray(registration.athletes) ? registration.athletes.length : 0
    }

    return {
      totalUsers: users.length,
      totalContingents: peserta.length,
      totalAthletes,
      totalTeams: 0,
      totalRegistrations,
    }
  }

  async listResults(): Promise<PublicResultItem[]> {
    return getWinnerResults().map((result) => ({
      id: result.id,
      categoryName: result.nomorLombaDisplayName ?? result.categoryName,
    }))
  }

  async getMedalTable(): Promise<PublicMedalRow[]> {
    return buildMedalTable(getWinnerResults())
      .map((row) => ({
        ...row,
        total: row.gold + row.silver + row.bronze,
      }))
      .sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold
        if (b.silver !== a.silver) return b.silver - a.silver
        if (b.bronze !== a.bronze) return b.bronze - a.bronze
        return b.total - a.total
      })
  }

  async listSports(): Promise<BackendSport[]> {
    return []
  }

  async listEvents(): Promise<BackendMasterEvent[]> {
    return []
  }

  async listCategories(): Promise<BackendMasterCategory[]> {
    return []
  }
}
