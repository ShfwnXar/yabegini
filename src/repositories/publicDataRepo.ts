import type {
  BackendMasterCategory,
  BackendMasterEvent,
  BackendSport,
} from "@/types/api"

export type DashboardStats = {
  totalUsers: number
  totalContingents: number
  totalAthletes: number
  totalTeams: number
  totalRegistrations: number
}

export type PublicResultItem = {
  id: string
  categoryName: string
  firstPlaceRegistrationId?: string
  secondPlaceRegistrationId?: string
  thirdPlaceRegistrationId?: string
}

export type PublicMedalRow = {
  id: string
  name: string
  gold: number
  silver: number
  bronze: number
  total: number
}

export interface PublicDataRepository {
  getDashboardStats(): Promise<DashboardStats>
  listResults(): Promise<PublicResultItem[]>
  getMedalTable(): Promise<PublicMedalRow[]>
  listSports(): Promise<BackendSport[]>
  listEvents(): Promise<BackendMasterEvent[]>
  listCategories(): Promise<BackendMasterCategory[]>
}
