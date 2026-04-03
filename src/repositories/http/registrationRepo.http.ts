import type { RegistrationRepository } from "@/repositories/registrationRepo"
import type { RegistrationState } from "@/context/RegistrationContext"
import type {
  AdminUpdateDocRequest,
  AdminUpdatePaymentRequest,
  ApiEnvelope,
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
import { ENV } from "@/config/env"
import { getAuthToken } from "@/lib/authSession"
import { http } from "@/lib/http"
import { unwrapApiData } from "@/lib/registrationApi"

export class HttpRegistrationRepo implements RegistrationRepository {
  private baseUrl() {
    if (!ENV.API_BASE_URL) {
      throw new Error("NEXT_PUBLIC_API_BASE_URL belum dikonfigurasi.")
    }
    return ENV.API_BASE_URL
  }

  private token() {
    return getAuthToken() ?? undefined
  }

  private async get<T>(path: string) {
    const res = await http<ApiEnvelope<T> | T>(`${this.baseUrl()}${path}`, {
      token: this.token(),
    })
    return unwrapApiData(res)
  }

  private async send<T>(
    path: string,
    method: "POST" | "PUT" | "PATCH" | "DELETE",
    body?: BodyInit | FormData | Record<string, unknown> | null
  ) {
    const res = await http<ApiEnvelope<T> | T>(`${this.baseUrl()}${path}`, {
      method,
      body: body ?? null,
      token: this.token(),
    })
    return unwrapApiData(res)
  }

  async getRegistrationByUserId(_userId: string): Promise<RegistrationState | null> {
    return null
  }

  async saveRegistrationByUserId(_userId: string, _state: RegistrationState): Promise<void> {}

  async listSports(): Promise<BackendSport[]> {
    return this.get<BackendSport[]>("/api/master/sports")
  }

  async listVenues(): Promise<BackendVenue[]> {
    return this.get<BackendVenue[]>("/api/venues")
  }

  async getMyContingent(): Promise<BackendContingent | null> {
    return this.get<BackendContingent | null>("/api/my-contingent")
  }

  async listRegistrations(): Promise<BackendRegistrationSummary[]> {
    return this.get<BackendRegistrationSummary[]>("/api/registrations")
  }

  async createRegistration(input: CreateRegistrationRequest): Promise<BackendRegistrationDetail> {
    try {
      return await this.send<BackendRegistrationDetail>("/api/registrations", "POST", input)
    } catch {
      return this.send<BackendRegistrationDetail>("/api/registrations", "POST", {
        sport_ids: input.sport_ids,
        sports: input.sport_ids,
        venue_id: input.venue_id,
      })
    }
  }

  async getRegistrationById(registrationId: string): Promise<BackendRegistrationDetail> {
    return this.get<BackendRegistrationDetail>(`/api/registrations/${registrationId}`)
  }

  async deleteRegistration(registrationId: string): Promise<void> {
    await this.send(`/api/registrations/${registrationId}`, "DELETE")
  }

  async createTeam(input: UpsertTeamRequest): Promise<BackendTeam> {
    return this.send<BackendTeam>("/api/teams", "POST", input)
  }

  async listTeams(): Promise<BackendTeam[]> {
    return this.get<BackendTeam[]>("/api/teams")
  }

  async getTeamById(teamId: string): Promise<BackendTeam> {
    return this.get<BackendTeam>(`/api/teams/${teamId}`)
  }

  async updateTeam(teamId: string, input: UpsertTeamRequest): Promise<BackendTeam> {
    return this.send<BackendTeam>(`/api/teams/${teamId}`, "PUT", input)
  }

  async deleteTeam(teamId: string): Promise<void> {
    await this.send(`/api/teams/${teamId}`, "DELETE")
  }

  async createAthlete(input: UpsertAthleteRequest): Promise<BackendAthlete> {
    return this.send<BackendAthlete>("/api/athletes", "POST", input)
  }

  async listAthletes(): Promise<BackendAthlete[]> {
    return this.get<BackendAthlete[]>("/api/athletes")
  }

  async getAthleteById(athleteId: string): Promise<BackendAthlete> {
    return this.get<BackendAthlete>(`/api/athletes/${athleteId}`)
  }

  async updateAthlete(athleteId: string, input: UpsertAthleteRequest): Promise<BackendAthlete> {
    return this.send<BackendAthlete>(`/api/athletes/${athleteId}`, "PUT", input)
  }

  async deleteAthlete(athleteId: string): Promise<void> {
    await this.send(`/api/athletes/${athleteId}`, "DELETE")
  }

  async uploadRegistrationDocument(input: UploadRegistrationDocumentRequest): Promise<BackendDocument> {
    const form = new FormData()
    form.append("type", input.type)
    form.append("file", input.file)
    if (input.athleteId) form.append("athlete_id", input.athleteId)

    const res = await http<ApiEnvelope<BackendDocument> | BackendDocument>(
      `${this.baseUrl()}/api/registrations/${input.registrationId}/documents`,
      {
        method: "POST",
        body: form,
        token: this.token(),
      }
    )

    return unwrapApiData(res)
  }

  async listRegistrationDocuments(registrationId: string): Promise<BackendDocument[]> {
    return this.get<BackendDocument[]>(`/api/registrations/${registrationId}/documents`)
  }

  async submitRegistration(registrationId: string): Promise<BackendRegistrationDetail | { message?: string }> {
    return this.send<BackendRegistrationDetail | { message?: string }>(
      `/api/workflow/registrations/${registrationId}/submit`,
      "PATCH"
    )
  }

  async adminUpdatePayment(_input: AdminUpdatePaymentRequest): Promise<void> {}

  async adminUpdateDoc(input: AdminUpdateDocRequest): Promise<void> {
    if (!input.registrationId || !input.documentId) return

    if (input.status === "Disetujui") {
      await this.send(
        `/api/registrations/${input.registrationId}/documents/${input.documentId}/approve`,
        "PATCH"
      )
      return
    }

    if (input.status === "Ditolak") {
      await this.send(
        `/api/registrations/${input.registrationId}/documents/${input.documentId}/reject`,
        "PATCH",
        { admin_note: input.note ?? "" }
      )
      return
    }

    // Endpoint revisi belum tersedia di backend, jadi sementara tetap ditangani di sisi frontend.
  }
}
