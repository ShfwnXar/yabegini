import type { RegistrationRepository } from "@/repositories/registrationRepo"
import type { RegistrationState, AthleteDocuments, PaymentStatus, DocumentStatus } from "@/context/RegistrationContext"
import type { DocumentKey, OfficialDocumentKey } from "@/data/documentCatalog"
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

type DocKey = DocumentKey
type AnyDocKey = DocumentKey | OfficialDocumentKey

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toRegistrationKey(userId: string) {
  return `mg26_registration_${userId}`
}

function toRegistrationStepByPayment(status: PaymentStatus): string {
  if (status === "APPROVED") return "PAYMENT_APPROVED"
  if (status === "REJECTED") return "WAITING_PAYMENT_UPLOAD"
  if (status === "PENDING") return "WAITING_PAYMENT_VERIFICATION"
  return "DRAFT_QUOTA"
}

export class MockRegistrationRepo implements RegistrationRepository {
  async getRegistrationByUserId(userId: string): Promise<RegistrationState | null> {
    return safeParse<RegistrationState | null>(localStorage.getItem(toRegistrationKey(userId)), null)
  }

  async saveRegistrationByUserId(userId: string, state: RegistrationState): Promise<void> {
    localStorage.setItem(toRegistrationKey(userId), JSON.stringify(state))
  }

  async listSports(): Promise<BackendSport[]> {
    return []
  }

  async listVenues(): Promise<BackendVenue[]> {
    return []
  }

  async getMyContingent(): Promise<BackendContingent | null> {
    return null
  }

  async listRegistrations(): Promise<BackendRegistrationSummary[]> {
    return []
  }

  async createRegistration(_input: CreateRegistrationRequest): Promise<BackendRegistrationDetail> {
    return { id: "mock-registration", status: "draft" }
  }

  async getRegistrationById(_registrationId: string): Promise<BackendRegistrationDetail> {
    return { id: "mock-registration", status: "draft" }
  }

  async deleteRegistration(_registrationId: string): Promise<void> {}

  async createTeam(_input: UpsertTeamRequest): Promise<BackendTeam> {
    return { id: "mock-team" }
  }

  async listTeams(_registrationId?: string): Promise<BackendTeam[]> {
    return []
  }

  async getTeamById(teamId: string): Promise<BackendTeam> {
    return { id: teamId }
  }

  async updateTeam(teamId: string, _input: UpsertTeamRequest): Promise<BackendTeam> {
    return { id: teamId }
  }

  async deleteTeam(_teamId: string): Promise<void> {}

  async createAthlete(input: UpsertAthleteRequest): Promise<BackendAthlete> {
    return {
      id: "mock-athlete",
      registration_id: input.registration_id,
      team_id: input.team_id ?? null,
      sport_id: input.sport_id,
      category_id: input.category_id,
      name: input.name,
      gender: input.gender,
      birth_date: input.birth_date,
      institution: input.institution,
    }
  }

  async listAthletes(_registrationId?: string): Promise<BackendAthlete[]> {
    return []
  }

  async getAthleteById(athleteId: string): Promise<BackendAthlete> {
    return { id: athleteId }
  }

  async updateAthlete(athleteId: string, input: UpsertAthleteRequest): Promise<BackendAthlete> {
    return {
      id: athleteId,
      registration_id: input.registration_id,
      team_id: input.team_id ?? null,
      sport_id: input.sport_id,
      category_id: input.category_id,
      name: input.name,
      gender: input.gender,
      birth_date: input.birth_date,
      institution: input.institution,
    }
  }

  async deleteAthlete(_athleteId: string): Promise<void> {}

  async uploadRegistrationDocument(input: UploadRegistrationDocumentRequest): Promise<BackendDocument> {
    return {
      id: `${input.registrationId}-${input.type}`,
      registration_id: input.registrationId,
      athlete_id: input.athleteId,
      type: input.type,
      file_name: input.file.name,
      status: "Sudah upload",
    }
  }

  async listRegistrationDocuments(_registrationId: string): Promise<BackendDocument[]> {
    return []
  }

  async submitRegistration(registrationId: string): Promise<BackendRegistrationDetail> {
    return { id: registrationId, status: "submitted" }
  }

  async adminUpdatePayment(input: AdminUpdatePaymentRequest): Promise<void> {
    const key = toRegistrationKey(input.userId)
    const reg = safeParse<(RegistrationState & { status?: string }) | null>(localStorage.getItem(key), null)
    if (!reg) return

    const updated = {
      ...reg,
      payment: {
        ...reg.payment,
        status: input.status,
        note: input.note,
      },
      status: toRegistrationStepByPayment(input.status),
      updatedAt: new Date().toISOString(),
    }

    localStorage.setItem(key, JSON.stringify(updated))
  }

  async adminUpdateDoc(input: AdminUpdateDocRequest): Promise<void> {
    const key = toRegistrationKey(input.userId)
    const reg = safeParse<RegistrationState | null>(localStorage.getItem(key), null)
    if (!reg) return

    const docKey = input.docKey as AnyDocKey
    const nextStatus = input.status as Exclude<DocumentStatus, "Belum upload" | "Sudah upload">
    const updatedAt = new Date().toISOString()

    const updatedOfficialDocs =
      input.docGroup === "OFFICIAL" && input.officialId
        ? reg.officialDocuments.map((doc) => {
            if (doc.officialId !== input.officialId) return doc
            return {
              ...doc,
              [docKey]: {
                ...doc[docKey as OfficialDocumentKey],
                status: nextStatus,
                note: input.note,
                validatedAt: updatedAt,
                validatedBy: input.validatedBy,
              },
            }
          })
        : reg.officialDocuments

    const updatedAthleteDocs =
      input.docGroup === "OFFICIAL"
        ? reg.documents
        : reg.documents.map((doc) => {
            if (doc.athleteId !== input.athleteId) return doc
            return {
              ...doc,
              [docKey]: {
                ...doc[docKey as DocKey],
                status: nextStatus,
                note: input.note,
                validatedAt: updatedAt,
                validatedBy: input.validatedBy,
              },
            }
          })

    const updated: RegistrationState = {
      ...reg,
      documents: updatedAthleteDocs,
      officialDocuments: updatedOfficialDocs,
      updatedAt,
    }

    localStorage.setItem(key, JSON.stringify(updated))
  }
}
