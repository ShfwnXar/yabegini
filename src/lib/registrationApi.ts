import type {
  Athlete,
  AthleteDocuments,
  DocumentStatus,
  PaymentStatus,
  RegistrationState,
  SportEntry,
} from "@/context/RegistrationContext"
import { DOCUMENT_FIELD_KEYS, type DocumentKey } from "@/data/documentCatalog"
import { getCanonicalCategoryId, getCanonicalSportId, getSportCatalogById } from "@/data/sportsCatalog"
import type {
  ApiEnvelope,
  BackendAthlete,
  BackendDocument,
  BackendRegistrationDetail,
  BackendRegistrationSummary,
  BackendSport,
} from "@/types/api"

type MaybeEnvelope<T> = T | ApiEnvelope<T>

function isEnvelope<T>(value: MaybeEnvelope<T>): value is ApiEnvelope<T> {
  return typeof value === "object" && value !== null && "data" in value
}

export function unwrapApiData<T>(value: MaybeEnvelope<T>): T {
  return isEnvelope(value) ? value.data : value
}

function pickString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value
    if (typeof value === "number") return String(value)
  }
  return ""
}

function normalizeStatus(status?: string): DocumentStatus {
  const value = pickString(status)
  if (!value) return "Belum upload"

  const lower = value.toLowerCase()
  if (["empty", "belum upload", "not_uploaded"].includes(lower)) return "Belum upload"
  if (["uploaded", "pending", "sudah upload"].includes(lower)) return "Sudah upload"
  if (["revision", "needs_revision", "perlu revisi"].includes(lower)) return "Perlu revisi"
  if (["approved", "disetujui"].includes(lower)) return "Disetujui"
  if (["rejected", "ditolak"].includes(lower)) return "Ditolak"

  return "Belum upload"
}

export function mapBackendSportsToEntries(sports: BackendSport[]): SportEntry[] {
  return sports.flatMap((sport) => {
    const rawSportId = pickString(sport.id)
    const sportId = getCanonicalSportId(rawSportId)
    const catalogSport = sportId ? getSportCatalogById(sportId) : null
    if (!sportId || !catalogSport) return []

    const quotaByCategory = new Map<string, number>()
    for (const category of sport.categories ?? []) {
      const canonicalCategoryId = getCanonicalCategoryId(sportId, pickString(category.id))
      if (!canonicalCategoryId) continue
      quotaByCategory.set(
        canonicalCategoryId,
        Math.max(quotaByCategory.get(canonicalCategoryId) ?? 0, Math.max(0, Number(category.quota ?? 0)))
      )
    }

    const categories = catalogSport.categories.map((category) => ({
      id: category.id,
      name: category.name,
      quota: quotaByCategory.get(category.id) ?? 0,
    }))

    return [{
      id: sportId,
      name: catalogSport.name,
      plannedAthletes: 0,
      officialCount: 0,
      categories,
    }]
  })
}

export function mapSportIdsToEntries(sportIds: Array<string | number>): SportEntry[] {
  return sportIds.flatMap((sportIdRaw) => {
    const sportId = getCanonicalSportId(pickString(sportIdRaw))
    const catalogSport = sportId ? getSportCatalogById(sportId) : null
    if (!sportId || !catalogSport) return []

    return [{
      id: sportId,
      name: catalogSport.name,
      plannedAthletes: 0,
      officialCount: 0,
      categories: catalogSport.categories.map((category) => ({
        id: category.id,
        name: category.name,
        quota: 0,
      })),
    }]
  })
}

export function mapBackendAthlete(athlete: BackendAthlete): Athlete {
  const rawSportId = pickString(athlete.sport_id)
  const sportId = getCanonicalSportId(rawSportId) ?? rawSportId
  const categoryId = getCanonicalCategoryId(sportId, pickString(athlete.category_id)) ?? pickString(athlete.category_id)

  return {
    id: pickString(athlete.id),
    teamId: pickString(athlete.team_id) || null,
    sportId,
    categoryId,
    name: pickString(athlete.name, athlete.full_name),
    gender: pickString(athlete.gender).toUpperCase() === "PUTRI" ? "PUTRI" : "PUTRA",
    birthDate: pickString(athlete.birth_date),
    institution: pickString(athlete.institution, athlete.school_name),
  }
}

function emptyDoc() {
  return { status: "Belum upload" as DocumentStatus }
}

export function groupDocumentsByAthlete(documents: BackendDocument[], athleteIds: string[]): AthleteDocuments[] {
  const map = new Map<string, AthleteDocuments>()

  for (const athleteId of athleteIds) {
    const athleteDocs = { athleteId } as AthleteDocuments
    for (const key of DOCUMENT_FIELD_KEYS) athleteDocs[key] = emptyDoc()
    map.set(athleteId, athleteDocs)
  }

  for (const document of documents) {
    const athleteId = pickString(document.athlete_id)
    if (!athleteId || !map.has(athleteId)) continue

    const docType = mapDocumentTypeToDocKey(pickString(document.type, document.document_type))
    if (!docType) continue

    const current = map.get(athleteId)
    if (!current) continue

    current[docType] = {
      status: normalizeStatus(document.status),
      fileId: pickString(document.id),
      fileName: pickString(document.file_name),
      uploadedAt: pickString(document.uploaded_at, document.created_at),
      note: pickString(document.note),
    }
  }

  return Array.from(map.values())
}

function inferPaymentStatus(rawStatus?: string, fallback?: PaymentStatus): PaymentStatus {
  const value = (rawStatus || "").toUpperCase()
  if (value.includes("APPROVED")) return "APPROVED"
  if (value.includes("PENDING")) return "PENDING"
  if (value.includes("REJECTED")) return "REJECTED"
  return fallback ?? "NONE"
}

export function isTerminalRegistrationStatus(status?: string) {
  const value = (status || "").toLowerCase()
  return ["submitted", "final", "closed", "approved", "completed"].some((item) => value.includes(item))
}

export function mapRegistrationDetailToState(
  detail: BackendRegistrationDetail,
  fallbackState?: RegistrationState | null
): RegistrationState {
  const normalizedDetail = normalizeRegistrationDetail(detail)
  const sports =
    normalizedDetail.sports && normalizedDetail.sports.length > 0
      ? mapBackendSportsToEntries(normalizedDetail.sports)
      : normalizedDetail.sport_ids && normalizedDetail.sport_ids.length > 0
      ? mapSportIdsToEntries(normalizedDetail.sport_ids)
      : fallbackState?.sports ?? []
  const athletes = (normalizedDetail.athletes ?? []).map(mapBackendAthlete)
  const athleteIds = athletes.map((athlete) => athlete.id)
  const documents = groupDocumentsByAthlete(normalizedDetail.documents ?? [], athleteIds)

  for (const sport of sports) {
    const athletesInSport = athletes.filter((athlete) => athlete.sportId === sport.id).length
    sport.plannedAthletes = Math.max(sport.plannedAthletes, athletesInSport)
  }

  return {
    sports,
    athletes,
    officials: [],
    documents,
    officialDocuments: fallbackState?.officialDocuments ?? [],
    payment: {
      status: inferPaymentStatus(detail.status ?? detail.submission_status, fallbackState?.payment.status),
      totalFee: fallbackState?.payment.totalFee ?? 0,
      proofFileId: fallbackState?.payment.proofFileId,
      proofFileName: fallbackState?.payment.proofFileName,
      proofMimeType: fallbackState?.payment.proofMimeType,
      uploadedAt: fallbackState?.payment.uploadedAt,
      note: fallbackState?.payment.note,
      approvedTotalFee: fallbackState?.payment.approvedTotalFee,
    },
    updatedAt: pickString(normalizedDetail.updated_at, normalizedDetail.created_at) || new Date().toISOString(),
  }
}

export function normalizeRegistrationDetail(detail: BackendRegistrationDetail): BackendRegistrationDetail & {
  sport_ids: Array<string | number>
  documents: BackendDocument[]
} {
  const derivedSportIds =
    detail.sport_ids && detail.sport_ids.length > 0
      ? detail.sport_ids
      : (detail.sports ?? []).map((sport) => sport.id)

  return {
    ...detail,
    sport_ids: derivedSportIds,
    documents: Array.isArray(detail.documents) ? detail.documents : [],
  }
}

export function summarizeRegistrationList(items: BackendRegistrationSummary[]) {
  return items.map((item) => ({
    id: pickString(item.id),
    status: pickString(item.status, item.submission_status) || "draft",
    title: pickString(item.title, item.name) || `Registrasi #${pickString(item.id)}`,
    updatedAt: pickString(item.updated_at, item.created_at),
  }))
}

export function mapDocumentTypeToDocKey(type: string): DocumentKey | null {
  const value = type.trim().toLowerCase()
  if (!value) return null

  if (["dapodik", "pd_dikti", "student_registry", "education_registry", "proof_of_registration"].includes(value)) return "buktiTerdaftar"
  if (["recommendation_letter", "surat_rekomendasi"].includes(value)) return "suratRekomendasi"
  if (["active_letter", "surat_aktif"].includes(value)) return "suratAktif"
  if (["athlete_bio", "biodata_atlet"].includes(value)) return "biodataAtlet"
  if (["athlete_statement", "surat_pernyataan_atlet"].includes(value)) return "suratPernyataanAtlet"
  if (["parental_consent", "surat_izin_orang_tua"].includes(value)) return "suratIzinOrangTua"
  if (["ktp", "kia", "identity_card"].includes(value)) return "ktpKia"
  if (["birth_certificate", "akta_kelahiran"].includes(value)) return "aktaKelahiran"
  if (["student_card", "membership_card", "kartu", "ktm", "kartu_pelajar_ktm"].includes(value)) return "kartuPelajarKtm"
  if (["raport", "report_card", "study_result_card", "khs", "raport_khs"].includes(value)) return "raportKhs"
  if (["health_certificate", "bpjs_ketenagakerjaan", "surat_sehat_bpjs"].includes(value)) return "suratSehatBpjs"
  if (["foto", "photo", "pas_foto", "passport_photo"].includes(value)) return "pasFoto"
  return null
}

export function mapDocKeyToDocumentType(docKey: DocumentKey) {
  const map: Record<DocumentKey, string> = {
    buktiTerdaftar: "proof_of_registration",
    suratRekomendasi: "recommendation_letter",
    suratAktif: "active_letter",
    biodataAtlet: "athlete_bio",
    suratPernyataanAtlet: "athlete_statement",
    suratIzinOrangTua: "parental_consent",
    ktpKia: "identity_card",
    aktaKelahiran: "birth_certificate",
    kartuPelajarKtm: "kartu_pelajar_ktm",
    raportKhs: "raport_khs",
    suratSehatBpjs: "surat_sehat_bpjs",
    pasFoto: "passport_photo",
  }

  return map[docKey]
}
