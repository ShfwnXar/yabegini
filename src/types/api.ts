import type { DocumentKey, DocumentStatus, OfficialDocumentKey } from "@/data/documentCatalog"
import type { Role, InstitutionType, User } from "@/context/AuthContext"
import type { RegistrationState, PaymentStatus } from "@/context/RegistrationContext"
import type { RegistrationSettings } from "@/lib/registrationSettings"

export type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  data: T
}

export type ApiListMeta = {
  current_page?: number
  per_page?: number
  total?: number
}

/** ===== Auth DTO ===== */
export type LoginRequest = { email: string; password: string }
export type LoginResponse = { accessToken: string; user: User }

export type RegisterRequest = {
  institutionName: string
  institutionType: InstitutionType
  originProvince?: string
  originRegion?: string
  address: string
  picName: string
  email: string
  phone: string
  password: string
}

export type ForgotPasswordRequest = { email: string }
export type ResetPasswordRequest = { email: string; token: string; newPassword: string }

export type CreateAdminRequest = {
  role: Exclude<Role, "PESERTA">
  email: string
  password: string
  picName: string
  phone: string
  institutionName?: string
}

/** ===== Backend Registration DTO ===== */
export type BackendSport = {
  id: string | number
  name?: string
  title?: string
  description?: string
  competition_type?: string
  categories?: Array<{
    id: string | number
    name?: string
    title?: string
    quota?: number
  }>
}

export type BackendVenue = {
  id: string | number
  name?: string
  title?: string
  city?: string
  address?: string
}

export type BackendDashboardStats = {
  users?: number
  contingents?: number
  athletes?: number
  teams?: number
  registrations?: number
}

export type BackendMasterEvent = {
  id: string | number
  name?: string
  type?: string
}

export type BackendMasterCategory = {
  id: string | number
  name?: string
  sport_id?: string | number
}

export type BackendResultCategory = {
  id?: string | number
  name?: string
}

export type BackendResult = {
  id: string | number
  category?: BackendResultCategory | null
  first_place_registration_id?: string | number | null
  second_place_registration_id?: string | number | null
  third_place_registration_id?: string | number | null
}

export type BackendMedalTableRow = {
  id?: string | number
  name?: string
  institution_name?: string
  contingent_name?: string
  team_name?: string
  category?: BackendResultCategory | null
  gold?: number
  silver?: number
  bronze?: number
  total?: number
}

export type BackendContingent = {
  id?: string | number
  name?: string
  institution_name?: string
  pic_name?: string
  email?: string
  phone?: string
}

export type BackendRegistrationSummary = {
  id: string | number
  status?: string
  submission_status?: string
  title?: string
  name?: string
  created_at?: string
  updated_at?: string
}

export type BackendTeam = {
  id: string | number
  registration_id?: string | number
  sport_id?: string | number
  category_id?: string | number
  name?: string
  title?: string
  status?: string
}

export type BackendAthlete = {
  id: string | number
  registration_id?: string | number
  team_id?: string | number | null
  sport_id?: string | number
  category_id?: string | number
  name?: string
  full_name?: string
  gender?: string
  birth_date?: string
  institution?: string
  school_name?: string
}

export type BackendDocument = {
  id: string | number
  athlete_id?: string | number | null
  registration_id?: string | number
  type?: string
  document_type?: string
  file_name?: string
  status?: string
  uploaded_at?: string
  created_at?: string
  note?: string
  admin_note?: string
}

export type BackendRegistrationDetail = {
  id: string | number
  status?: string
  submission_status?: string
  title?: string
  name?: string
  venue_id?: string | number | null
  venue?: BackendVenue | null
  sports?: BackendSport[]
  sport_ids?: Array<string | number>
  teams?: BackendTeam[]
  athletes?: BackendAthlete[]
  documents?: BackendDocument[]
  created_at?: string
  updated_at?: string
}

export type CreateRegistrationRequest = {
  venue_id?: string | number | null
  sport_ids: string[]
}

export type UpsertTeamRequest = {
  registration_id: string
  sport_id?: string
  category_id?: string
  name: string
}

export type UpsertAthleteRequest = {
  registration_id: string
  team_id?: string | null
  sport_id: string
  category_id: string
  name: string
  gender: string
  birth_date: string
  institution?: string
}

export type UploadRegistrationDocumentRequest = {
  registrationId: string
  athleteId?: string
  type: string
  file: File
}

/** ===== Legacy local DTO ===== */
export type GetRegistrationResponse = RegistrationState
export type SaveRegistrationRequest = RegistrationState

export type AdminUpdatePaymentRequest = {
  userId: string
  status: PaymentStatus
  note?: string
}

export type AdminUpdateDocRequest = {
  userId: string
  registrationId?: string
  documentId?: string
  athleteId?: string
  officialId?: string
  docGroup?: "ATHLETE" | "OFFICIAL"
  docKey: DocumentKey | OfficialDocumentKey
  status: Exclude<DocumentStatus, "Belum upload" | "Sudah upload">
  note?: string
  validatedBy?: string
}

export type GetRegistrationSettingsResponse = RegistrationSettings
export type SaveRegistrationSettingsRequest = RegistrationSettings
