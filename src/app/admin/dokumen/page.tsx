"use client"

import { useEffect, useMemo, useState } from "react"
import { VerificationNotificationPreview } from "@/components/verification/VerificationNotificationPreview"
import { useAuth } from "@/context/AuthContext"
import {
  DOCUMENT_STATUS_OPTIONS,
  type DocumentCatalogItem,
  getDocumentCatalogForParticipant,
  getOfficialDocumentCatalog,
  getOfficialRoleLabel,
  getParticipantDocumentCategory,
  type DocumentKey,
  type DocumentStatus,
  type OfficialDocumentKey,
  type ParticipantDocumentCategory,
} from "@/data/documentCatalog"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import { isVerificationNotificationStatus } from "@/lib/documentVerificationNotification"
import { downloadFileBlob, getFileBlob } from "@/lib/fileStore"
import { queueVerificationEmailDraft } from "@/lib/verificationEmailStore"
import { Repos } from "@/repositories"
import type { Registration } from "@/types/registration"

type StoredUserLite = {
  id: string
  institutionName: string
  email: string
  institutionType?: string
  role?: string
}

type ReviewEntityType = "ATHLETE" | "OFFICIAL"

type ReviewTarget = {
  id: string
  key: string
  type: ReviewEntityType
  name: string
  sportId?: string
  categoryId?: string
  roleLabel?: string
}

type PreviewState = {
  open: boolean
  title: string
  url: string
  mime?: string
  error?: string
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString("id-ID")
  } catch {
    return value
  }
}

function statusBadge(status?: string) {
  if (status === "Disetujui") return "border-green-200 bg-green-50 text-green-800"
  if (status === "Sudah upload") return "border-yellow-200 bg-yellow-50 text-yellow-800"
  if (status === "Perlu revisi") return "border-amber-200 bg-amber-50 text-amber-800"
  if (status === "Ditolak") return "border-red-200 bg-red-50 text-red-800"
  return "border-gray-200 bg-gray-100 text-gray-700"
}

function isImageMime(mime?: string) {
  return !!mime && mime.startsWith("image/")
}

function isPdfMime(mime?: string) {
  return !!mime && (mime === "application/pdf" || mime.includes("pdf"))
}

function getSportName(sportId?: string) {
  return SPORTS_CATALOG.find((item) => item.id === sportId)?.name ?? sportId ?? "-"
}

function getCategoryName(sportId?: string, categoryId?: string) {
  const sport = SPORTS_CATALOG.find((item) => item.id === sportId)
  return sport?.categories.find((item) => item.id === categoryId)?.name ?? categoryId ?? "-"
}

function getRoleType(targetType?: ReviewEntityType) {
  return targetType === "OFFICIAL" ? "official" : "peserta"
}

function itemLabelByKey(catalog: DocumentCatalogItem[], docKey: DocumentKey | OfficialDocumentKey) {
  return catalog.find((item) => item.key === docKey)?.label ?? String(docKey)
}

export default function AdminDokumenPage() {
  const { getAllUsers, user: adminUser, canAccessSport } = useAuth()

  const [targetUserId, setTargetUserId] = useState("")
  const [selectedTargetKey, setSelectedTargetKey] = useState("")
  const [, setRevision] = useState(0)
  const [participantFilter, setParticipantFilter] = useState<"ALL" | ParticipantDocumentCategory>("ALL")
  const [statusFilter, setStatusFilter] = useState<"ALL" | DocumentStatus>("ALL")
  const [entityFilter, setEntityFilter] = useState<"ALL" | ReviewEntityType>("ALL")
  const [query, setQuery] = useState("")
  const [preview, setPreview] = useState<PreviewState>({
    open: false,
    title: "",
    url: "",
  })

  const participantUsers = useMemo(() => {
    return (getAllUsers() as StoredUserLite[]).filter((user) => {
      if (user.role !== "PESERTA") return false
      const registration = safeParse<Registration | null>(localStorage.getItem(`mg26_registration_${user.id}`), null)
      if (!registration || !adminUser) return false
      if (adminUser.role === "ADMIN" || adminUser.role === "SUPER_ADMIN") return true
      if (adminUser.role === "ADMIN_CABOR") {
        const athleteVisible = Array.isArray(registration.athletes) && registration.athletes.some((athlete) => canAccessSport(athlete.sportId))
        const officialVisible = Array.isArray(registration.officials) && registration.officials.some((official) => canAccessSport(official.sportId))
        return athleteVisible || officialVisible
      }
      return false
    })
  }, [adminUser, canAccessSport, getAllUsers])

  const filteredUsers = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase()
    return participantUsers.filter((user) => {
      const participantCategory = getParticipantDocumentCategory(user.institutionType)
      if (participantFilter !== "ALL" && participantCategory !== participantFilter) return false
      if (!loweredQuery) return true
      return [user.institutionName, user.email, participantCategory].join(" ").toLowerCase().includes(loweredQuery)
    })
  }, [participantFilter, participantUsers, query])

  const activeUser = filteredUsers.find((user) => user.id === targetUserId) ?? filteredUsers[0] ?? null
  const registration = activeUser
    ? safeParse<Registration | null>(localStorage.getItem(`mg26_registration_${activeUser.id}`), null)
    : null
  const participantCategory = getParticipantDocumentCategory(activeUser?.institutionType)

  const visibleTargets = useMemo<ReviewTarget[]>(() => {
    if (!registration) return []

    const athleteTargets = Array.isArray(registration.athletes)
      ? registration.athletes
          .filter((athlete) => (adminUser?.role === "ADMIN_CABOR" ? canAccessSport(athlete.sportId) : true))
          .filter((athlete) => {
            if (entityFilter !== "ALL" && entityFilter !== "ATHLETE") return false
            if (statusFilter === "ALL") return true
            const docs = registration.documents.find((item) => item.athleteId === athlete.id)
            const catalog = getDocumentCatalogForParticipant(activeUser?.institutionType)
            return catalog.some((item) => (docs?.[item.key as DocumentKey]?.status ?? "Belum upload") === statusFilter)
          })
          .map((athlete) => ({
            id: athlete.id,
            key: `ATHLETE:${athlete.id}`,
            type: "ATHLETE" as const,
            name: athlete.name,
            sportId: athlete.sportId,
            categoryId: athlete.categoryId,
          }))
      : []

    const officialList = Array.isArray(registration.officials) ? registration.officials : []
    const officialTargets = officialList
      .filter((official) => (adminUser?.role === "ADMIN_CABOR" ? canAccessSport(official.sportId) : true))
      .filter((official) => {
        if (entityFilter !== "ALL" && entityFilter !== "OFFICIAL") return false
        if (statusFilter === "ALL") return true
        const docs = registration.officialDocuments?.find((item) => item.officialId === official.id)
        const catalog = getOfficialDocumentCatalog(official.role)
        return catalog.some((item) => (docs?.[item.key as OfficialDocumentKey]?.status ?? "Belum upload") === statusFilter)
      })
      .map((official) => ({
        id: official.id,
        key: `OFFICIAL:${official.id}`,
        type: "OFFICIAL" as const,
        name: official.name,
        sportId: official.sportId,
        roleLabel: getOfficialRoleLabel(official.role),
      }))

    return [...athleteTargets, ...officialTargets]
  }, [activeUser?.institutionType, adminUser?.role, canAccessSport, entityFilter, registration, statusFilter])

  useEffect(() => {
    if (!visibleTargets.length) {
      setSelectedTargetKey("")
      return
    }
    if (!selectedTargetKey || !visibleTargets.some((item) => item.key === selectedTargetKey)) {
      setSelectedTargetKey(visibleTargets[0].key)
    }
  }, [selectedTargetKey, visibleTargets])

  const selectedTarget = visibleTargets.find((item) => item.key === selectedTargetKey) ?? null
  const athleteDocumentCatalog = getDocumentCatalogForParticipant(activeUser?.institutionType)
  const officialRecord =
    selectedTarget?.type === "OFFICIAL" && Array.isArray(registration?.officials)
      ? registration.officials.find((official) => official.id === selectedTarget.id) ?? null
      : null
  const activeCatalog = selectedTarget?.type === "OFFICIAL" ? getOfficialDocumentCatalog(officialRecord?.role) : athleteDocumentCatalog
  const selectedDocs =
    selectedTarget?.type === "OFFICIAL"
      ? registration?.officialDocuments?.find((item) => item.officialId === selectedTarget.id) ?? null
      : registration?.documents.find((item) => item.athleteId === selectedTarget?.id) ?? null

  const updateDoc = async (
    docKey: DocumentKey | OfficialDocumentKey,
    status: Exclude<DocumentStatus, "Belum upload" | "Sudah upload">
  ) => {
    if (!registration || !activeUser || !selectedTarget || !selectedDocs) return
    const current = selectedDocs[docKey as keyof typeof selectedDocs]
    if (!current || typeof current !== "object" || !current.fileId) {
      alert("Dokumen belum diunggah.")
      return
    }

    let note = current.note
    if (status === "Perlu revisi" || status === "Ditolak") {
      const input = window.prompt("Catatan validator wajib diisi:", current.note ?? "")
      if (!input || !input.trim()) return
      note = input.trim()
    }

    const validatedAt = new Date().toISOString()
    const validatedBy = adminUser?.picName ?? adminUser?.email ?? "Validator"

    const nextRegistration: Registration =
      selectedTarget.type === "OFFICIAL"
        ? {
            ...registration,
            officialDocuments: (registration.officialDocuments ?? []).map((doc) => {
              if (doc.officialId !== selectedTarget.id) return doc
              return {
                ...doc,
                [docKey]: {
                  ...doc[docKey as OfficialDocumentKey],
                  status,
                  note,
                  validatedAt,
                  validatedBy,
                },
              }
            }),
            updatedAt: validatedAt,
          }
        : {
            ...registration,
            documents: registration.documents.map((doc) => {
              if (doc.athleteId !== selectedTarget.id) return doc
              return {
                ...doc,
                [docKey]: {
                  ...doc[docKey as DocumentKey],
                  status,
                  note,
                  validatedAt,
                  validatedBy,
                },
              }
            }),
            updatedAt: validatedAt,
          }

    localStorage.setItem(`mg26_registration_${activeUser.id}`, JSON.stringify(nextRegistration))

    if (isVerificationNotificationStatus(status)) {
      queueVerificationEmailDraft({
        userId: activeUser.id,
        recipientEmail: activeUser.email,
        recipientName: selectedTarget.name,
        roleType: getRoleType(selectedTarget.type),
        documentName:
          selectedTarget.type === "OFFICIAL"
            ? `${itemLabelByKey(activeCatalog, docKey)} (${selectedTarget.roleLabel ?? "Official"})`
            : itemLabelByKey(activeCatalog, docKey),
        verificationStatus: status,
        note,
      })
    }

    await Repos.registration.adminUpdateDoc({
      userId: activeUser.id,
      registrationId: "id" in registration && registration.id ? String(registration.id) : undefined,
      documentId: current.fileId ? String(current.fileId) : undefined,
      athleteId: selectedTarget.type === "ATHLETE" ? selectedTarget.id : undefined,
      officialId: selectedTarget.type === "OFFICIAL" ? selectedTarget.id : undefined,
      docGroup: selectedTarget.type,
      docKey,
      status,
      note,
      validatedBy,
    }).catch(() => {})

    setRevision((value) => value + 1)
  }

  const openPreview = async (docKey: DocumentKey | OfficialDocumentKey) => {
    const current = selectedDocs?.[docKey as keyof typeof selectedDocs]
    const fileId = current && typeof current === "object" ? current.fileId : undefined
    if (!fileId) {
      alert("Dokumen belum diunggah.")
      return
    }
    const blob = await getFileBlob(fileId)
    if (!blob) {
      setPreview({ open: true, title: current?.fileName ?? "Dokumen", url: "", error: "File tidak tersedia di browser ini." })
      return
    }
    const url = URL.createObjectURL(blob)
    setPreview({ open: true, title: current?.fileName ?? "Dokumen", url, mime: current?.mimeType || blob.type })
  }

  const closePreview = () => {
    if (preview.url) URL.revokeObjectURL(preview.url)
    setPreview({ open: false, title: "", url: "" })
  }

  return (
    <div className="max-w-7xl space-y-6">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Validasi Dokumen Peserta & Official</h1>
        <p className="mt-2 text-gray-600">
          Menu ini menampilkan dokumen upload atlet dan official. Seluruh berkas yang diunggah pada dashboard peserta akan muncul di sini untuk proses pengecekan admin.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-xl border px-3 py-2" placeholder="Cari kontingen / email" />
          <select value={participantFilter} onChange={(e) => setParticipantFilter(e.target.value as "ALL" | ParticipantDocumentCategory)} className="rounded-xl border px-3 py-2">
            <option value="ALL">Semua kategori peserta</option>
            <option value="Pelajar">Pelajar</option>
            <option value="Mahasiswa">Mahasiswa</option>
          </select>
          <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value as "ALL" | ReviewEntityType)} className="rounded-xl border px-3 py-2">
            <option value="ALL">Atlet + Official</option>
            <option value="ATHLETE">Atlet</option>
            <option value="OFFICIAL">Official</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "ALL" | DocumentStatus)} className="rounded-xl border px-3 py-2">
            <option value="ALL">Semua status validasi</option>
            {DOCUMENT_STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        <select value={activeUser?.id ?? ""} onChange={(e) => { setTargetUserId(e.target.value); setSelectedTargetKey("") }} className="w-full rounded-xl border px-3 py-2">
          {filteredUsers.map((user) => (
            <option key={user.id} value={user.id}>
              {user.institutionName} | {getParticipantDocumentCategory(user.institutionType)} | {user.email}
            </option>
          ))}
        </select>
      </div>

      {!registration || !activeUser ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-gray-500 shadow-sm">Belum ada kontingen yang cocok dengan filter.</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <div className="text-lg font-extrabold text-gray-900">Daftar Berkas</div>
            <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
              <div><b>Kontingen:</b> {activeUser.institutionName}</div>
              <div className="mt-1"><b>Kategori peserta:</b> {participantCategory}</div>
              <div className="mt-1"><b>Total item:</b> {visibleTargets.length}</div>
            </div>
            <select value={selectedTarget?.key ?? ""} onChange={(e) => setSelectedTargetKey(e.target.value)} className="w-full rounded-xl border px-3 py-2">
              {visibleTargets.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.type === "ATHLETE" ? `[Atlet] ${item.name}` : `[${item.roleLabel}] ${item.name}`} - {getSportName(item.sportId)}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-1">
              <div className="text-lg font-extrabold text-gray-900">Menu Verifikasi Berkas</div>
              <div className="text-sm text-gray-600">
                {selectedTarget?.type === "OFFICIAL"
                  ? "Dokumen official tampil sesuai peran official yang diinput pada Step 3."
                  : `Kategori ${participantCategory}. Daftar dokumen berikut identik dengan form upload.`}
              </div>
            </div>

            {!selectedTarget || !selectedDocs ? (
              <div className="text-sm text-gray-500">Atlet, official, atau dokumen belum tersedia.</div>
            ) : (
              <>
                <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
                  <div><b>Jenis:</b> {selectedTarget.type === "ATHLETE" ? "Atlet" : selectedTarget.roleLabel}</div>
                  <div className="mt-1"><b>Nama:</b> {selectedTarget.name}</div>
                  <div className="mt-1"><b>Cabor:</b> {getSportName(selectedTarget.sportId)}</div>
                  {selectedTarget.type === "ATHLETE" ? <div className="mt-1"><b>Kategori:</b> {getCategoryName(selectedTarget.sportId, selectedTarget.categoryId)}</div> : null}
                </div>

                <div className="space-y-4">
                  {activeCatalog.map((item) => {
                    const doc = selectedDocs[item.key as keyof typeof selectedDocs]
                    const currentDoc = doc && typeof doc === "object" ? doc : null
                    const hasFile = !!currentDoc?.fileId
                    const currentStatus = currentDoc?.status ?? "Belum upload"

                    return (
                      <div key={item.key} className="rounded-2xl border border-gray-200 p-4">
                        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
                          <div className="space-y-2 text-sm text-gray-700">
                            <div className="font-extrabold text-gray-900">{item.label}</div>
                            <div>
                              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadge(currentStatus)}`}>{currentStatus}</span>
                            </div>
                            <div><b>Catatan validator:</b> {currentDoc?.note ?? "-"}</div>
                            <div><b>Tanggal upload:</b> {formatDateTime(currentDoc?.uploadedAt)}</div>
                            <div><b>Tanggal validasi:</b> {formatDateTime(currentDoc?.validatedAt)}</div>
                            <div><b>Validator:</b> {currentDoc?.validatedBy ?? "-"}</div>
                            <div><b>Nama file:</b> {currentDoc?.fileName ?? "-"}</div>

                            {isVerificationNotificationStatus(currentStatus) ? (
                              <VerificationNotificationPreview
                                className="mt-3"
                                payload={{
                                  recipientName: selectedTarget.name,
                                  roleType: getRoleType(selectedTarget.type),
                                  documentName: item.label,
                                  verificationStatus: currentStatus,
                                  note: currentDoc?.note,
                                }}
                              />
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <button type="button" onClick={() => void openPreview(item.key)} disabled={!hasFile} className={`w-full rounded-xl border px-3 py-2 text-sm font-extrabold ${hasFile ? "bg-white hover:bg-gray-50" : "cursor-not-allowed bg-gray-100 text-gray-400"}`}>Lihat dokumen</button>
                            <button type="button" onClick={() => hasFile && void downloadFileBlob(currentDoc!.fileId!, currentDoc?.fileName ?? item.label)} disabled={!hasFile} className={`w-full rounded-xl border px-3 py-2 text-sm font-extrabold ${hasFile ? "bg-white hover:bg-gray-50" : "cursor-not-allowed bg-gray-100 text-gray-400"}`}>Unduh dokumen</button>
                            <button type="button" onClick={() => void updateDoc(item.key, "Disetujui")} disabled={!hasFile} className="w-full rounded-xl bg-green-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-500">Disetujui</button>
                            <button type="button" onClick={() => void updateDoc(item.key, "Perlu revisi")} disabled={!hasFile} className="w-full rounded-xl bg-amber-500 px-3 py-2 text-sm font-extrabold text-white hover:bg-amber-600 disabled:bg-gray-200 disabled:text-gray-500">Perlu revisi</button>
                            <button type="button" onClick={() => void updateDoc(item.key, "Ditolak")} disabled={!hasFile} className="w-full rounded-xl bg-red-600 px-3 py-2 text-sm font-extrabold text-white hover:bg-red-700 disabled:bg-gray-200 disabled:text-gray-500">Ditolak</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {preview.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b p-4">
              <div className="font-extrabold text-gray-900">{preview.title}</div>
              <button onClick={closePreview} className="rounded-xl bg-gray-900 px-3 py-2 font-extrabold text-white hover:bg-black">Tutup</button>
            </div>
            <div className="p-4">
              {preview.error ? <div className="text-sm text-red-700">{preview.error}</div> : null}
              {!preview.error && preview.url && isImageMime(preview.mime) ? <img src={preview.url} alt={preview.title} className="max-h-[70vh] w-full rounded-xl border object-contain" /> : null}
              {!preview.error && preview.url && isPdfMime(preview.mime) ? <iframe title="pdf-preview" src={preview.url} className="h-[70vh] w-full rounded-xl border" /> : null}
              {!preview.error && preview.url && !isImageMime(preview.mime) && !isPdfMime(preview.mime) ? (
                <div className="text-sm text-gray-600">Pratinjau tidak tersedia untuk tipe file ini. Silakan gunakan tombol unduh dokumen.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
