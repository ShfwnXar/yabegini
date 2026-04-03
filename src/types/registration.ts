import type { DocumentKey, DocumentStatus, OfficialDocumentKey, OfficialRole } from "@/data/documentCatalog"
export type { DocumentStatus } from "@/data/documentCatalog"

// =============================
// ENUM & TYPE DASAR
// =============================

export type CategoryType = "individu" | "ganda" | "tim"

export type Gender = "PUTRA" | "PUTRI"

// =============================
// STRUKTUR CABANG OLAHRAGA
// =============================

export type Category = {
  id: string
  label: string
  name?: string
  type: CategoryType
  quota: number
}

export type Sport = {
  id: string
  name: string
  categories: Category[]
}

// =============================
// DATA ATLET (STEP 3)
// =============================

export type AthletePricingStatus = "INITIAL_PAID" | "PENDING_TOP_UP" | "TOP_UP_PAID"
export type AthleteSource = "INITIAL_QUOTA" | "EXTRA_ACCESS"

export type AthleteRegistrationState = {
  pricingStatus: AthletePricingStatus
  source: AthleteSource
  isActive: boolean
}

export type Athlete = {
  id: string
  sportId: string
  categoryId: string
  name: string
  gender: Gender
  birthDate: string
  institution: string
  nisnOrNim?: string
  registrationState?: AthleteRegistrationState
  createdAt: string
}

// =============================
// DOKUMEN ATLET (STEP 4)
// =============================

export type DocumentItem = {
  fileId?: string
  fileName?: string
  mimeType?: string
  uploadedAt?: string
  validatedAt?: string
  validatedBy?: string
  status: DocumentStatus
  note?: string
}

export type AthleteDocuments = {
  athleteId: string
} & Record<DocumentKey, DocumentItem>

export type OfficialDocuments = {
  officialId: string
} & Record<OfficialDocumentKey, DocumentItem>

export type Official = {
  id: string
  sportId: string
  name: string
  phone?: string
  role: OfficialRole
}

// =============================
// PEMBAYARAN
// =============================

export type PaymentStatus =
  | "NONE"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"

export type Payment = {
  proofFileId?: string
  proofFileName?: string
  proofMimeType?: string
  status: PaymentStatus
  uploadedAt?: string
  totalFee: number
  approvedTotalFee?: number
  note?: string
}

export type ExtraAthleteAccessStatus = "NONE" | "REQUESTED" | "OPEN" | "CLOSED"

export type ExtraAthleteAccessItem = {
  sportId: string
  sportName: string
  requestedSlots: number
  approvedSlots?: number
}

export type ExtraAthleteAccess = {
  status: ExtraAthleteAccessStatus
  requestedAt?: string
  requestedSlots?: number
  requestedSportId?: string
  requestedSportName?: string
  requestItems?: ExtraAthleteAccessItem[]
  requestedReason?: string
  approvedAt?: string
  approvedBy?: string
  approvedSlots?: number
  expiresAt?: string
  adminNote?: string
}

export type TopUpPaymentStatus = "NONE" | "REQUIRED" | "PENDING" | "APPROVED" | "REJECTED"

export type TopUpPayment = {
  status: TopUpPaymentStatus
  additionalAthletes: number
  additionalFee: number
  proofFileId?: string
  proofFileName?: string
  proofMimeType?: string
  uploadedAt?: string
  approvedAt?: string
  approvedBy?: string
  note?: string
}

// =============================
// STATUS PENDAFTARAN GLOBAL
// =============================

export type RegistrationStatus =
  | "DRAFT_QUOTA"
  | "WAITING_PAYMENT_UPLOAD"
  | "WAITING_PAYMENT_VERIFICATION"
  | "PAYMENT_APPROVED"
  | "EXTRA_ACCESS_REQUESTED"
  | "EXTRA_ACCESS_OPEN"
  | "TOP_UP_REQUIRED"
  | "TOP_UP_PENDING"
  | "TOP_UP_APPROVED"
  | "TOP_UP_REJECTED"
  | "ATHLETE_DATA_IN_PROGRESS"
  | "DOCS_IN_PROGRESS"
  | "WAITING_DOC_VERIFICATION"
  | "FINAL_VALID"

// =============================
// STRUKTUR PENDAFTARAN UTAMA
// =============================

export type Registration = {
  id: string
  userId: string
  sports: Sport[]
  officials: Official[] | number
  athletes: Athlete[]
  documents: AthleteDocuments[]
  officialDocuments?: OfficialDocuments[]
  payment: Payment
  approvedAthleteQuota?: number
  activeAthleteCount?: number
  extraAthleteAccess?: ExtraAthleteAccess
  topUpPayment?: TopUpPayment
  status: RegistrationStatus
  createdAt: string
  updatedAt: string
}

// =============================
// STATISTIK & PERINGKAT
// =============================

export type MedalType = "EMAS" | "PERAK" | "PERUNGGU"

export type Winner = {
  id: string
  sportId: string
  categoryId: string
  position: 1 | 2 | 3
  medal: MedalType
  institutionName: string
}
