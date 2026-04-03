import type { RegistrationState } from "@/context/RegistrationContext"
import type {
  AdminUpdateDocRequest,
  AdminUpdatePaymentRequest,
  BackendAthlete,
  BackendContingent,
  BackendDocument,
  BackendRegistrationDetail,
  BackendRegistrationSummary,
  BackendSport,
  BackendTeam,
  BackendVenue,
  CreateRegistrationRequest,
  UploadRegistrationDocumentRequest,
  UpsertAthleteRequest,
  UpsertTeamRequest,
} from "@/types/api"

export interface RegistrationRepository {
  getRegistrationByUserId(userId: string): Promise<RegistrationState | null>
  saveRegistrationByUserId(userId: string, state: RegistrationState): Promise<void>

  listSports(): Promise<BackendSport[]>
  listVenues(): Promise<BackendVenue[]>
  getMyContingent(): Promise<BackendContingent | null>
  listRegistrations(): Promise<BackendRegistrationSummary[]>
  createRegistration(input: CreateRegistrationRequest): Promise<BackendRegistrationDetail>
  getRegistrationById(registrationId: string): Promise<BackendRegistrationDetail>
  deleteRegistration(registrationId: string): Promise<void>

  createTeam(input: UpsertTeamRequest): Promise<BackendTeam>
  listTeams(registrationId?: string): Promise<BackendTeam[]>
  getTeamById(teamId: string): Promise<BackendTeam>
  updateTeam(teamId: string, input: UpsertTeamRequest): Promise<BackendTeam>
  deleteTeam(teamId: string): Promise<void>

  createAthlete(input: UpsertAthleteRequest): Promise<BackendAthlete>
  listAthletes(registrationId?: string): Promise<BackendAthlete[]>
  getAthleteById(athleteId: string): Promise<BackendAthlete>
  updateAthlete(athleteId: string, input: UpsertAthleteRequest): Promise<BackendAthlete>
  deleteAthlete(athleteId: string): Promise<void>

  uploadRegistrationDocument(input: UploadRegistrationDocumentRequest): Promise<BackendDocument>
  listRegistrationDocuments(registrationId: string): Promise<BackendDocument[]>
  submitRegistration(registrationId: string): Promise<BackendRegistrationDetail | { message?: string }>

  // admin
  adminUpdatePayment(input: AdminUpdatePaymentRequest): Promise<void>
  adminUpdateDoc(input: AdminUpdateDocRequest): Promise<void>
}
