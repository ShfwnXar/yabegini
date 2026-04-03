"use client"

import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react"
import { ENV } from "@/config/env"
import { useAuth } from "@/context/AuthContext"
import {
  DOCUMENT_FIELD_KEYS,
  OFFICIAL_DOCUMENT_FIELD_KEYS,
  type DocumentKey,
  type DocumentStatus,
  type OfficialDocumentKey,
  type OfficialRole,
} from "@/data/documentCatalog"
export type { DocumentStatus } from "@/data/documentCatalog"
import { getCanonicalCategoryId, getCanonicalSportId, getSportCatalogById } from "@/data/sportsCatalog"
import { Repos } from "@/repositories"
import {
  isTerminalRegistrationStatus,
  mapDocKeyToDocumentType,
  mapRegistrationDetailToState,
  summarizeRegistrationList,
} from "@/lib/registrationApi"
import type { BackendSport, BackendVenue } from "@/types/api"

export type PaymentStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED"

export type DocFile = {
  status: DocumentStatus
  fileId?: string
  fileName?: string
  mimeType?: string
  uploadedAt?: string
  validatedAt?: string
  validatedBy?: string
  note?: string
}

export type AthleteDocuments = {
  athleteId: string
} & Record<DocumentKey, DocFile>

export type OfficialDocuments = {
  officialId: string
} & Record<OfficialDocumentKey, DocFile>

export type SportCategory = {
  id: string
  name: string
  quota: number
}

export type SportEntry = {
  id: string
  name: string
  plannedAthletes: number
  officialCount: number
  voliMenTeams?: number
  voliWomenTeams?: number
  categories: SportCategory[]
}

export type Athlete = {
  id: string
  teamId?: string | null
  sportId: string
  categoryId: string
  name: string
  gender: "PUTRA" | "PUTRI"
  birthDate: string
  institution: string
}

export type Official = {
  id: string
  sportId: string
  name: string
  phone?: string
  role: OfficialRole
}

export type PaymentInfo = {
  status: PaymentStatus
  proofFileId?: string
  proofFileName?: string
  proofMimeType?: string
  uploadedAt?: string
  note?: string
  totalFee: number
  approvedTotalFee?: number
}

export type RegistrationState = {
  sports: SportEntry[]
  athletes: Athlete[]
  officials: Official[]
  documents: AthleteDocuments[]
  officialDocuments: OfficialDocuments[]
  payment: PaymentInfo
  updatedAt?: string
}

export type RegistrationSummaryItem = {
  id: string
  status: string
  title: string
  updatedAt?: string
}

const LS_KEY_PREFIX = "mg26_registration_"

const FEE_ATHLETE = 150_000
const FEE_OFFICIAL = 0
const FEE_VOLI_TEAM = 1_500_000
const SPORT_VOLI_ID = "voli_indoor"

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function emptyDoc(): DocFile {
  return { status: "Belum upload" }
}

function ensureAthleteDocs(athleteId: string): AthleteDocuments {
  const documents = { athleteId } as AthleteDocuments
  for (const key of DOCUMENT_FIELD_KEYS) {
    documents[key] = emptyDoc()
  }
  return documents
}

function ensureOfficialDocs(officialId: string): OfficialDocuments {
  const documents = { officialId } as OfficialDocuments
  for (const key of OFFICIAL_DOCUMENT_FIELD_KEYS) {
    documents[key] = emptyDoc()
  }
  return documents
}

function normalizeStoredAthleteDocs(doc: AthleteDocuments): AthleteDocuments {
  const normalized = ensureAthleteDocs(doc.athleteId)
  const legacyMap: Partial<Record<string, DocumentKey>> = {
    dapodik: "buktiTerdaftar",
    ktp: "ktpKia",
    kartu: "kartuPelajarKtm",
    raport: "raportKhs",
    foto: "pasFoto",
  }

  for (const key of DOCUMENT_FIELD_KEYS) {
    const current = (doc as Partial<Record<DocumentKey, DocFile>>)[key]
    if (current) normalized[key] = { ...normalized[key], ...current }
  }

  for (const [legacyKey, nextKey] of Object.entries(legacyMap)) {
    if (!nextKey) continue
    const current = (doc as Record<string, DocFile | undefined>)[legacyKey]
    if (current) normalized[nextKey] = { ...normalized[nextKey], ...current }
  }

  for (const key of DOCUMENT_FIELD_KEYS) {
    if (!normalized[key].status) normalized[key].status = "Belum upload"
  }

  return normalized
}

function normalizeStoredOfficialDocs(doc: OfficialDocuments): OfficialDocuments {
  const normalized = ensureOfficialDocs(doc.officialId)

  for (const key of OFFICIAL_DOCUMENT_FIELD_KEYS) {
    const current = (doc as Partial<Record<OfficialDocumentKey, DocFile>>)[key]
    if (current) normalized[key] = { ...normalized[key], ...current }
    if (!normalized[key].status) normalized[key].status = "Belum upload"
  }

  return normalized
}

function computeTotalFee(sports: SportEntry[]) {
  let total = 0
  for (const s of sports) {
    total += Math.max(0, Number(s.officialCount || 0)) * FEE_OFFICIAL

    if (s.id === SPORT_VOLI_ID) {
      const men = Math.max(0, Number(s.voliMenTeams || 0))
      const women = Math.max(0, Number(s.voliWomenTeams || 0))
      total += (men + women) * FEE_VOLI_TEAM
      continue
    }

    total += Math.max(0, Number(s.plannedAthletes || 0)) * FEE_ATHLETE
  }
  return total
}

function getSportAthleteQuota(sport: SportEntry) {
  if (sport.id === SPORT_VOLI_ID) {
    const men = Math.max(0, Number(sport.voliMenTeams || 0))
    const women = Math.max(0, Number(sport.voliWomenTeams || 0))
    return (men + women) * 12
  }

  return Math.max(0, Number(sport.plannedAthletes || 0))
}

function sanitizeSportEntries(sports: SportEntry[]) {
  const seen = new Set<string>()
  const result: SportEntry[] = []

  for (const raw of sports || []) {
    const canonicalSportId = getCanonicalSportId(raw?.id ?? "")
    if (!canonicalSportId || seen.has(canonicalSportId)) continue
    seen.add(canonicalSportId)

    const catalogSport = getSportCatalogById(canonicalSportId)
    if (!catalogSport) continue

    const quotaByCategory = new Map<string, number>()
    for (const category of Array.isArray(raw.categories) ? raw.categories : []) {
      const canonicalCategoryId = getCanonicalCategoryId(canonicalSportId, category?.id ?? "")
      if (!canonicalCategoryId) continue
      quotaByCategory.set(
        canonicalCategoryId,
        Math.max(quotaByCategory.get(canonicalCategoryId) ?? 0, Math.max(0, Number(category?.quota ?? 0)))
      )
    }

    const categories = catalogSport.categories.map((category) => ({
      id: category.id,
      name: category.name,
      quota: quotaByCategory.get(category.id) ?? 0,
    }))

    result.push({
      ...raw,
      id: canonicalSportId,
      name: catalogSport.name,
      plannedAthletes: Math.max(0, Number(raw.plannedAthletes || 0)),
      officialCount: Math.max(0, Number(raw.officialCount || 0)),
      voliMenTeams: canonicalSportId === SPORT_VOLI_ID ? Math.max(0, Number(raw.voliMenTeams || 0)) : undefined,
      voliWomenTeams: canonicalSportId === SPORT_VOLI_ID ? Math.max(0, Number(raw.voliWomenTeams || 0)) : undefined,
      categories,
    })
  }

  return result
}

function reconcileBySports(
  sports: SportEntry[],
  athletes: Athlete[],
  officials: Official[],
  documents: AthleteDocuments[],
  officialDocuments: OfficialDocuments[]
) {
  const sportIds = new Set(sports.map((s) => s.id))

  const cleanAthletes = (athletes || [])
    .map((athlete) => {
      const canonicalSportId = getCanonicalSportId(athlete?.sportId ?? "")
      if (!canonicalSportId || !sportIds.has(canonicalSportId)) return null

      const canonicalCategoryId = getCanonicalCategoryId(canonicalSportId, athlete?.categoryId ?? "")
      if (!canonicalCategoryId) return null

      return {
        ...athlete,
        sportId: canonicalSportId,
        categoryId: canonicalCategoryId,
      }
    })
    .filter(
      (athlete): athlete is Athlete =>
        !!athlete?.id &&
        !!athlete.sportId &&
        !!athlete.categoryId &&
        !!athlete.name?.trim() &&
        !!athlete.birthDate &&
        sportIds.has(athlete.sportId)
    )

  const cleanOfficials = (officials || [])
    .map((official) => {
      const canonicalSportId = getCanonicalSportId(official?.sportId ?? "")
      if (!canonicalSportId || !sportIds.has(canonicalSportId)) return null

      return {
        ...official,
        sportId: canonicalSportId,
        role: official?.role === "PELATIH" ? "PELATIH" : "OFFICIAL",
      }
    })
    .filter((official): official is Official => !!official?.id && !!official.name?.trim() && sportIds.has(official.sportId))

  const athleteIds = new Set(cleanAthletes.map((a) => a.id))
  const docsMap = new Map<string, AthleteDocuments>()
  for (const d of documents || []) {
    if (!d?.athleteId || !athleteIds.has(d.athleteId)) continue
    docsMap.set(d.athleteId, normalizeStoredAthleteDocs(d))
  }
  for (const a of cleanAthletes) {
    if (!docsMap.has(a.id)) docsMap.set(a.id, ensureAthleteDocs(a.id))
  }

  const officialIds = new Set(cleanOfficials.map((o) => o.id))
  const officialDocsMap = new Map<string, OfficialDocuments>()
  for (const d of officialDocuments || []) {
    if (!d?.officialId || !officialIds.has(d.officialId)) continue
    officialDocsMap.set(d.officialId, normalizeStoredOfficialDocs(d))
  }
  for (const o of cleanOfficials) {
    if (!officialDocsMap.has(o.id)) officialDocsMap.set(o.id, ensureOfficialDocs(o.id))
  }

  const athleteCountBySport = new Map<string, number>()
  for (const a of cleanAthletes) athleteCountBySport.set(a.sportId, (athleteCountBySport.get(a.sportId) ?? 0) + 1)

  const officialCountBySport = new Map<string, number>()
  for (const o of cleanOfficials) officialCountBySport.set(o.sportId, (officialCountBySport.get(o.sportId) ?? 0) + 1)

  const adjustedSports = sports.map((s) => ({
    ...s,
    plannedAthletes: Math.max(s.plannedAthletes, athleteCountBySport.get(s.id) ?? 0),
    officialCount: Math.max(s.officialCount, officialCountBySport.get(s.id) ?? 0),
  }))

  return {
    sports: adjustedSports,
    athletes: cleanAthletes,
    officials: cleanOfficials,
    documents: Array.from(docsMap.values()),
    officialDocuments: Array.from(officialDocsMap.values()),
  }
}

const initialState: RegistrationState = {
  sports: [],
  athletes: [],
  officials: [],
  documents: [],
  officialDocuments: [],
  payment: { status: "NONE", totalFee: 0 },
}

type Action =
  | { type: "LOAD"; payload: RegistrationState }
  | { type: "RESET" }
  | { type: "SET_SPORTS"; sports: SportEntry[] }
  | {
      type: "UPDATE_SPORT_PLANNING"
      sportId: string
      patch: Partial<Pick<SportEntry, "plannedAthletes" | "officialCount" | "voliMenTeams" | "voliWomenTeams">>
    }
  | { type: "SET_PAYMENT_PROOF"; fileId: string; fileName: string; mimeType: string }
  | { type: "SET_PAYMENT_STATUS"; status: PaymentStatus; note?: string }
  | { type: "ADD_ATHLETE"; athlete: Athlete }
  | { type: "UPDATE_ATHLETE"; athlete: Athlete }
  | { type: "REMOVE_ATHLETE"; athleteId: string }
  | { type: "ADD_OFFICIAL"; official: Official }
  | { type: "REMOVE_OFFICIAL"; officialId: string }
  | {
      type: "UPSERT_DOC_FILE"
      athleteId: string
      docKey: DocumentKey
      fileId: string
      fileName: string
      mimeType: string
    }
  | {
      type: "UPSERT_OFFICIAL_DOC_FILE"
      officialId: string
      docKey: OfficialDocumentKey
      fileId: string
      fileName: string
      mimeType: string
    }
  | {
      type: "SET_DOC_STATUS"
      athleteId: string
      docKey: DocumentKey
      status: Exclude<DocumentStatus, "Belum upload" | "Sudah upload">
      note?: string
      validatedBy?: string
    }
  | {
      type: "SET_OFFICIAL_DOC_STATUS"
      officialId: string
      docKey: OfficialDocumentKey
      status: Exclude<DocumentStatus, "Belum upload" | "Sudah upload">
      note?: string
      validatedBy?: string
    }

function reducer(state: RegistrationState, action: Action): RegistrationState {
  switch (action.type) {
    case "LOAD": {
      const p = action.payload || ({} as RegistrationState)
      const reconciled = reconcileBySports(
        sanitizeSportEntries(p.sports || []),
        p.athletes || [],
        p.officials || [],
        p.documents || [],
        p.officialDocuments || []
      )
      return {
        ...initialState,
        ...p,
        sports: reconciled.sports,
        athletes: reconciled.athletes,
        officials: reconciled.officials,
        documents: reconciled.documents,
        officialDocuments: reconciled.officialDocuments,
        payment: { ...initialState.payment, ...(p.payment || {}), totalFee: computeTotalFee(reconciled.sports) },
      }
    }

    case "RESET":
      return { ...initialState }

    case "SET_SPORTS": {
      const reconciled = reconcileBySports(
        sanitizeSportEntries(action.sports),
        state.athletes,
        state.officials,
        state.documents,
        state.officialDocuments
      )
      return {
        ...state,
        sports: reconciled.sports,
        athletes: reconciled.athletes,
        officials: reconciled.officials,
        documents: reconciled.documents,
        officialDocuments: reconciled.officialDocuments,
        payment: { ...state.payment, totalFee: computeTotalFee(reconciled.sports) },
        updatedAt: new Date().toISOString(),
      }
    }

    case "UPDATE_SPORT_PLANNING": {
      const athleteCount = state.athletes.filter((a) => a.sportId === action.sportId).length
      const officialCountInState = state.officials.filter((o) => o.sportId === action.sportId).length

      const sports = state.sports.map((s) => {
        if (s.id !== action.sportId) return s
        const next = { ...s, ...action.patch }
        next.plannedAthletes = Math.max(athleteCount, Number(next.plannedAthletes || 0))
        next.officialCount = Math.max(officialCountInState, Number(next.officialCount || 0))
        if (next.id === SPORT_VOLI_ID) {
          next.voliMenTeams = Math.max(0, Number(next.voliMenTeams || 0))
          next.voliWomenTeams = Math.max(0, Number(next.voliWomenTeams || 0))
        }
        return next
      })

      return {
        ...state,
        sports,
        payment: { ...state.payment, totalFee: computeTotalFee(sports) },
        updatedAt: new Date().toISOString(),
      }
    }

    case "SET_PAYMENT_PROOF":
      return {
        ...state,
        payment: {
          ...state.payment,
          proofFileId: action.fileId,
          proofFileName: action.fileName,
          proofMimeType: action.mimeType,
          uploadedAt: new Date().toISOString(),
          status: "PENDING",
        },
        updatedAt: new Date().toISOString(),
      }

    case "SET_PAYMENT_STATUS":
      return {
        ...state,
        payment: { ...state.payment, status: action.status, note: action.note },
        updatedAt: new Date().toISOString(),
      }

    case "ADD_ATHLETE": {
      const sport = state.sports.find((s) => s.id === action.athlete.sportId)
      if (!sport || !action.athlete.name?.trim() || !action.athlete.birthDate || !action.athlete.categoryId) return state

      const currentSportAthletes = state.athletes.filter((a) => a.sportId === action.athlete.sportId).length
      const sportAthleteQuota = getSportAthleteQuota(sport)
      if (currentSportAthletes >= sportAthleteQuota) return state

      const categoryQuota = sport.categories.find((c) => c.id === action.athlete.categoryId)?.quota
      if (typeof categoryQuota === "number" && categoryQuota > 0) {
        const currentCategoryAthletes = state.athletes.filter(
          (a) => a.sportId === action.athlete.sportId && a.categoryId === action.athlete.categoryId
        ).length
        if (currentCategoryAthletes >= categoryQuota) return state
      }

      const athletes = [action.athlete, ...state.athletes]
      const hasDocs = state.documents.some((d) => d.athleteId === action.athlete.id)
      const documents = hasDocs ? state.documents : [ensureAthleteDocs(action.athlete.id), ...state.documents]
      return { ...state, athletes, documents, updatedAt: new Date().toISOString() }
    }

    case "UPDATE_ATHLETE": {
      const sport = state.sports.find((s) => s.id === action.athlete.sportId)
      if (!sport || !action.athlete.name?.trim() || !action.athlete.birthDate || !action.athlete.categoryId) return state
      const athletes = state.athletes.map((a) => (a.id === action.athlete.id ? action.athlete : a))
      return { ...state, athletes, updatedAt: new Date().toISOString() }
    }

    case "REMOVE_ATHLETE":
      return {
        ...state,
        athletes: state.athletes.filter((a) => a.id !== action.athleteId),
        documents: state.documents.filter((d) => d.athleteId !== action.athleteId),
        updatedAt: new Date().toISOString(),
      }

    case "ADD_OFFICIAL": {
      const sport = state.sports.find((s) => s.id === action.official.sportId)
      if (!sport || !action.official.name?.trim()) return state

      const currentOfficials = state.officials.filter((o) => o.sportId === action.official.sportId).length
      if (currentOfficials >= sport.officialCount) return state

      const officials = [action.official, ...state.officials]
      const hasDocs = state.officialDocuments.some((d) => d.officialId === action.official.id)
      const officialDocuments = hasDocs ? state.officialDocuments : [ensureOfficialDocs(action.official.id), ...state.officialDocuments]
      return { ...state, officials, officialDocuments, updatedAt: new Date().toISOString() }
    }

    case "REMOVE_OFFICIAL":
      return {
        ...state,
        officials: state.officials.filter((o) => o.id !== action.officialId),
        officialDocuments: state.officialDocuments.filter((d) => d.officialId !== action.officialId),
        updatedAt: new Date().toISOString(),
      }

    case "UPSERT_DOC_FILE": {
      const athleteExists = state.athletes.some((a) => a.id === action.athleteId)
      if (!athleteExists) return state

      const uploadedDoc = {
        status: "Sudah upload" as DocumentStatus,
        fileId: action.fileId,
        fileName: action.fileName,
        mimeType: action.mimeType,
        uploadedAt: new Date().toISOString(),
        validatedAt: undefined,
        validatedBy: undefined,
        note: undefined,
      }

      const exists = state.documents.some((d) => d.athleteId === action.athleteId)
      const finalDocs = exists
        ? state.documents.map((d) => {
            if (d.athleteId !== action.athleteId) return d
            return {
              ...d,
              [action.docKey]: uploadedDoc,
            }
          })
        : [
            {
              ...ensureAthleteDocs(action.athleteId),
              [action.docKey]: uploadedDoc,
            },
            ...state.documents,
          ]

      return { ...state, documents: finalDocs, updatedAt: new Date().toISOString() }
    }

    case "UPSERT_OFFICIAL_DOC_FILE": {
      const officialExists = state.officials.some((o) => o.id === action.officialId)
      if (!officialExists) return state

      const uploadedDoc = {
        status: "Sudah upload" as DocumentStatus,
        fileId: action.fileId,
        fileName: action.fileName,
        mimeType: action.mimeType,
        uploadedAt: new Date().toISOString(),
        validatedAt: undefined,
        validatedBy: undefined,
        note: undefined,
      }

      const exists = state.officialDocuments.some((d) => d.officialId === action.officialId)
      const finalDocs = exists
        ? state.officialDocuments.map((d) => {
            if (d.officialId !== action.officialId) return d
            return {
              ...d,
              [action.docKey]: uploadedDoc,
            }
          })
        : [
            {
              ...ensureOfficialDocs(action.officialId),
              [action.docKey]: uploadedDoc,
            },
            ...state.officialDocuments,
          ]

      return { ...state, officialDocuments: finalDocs, updatedAt: new Date().toISOString() }
    }

    case "SET_DOC_STATUS": {
      const athleteExists = state.athletes.some((a) => a.id === action.athleteId)
      if (!athleteExists) return state

      const documents = state.documents.map((d) => {
        if (d.athleteId !== action.athleteId) return d
        const prev = d[action.docKey]
        return {
          ...d,
          [action.docKey]: {
            ...prev,
            status: action.status,
            note: action.note,
            validatedAt: new Date().toISOString(),
            validatedBy: action.validatedBy,
          },
        }
      })
      return { ...state, documents, updatedAt: new Date().toISOString() }
    }

    case "SET_OFFICIAL_DOC_STATUS": {
      const officialExists = state.officials.some((o) => o.id === action.officialId)
      if (!officialExists) return state

      const officialDocuments = state.officialDocuments.map((d) => {
        if (d.officialId !== action.officialId) return d
        const prev = d[action.docKey]
        return {
          ...d,
          [action.docKey]: {
            ...prev,
            status: action.status,
            note: action.note,
            validatedAt: new Date().toISOString(),
            validatedBy: action.validatedBy,
          },
        }
      })
      return { ...state, officialDocuments, updatedAt: new Date().toISOString() }
    }

    default:
      return state
  }
}

type RegistrationContextValue = {
  state: RegistrationState
  dispatch: React.Dispatch<Action>
  storageKey: string | null
  hydrateReady: boolean
  remoteReady: boolean
  activeRegistrationId: string | null
  registrationSummaries: RegistrationSummaryItem[]
  masterSports: BackendSport[]
  venues: BackendVenue[]

  setSports: (sports: SportEntry[]) => void
  updateSportPlanning: (
    sportId: string,
    patch: Partial<Pick<SportEntry, "plannedAthletes" | "officialCount" | "voliMenTeams" | "voliWomenTeams">>
  ) => void
  ensureDraftRegistration: (sportIds?: string[]) => Promise<string | null>
  openRegistration: (registrationId: string) => Promise<void>
  deleteRegistration: (registrationId: string) => Promise<void>
  refreshRegistrationList: () => Promise<void>
  refreshRemoteRegistration: (registrationId?: string) => Promise<void>

  setPaymentProof: (fileId: string, fileName: string, mimeType: string) => void

  addAthlete: (athlete: Omit<Athlete, "id">) => string
  updateAthlete: (athlete: Athlete) => void
  removeAthlete: (athleteId: string) => void
  syncAthleteBatch: (athletes: Array<Omit<Athlete, "id">>) => Promise<void>
  deleteAthleteRemote: (athleteId: string) => Promise<void>

  addOfficial: (official: Omit<Official, "id">) => string
  removeOfficial: (officialId: string) => void

  upsertDocFile: (
    athleteId: string,
    docKey: DocumentKey,
    fileId: string,
    fileName: string,
    mimeType: string
  ) => void
  upsertOfficialDocFile: (
    officialId: string,
    docKey: OfficialDocumentKey,
    fileId: string,
    fileName: string,
    mimeType: string
  ) => void
  uploadDocument: (
    athleteId: string,
    docKey: DocumentKey,
    file: File
  ) => Promise<void>
  submitRegistration: () => Promise<{ ok: boolean; message: string }>
}

const RegistrationContext = createContext<RegistrationContextValue | null>(null)

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [hydrateReady, setHydrateReady] = React.useState(false)
  const [remoteReady, setRemoteReady] = React.useState(false)
  const [activeRegistrationId, setActiveRegistrationId] = React.useState<string | null>(null)
  const [registrationSummaries, setRegistrationSummaries] = React.useState<RegistrationSummaryItem[]>([])
  const [masterSports, setMasterSports] = React.useState<BackendSport[]>([])
  const [venues, setVenues] = React.useState<BackendVenue[]>([])

  const storageKey = user ? `${LS_KEY_PREFIX}${user.id}` : null

  useEffect(() => {
    if (!storageKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHydrateReady(true)
      return
    }

    const saved = safeParse<RegistrationState | null>(localStorage.getItem(storageKey), null)
    if (saved) dispatch({ type: "LOAD", payload: saved })
    else dispatch({ type: "LOAD", payload: initialState })

    setHydrateReady(true)
  }, [storageKey])

  useEffect(() => {
    if (!storageKey) return
    if (!hydrateReady) return
    try {
      localStorage.setItem(storageKey, JSON.stringify(state))
    } catch (e) {
      console.error("Failed to persist registration state:", e)
    }
  }, [state, storageKey, hydrateReady])

  const refreshRegistrationList = React.useCallback(async () => {
    if (ENV.USE_MOCK || !token) {
      setRemoteReady(true)
      return
    }

    const [sports, venueList, registrations] = await Promise.all([
      Repos.registration.listSports().catch(() => []),
      Repos.registration.listVenues().catch(() => []),
      Repos.registration.listRegistrations().catch(() => []),
    ])

    setMasterSports(Array.isArray(sports) ? sports : [])
    setVenues(Array.isArray(venueList) ? venueList : [])
    setRegistrationSummaries(summarizeRegistrationList(Array.isArray(registrations) ? registrations : []))
    setRemoteReady(true)
  }, [token])

  const refreshRemoteRegistration = React.useCallback(
    async (registrationId?: string) => {
      const targetId = registrationId ?? activeRegistrationId
      if (ENV.USE_MOCK || !token || !targetId) return

      const detail = await Repos.registration.getRegistrationById(targetId)
      const documents = await Repos.registration.listRegistrationDocuments(targetId).catch(() => detail.documents ?? [])
      dispatch({
        type: "LOAD",
        payload: mapRegistrationDetailToState({ ...detail, documents }, state),
      })
      setActiveRegistrationId(String(detail.id))
    },
    [activeRegistrationId, state, token]
  )

  const openRegistration = React.useCallback(
    async (registrationId: string) => {
      await refreshRemoteRegistration(registrationId)
    },
    [refreshRemoteRegistration]
  )

  const ensureDraftRegistration = React.useCallback(
    async (sportIds?: string[]) => {
      if (ENV.USE_MOCK || !token) return activeRegistrationId
      const activeSummary = registrationSummaries.find((item) => item.id === activeRegistrationId)
      if (activeRegistrationId && activeSummary && !isTerminalRegistrationStatus(activeSummary.status)) {
        return activeRegistrationId
      }

      const selectedSportIds = (sportIds && sportIds.length > 0 ? sportIds : state.sports.map((sport) => sport.id)).filter(Boolean)
      if (selectedSportIds.length === 0) return null

      const created = await Repos.registration.createRegistration({
        sport_ids: selectedSportIds,
        venue_id: venues[0]?.id ?? null,
      })

      const nextId = String(created.id)
      setActiveRegistrationId(nextId)
      dispatch({ type: "LOAD", payload: mapRegistrationDetailToState(created, state) })
      await refreshRegistrationList()
      return nextId
    },
    [activeRegistrationId, refreshRegistrationList, registrationSummaries, state, token, venues]
  )

  useEffect(() => {
    if (!hydrateReady) return
    if (!token || ENV.USE_MOCK) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemoteReady(true)
      return
    }

    void refreshRegistrationList()
  }, [hydrateReady, refreshRegistrationList, token])

  useEffect(() => {
    if (!remoteReady) return
    if (activeRegistrationId) return
    if (registrationSummaries.length === 0) return

    const firstOpenable =
      registrationSummaries.find((item) => !isTerminalRegistrationStatus(item.status)) ?? registrationSummaries[0]
    const timer = window.setTimeout(() => {
      void openRegistration(firstOpenable.id)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeRegistrationId, openRegistration, registrationSummaries, remoteReady])

  const value = useMemo<RegistrationContextValue>(() => {
    return {
      state,
      dispatch,
      storageKey,
      hydrateReady,
      remoteReady,
      activeRegistrationId,
      registrationSummaries,
      masterSports,
      venues,

      setSports: (sports) => dispatch({ type: "SET_SPORTS", sports }),
      updateSportPlanning: (sportId, patch) => dispatch({ type: "UPDATE_SPORT_PLANNING", sportId, patch }),
      ensureDraftRegistration,
      openRegistration,
      deleteRegistration: async (registrationId) => {
        if (ENV.USE_MOCK || !token) return
        await Repos.registration.deleteRegistration(registrationId)
        if (activeRegistrationId === registrationId) {
          setActiveRegistrationId(null)
          dispatch({ type: "LOAD", payload: initialState })
        }
        await refreshRegistrationList()
      },
      refreshRegistrationList,
      refreshRemoteRegistration,

      setPaymentProof: (fileId, fileName, mimeType) =>
        dispatch({ type: "SET_PAYMENT_PROOF", fileId, fileName, mimeType }),

      addAthlete: (athlete) => {
        const id = uid("ath")
        dispatch({ type: "ADD_ATHLETE", athlete: { id, ...athlete } })
        return id
      },
      updateAthlete: (athlete) => dispatch({ type: "UPDATE_ATHLETE", athlete }),
      removeAthlete: (athleteId) => dispatch({ type: "REMOVE_ATHLETE", athleteId }),
      syncAthleteBatch: async (athletes) => {
        const registrationId = await ensureDraftRegistration()
        if (!registrationId) throw new Error("Draft registrasi belum tersedia.")
        if (athletes.length === 0) return

        for (const athlete of athletes) {
          await Repos.registration.createAthlete({
            registration_id: registrationId,
            team_id: athlete.teamId ?? undefined,
            sport_id: athlete.sportId,
            category_id: athlete.categoryId,
            name: athlete.name,
            gender: athlete.gender,
            birth_date: athlete.birthDate,
            institution: athlete.institution,
          })
        }

        await refreshRemoteRegistration(registrationId)
      },
      deleteAthleteRemote: async (athleteId) => {
        if (!activeRegistrationId || ENV.USE_MOCK || !token) {
          dispatch({ type: "REMOVE_ATHLETE", athleteId })
          return
        }

        await Repos.registration.deleteAthlete(athleteId)
        await refreshRemoteRegistration(activeRegistrationId)
      },

      addOfficial: (official) => {
        const id = uid("off")
        dispatch({ type: "ADD_OFFICIAL", official: { id, ...official } })
        return id
      },
      removeOfficial: (officialId) => dispatch({ type: "REMOVE_OFFICIAL", officialId }),

      upsertDocFile: (athleteId, docKey, fileId, fileName, mimeType) =>
        dispatch({ type: "UPSERT_DOC_FILE", athleteId, docKey, fileId, fileName, mimeType }),
      upsertOfficialDocFile: (officialId, docKey, fileId, fileName, mimeType) =>
        dispatch({ type: "UPSERT_OFFICIAL_DOC_FILE", officialId, docKey, fileId, fileName, mimeType }),
      uploadDocument: async (athleteId, docKey, file) => {
        const registrationId = await ensureDraftRegistration()
        if (!registrationId) throw new Error("Registrasi draft belum tersedia.")
        if (!file) throw new Error("File dokumen tidak ditemukan.")

        const uploaded = await Repos.registration.uploadRegistrationDocument({
          registrationId,
          athleteId,
          type: mapDocKeyToDocumentType(docKey),
          file,
        })
        dispatch({
          type: "UPSERT_DOC_FILE",
          athleteId,
          docKey,
          fileId: String(uploaded.id ?? `${registrationId}-${docKey}`),
          fileName: uploaded.file_name ?? file.name,
          mimeType: file.type || "application/octet-stream",
        })
        await refreshRemoteRegistration(registrationId)
      },
      submitRegistration: async () => {
        const registrationId = await ensureDraftRegistration()
        if (!registrationId) return { ok: false, message: "Draft registrasi belum tersedia." }

        const result = await Repos.registration.submitRegistration(registrationId)
        await refreshRegistrationList()
        return {
          ok: true,
          message:
            (typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
              ? result.message
              : null) ?? "Registrasi berhasil dikirim.",
        }
      },
    }
  }, [
    activeRegistrationId,
    dispatch,
    ensureDraftRegistration,
    hydrateReady,
    masterSports,
    openRegistration,
    refreshRegistrationList,
    refreshRemoteRegistration,
    registrationSummaries,
    remoteReady,
    state,
    storageKey,
    token,
    venues,
  ])

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>
}

export function useRegistration() {
  const ctx = useContext(RegistrationContext)
  if (!ctx) throw new Error("useRegistration must be used within RegistrationProvider")
  return ctx
}


