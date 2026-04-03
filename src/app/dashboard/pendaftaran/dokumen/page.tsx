"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ENV } from "@/config/env"
import { Modal } from "@/components/ui/Modal"
import { useAuth } from "@/context/AuthContext"
import { useRegistration } from "@/context/RegistrationContext"
import {
  getDocumentCatalogForParticipant,
  getOfficialDocumentCatalog,
  getOfficialRoleLabel,
  getParticipantDocumentCategory,
  isUploadedDocumentStatus,
  type DocumentKey,
  type OfficialDocumentKey,
} from "@/data/documentCatalog"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import { putFileBlob } from "@/lib/fileStore"

type UploadMode = "ATHLETE" | "OFFICIAL"
type AnyDocumentKey = DocumentKey | OfficialDocumentKey

function formatISO(iso?: string) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("id-ID")
  } catch {
    return iso
  }
}

function getCategoryMeta(sportId?: string, categoryId?: string) {
  const sport = SPORTS_CATALOG.find((item) => item.id === sportId)
  const category = sport?.categories.find((item) => item.id === categoryId)

  return {
    sportName: sport?.name ?? sportId ?? "-",
    categoryName: category?.name ?? categoryId ?? "-",
    rosterSize: Math.max(1, category?.rosterSize ?? 1),
  }
}

function getDocStatusMeta(status?: string) {
  if (status === "Disetujui") return { label: status, badgeClass: "bg-green-50 border-green-200 text-green-800" }
  if (status === "Sudah upload") return { label: status, badgeClass: "bg-yellow-50 border-yellow-200 text-yellow-800" }
  if (status === "Perlu revisi") return { label: status, badgeClass: "bg-amber-50 border-amber-200 text-amber-800" }
  if (status === "Ditolak") return { label: status, badgeClass: "bg-red-50 border-red-200 text-red-800" }
  return { label: "Belum upload", badgeClass: "bg-gray-100 border-gray-200 text-gray-700" }
}

export default function Step4DokumenPage() {
  const { user } = useAuth()
  const { state, hydrateReady, upsertDocFile, upsertOfficialDocFile, uploadDocument } = useRegistration()
  const canUploadDocuments = state.payment.status === "PENDING" || state.payment.status === "APPROVED"

  const participantCategory = getParticipantDocumentCategory(user?.institutionType)
  const athleteDocumentCatalog = getDocumentCatalogForParticipant(user?.institutionType)

  const [uploadMode, setUploadMode] = useState<UploadMode>("ATHLETE")
  const [selectedAthleteId, setSelectedAthleteId] = useState<string>("")
  const [selectedOfficialId, setSelectedOfficialId] = useState<string>("")
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [completionNotified, setCompletionNotified] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<Partial<Record<string, File>>>({})

  const athletes = state.athletes
  const officials = state.officials

  const docsForSelectedAthlete = useMemo(() => {
    if (!selectedAthleteId) return null
    return state.documents.find((doc) => doc.athleteId === selectedAthleteId) ?? null
  }, [selectedAthleteId, state.documents])

  const docsForSelectedOfficial = useMemo(() => {
    if (!selectedOfficialId) return null
    return state.officialDocuments.find((doc) => doc.officialId === selectedOfficialId) ?? null
  }, [selectedOfficialId, state.officialDocuments])

  const selectedAthlete = useMemo(() => {
    if (!selectedAthleteId) return null
    return athletes.find((athlete) => athlete.id === selectedAthleteId) ?? null
  }, [athletes, selectedAthleteId])

  const selectedOfficial = useMemo(() => {
    if (!selectedOfficialId) return null
    return officials.find((official) => official.id === selectedOfficialId) ?? null
  }, [officials, selectedOfficialId])

  const selectedOfficialCatalog = useMemo(
    () => getOfficialDocumentCatalog(selectedOfficial?.role),
    [selectedOfficial?.role]
  )

  const athleteProgress = useMemo(() => {
    const progressMap = new Map<string, { uploaded: number; total: number }>()
    for (const athlete of athletes) {
      const doc = state.documents.find((item) => item.athleteId === athlete.id)
      const uploaded = athleteDocumentCatalog.reduce(
        (count, item) => count + (isUploadedDocumentStatus(doc?.[item.key as DocumentKey]?.status) ? 1 : 0),
        0
      )
      progressMap.set(athlete.id, { uploaded, total: athleteDocumentCatalog.length })
    }
    return progressMap
  }, [athleteDocumentCatalog, athletes, state.documents])

  const officialProgress = useMemo(() => {
    const progressMap = new Map<string, { uploaded: number; total: number }>()
    for (const official of officials) {
      const catalog = getOfficialDocumentCatalog(official.role)
      const doc = state.officialDocuments.find((item) => item.officialId === official.id)
      const uploaded = catalog.reduce(
        (count, item) => count + (isUploadedDocumentStatus(doc?.[item.key as OfficialDocumentKey]?.status) ? 1 : 0),
        0
      )
      progressMap.set(official.id, { uploaded, total: catalog.length })
    }
    return progressMap
  }, [officials, state.officialDocuments])

  useEffect(() => {
    if (!hydrateReady) return
    if (!selectedAthleteId && athletes.length > 0) setSelectedAthleteId(athletes[0].id)
    if (!selectedOfficialId && officials.length > 0) setSelectedOfficialId(officials[0].id)
  }, [athletes, hydrateReady, officials, selectedAthleteId, selectedOfficialId])

  useEffect(() => {
    if (completionNotified) return

    const athleteComplete =
      athletes.length === 0 ||
      athletes.every((athlete) => {
        const doc = state.documents.find((item) => item.athleteId === athlete.id)
        return athleteDocumentCatalog.every((item) => isUploadedDocumentStatus(doc?.[item.key as DocumentKey]?.status))
      })

    const officialComplete =
      officials.length === 0 ||
      officials.every((official) => {
        const catalog = getOfficialDocumentCatalog(official.role)
        const doc = state.officialDocuments.find((item) => item.officialId === official.id)
        return catalog.every((item) => isUploadedDocumentStatus(doc?.[item.key as OfficialDocumentKey]?.status))
      })

    if ((athletes.length > 0 || officials.length > 0) && athleteComplete && officialComplete) {
      setShowCompletionModal(true)
      setCompletionNotified(true)
    }
  }, [athleteDocumentCatalog, athletes, completionNotified, officials, state.documents, state.officialDocuments])

  useEffect(() => {
    if (uploadMode === "ATHLETE" && athletes.length === 0 && officials.length > 0) setUploadMode("OFFICIAL")
    if (uploadMode === "OFFICIAL" && officials.length === 0 && athletes.length > 0) setUploadMode("ATHLETE")
  }, [athletes.length, officials.length, uploadMode])

  const onPickFile = (docKey: AnyDocumentKey, file: File | null) => {
    if (!file) {
      setPendingFiles((prev) => ({ ...prev, [docKey]: undefined }))
      return
    }
    setMsg(null)

    if (!canUploadDocuments) {
      setMsg({ type: "error", text: "Step 4 terkunci: lakukan pembayaran terlebih dahulu." })
      return
    }
    if (uploadMode === "ATHLETE" && !selectedAthleteId) {
      setMsg({ type: "error", text: "Pilih atlet terlebih dahulu." })
      return
    }
    if (uploadMode === "OFFICIAL" && !selectedOfficialId) {
      setMsg({ type: "error", text: "Pilih official terlebih dahulu." })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setMsg({ type: "error", text: "Ukuran file terlalu besar. Maksimal 10MB." })
      return
    }

    setPendingFiles((prev) => ({ ...prev, [docKey]: file }))
  }

  const onSubmitFile = async (docKey: AnyDocumentKey) => {
    const file = pendingFiles[docKey]
    if (!file || !canUploadDocuments) return

    setMsg(null)
    setLoadingKey(String(docKey))
    try {
      if (uploadMode === "ATHLETE") {
        if (!selectedAthleteId) return

        if (ENV.USE_MOCK) {
          const fileId = `doc_${selectedAthleteId}_${docKey}_${Date.now()}_${Math.random().toString(16).slice(2)}`
          await putFileBlob(fileId, file)
          upsertDocFile(selectedAthleteId, docKey as DocumentKey, fileId, file.name, file.type || "application/octet-stream")
        } else {
          await uploadDocument(selectedAthleteId, docKey as DocumentKey, file)
        }
      } else {
        if (!selectedOfficialId) return
        const fileId = `official_${selectedOfficialId}_${docKey}_${Date.now()}_${Math.random().toString(16).slice(2)}`
        await putFileBlob(fileId, file)
        upsertOfficialDocFile(selectedOfficialId, docKey as OfficialDocumentKey, fileId, file.name, file.type || "application/octet-stream")
      }

      setPendingFiles((prev) => ({ ...prev, [docKey]: undefined }))
      setMsg({ type: "success", text: "Dokumen berhasil diunggah." })
    } catch (error) {
      setMsg({ type: "error", text: error instanceof Error ? error.message : "Gagal upload dokumen." })
    } finally {
      setLoadingKey(null)
    }
  }

  if (!hydrateReady) {
    return <div className="max-w-5xl rounded-xl border bg-white p-6 text-sm text-gray-600">Memuat dokumen...</div>
  }

  const activeCatalog = uploadMode === "ATHLETE" ? athleteDocumentCatalog : selectedOfficialCatalog
  const activeDocs = uploadMode === "ATHLETE" ? docsForSelectedAthlete : docsForSelectedOfficial

  return (
    <div className="max-w-6xl space-y-6">
      <Modal open={showCompletionModal} onClose={() => setShowCompletionModal(false)} title="Dokumen Berhasil Dilengkapi" className="max-w-lg">
        <p className="text-sm text-gray-700">Semua dokumen wajib atlet dan official yang tersedia sudah terisi. Silakan menunggu proses validasi admin.</p>
      </Modal>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Step 4 - Upload Dokumen Atlet & Official</h1>
            <p className="mt-2 text-gray-600">
              Kategori peserta aktif: <b>{participantCategory}</b>. Dokumen atlet dan official di bawah akan langsung muncul pada menu <b>Verifikasi Berkas</b> admin setelah diunggah.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-bold text-gray-700">Payment: {state.payment.status}</span>
              <span className="inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">Atlet: {athletes.length}</span>
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">Official: {officials.length}</span>
            </div>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4">
            <div className="text-xs text-gray-500">Navigasi</div>
            <div className="mt-2 flex gap-2">
              <Link href="/dashboard/pembayaran" className="rounded-lg border bg-white px-3 py-2 text-sm font-bold hover:bg-gray-50">Kembali Step 3</Link>
              <Link href="/dashboard/status" className="rounded-lg border bg-white px-3 py-2 text-sm font-bold hover:bg-gray-50">Status</Link>
            </div>
          </div>
        </div>
      </div>

      {msg ? (
        <div className={`rounded-xl border p-4 text-sm ${msg.type === "success" ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
          {msg.text}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setUploadMode("ATHLETE")}
            className={`rounded-xl px-4 py-2 text-sm font-extrabold ${uploadMode === "ATHLETE" ? "bg-emerald-600 text-white" : "border bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            Dokumen Atlet
          </button>
          <button
            type="button"
            onClick={() => setUploadMode("OFFICIAL")}
            className={`rounded-xl px-4 py-2 text-sm font-extrabold ${uploadMode === "OFFICIAL" ? "bg-sky-600 text-white" : "border bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            Dokumen Official
          </button>
        </div>

        {uploadMode === "ATHLETE" ? (
          <>
            <div className="text-lg font-extrabold text-gray-900">Pilih Atlet</div>
            {athletes.length === 0 ? (
              <div className="text-sm text-gray-600">Belum ada atlet. Lengkapi Step 3 terlebih dahulu.</div>
            ) : (
              <>
                <select value={selectedAthleteId} onChange={(e) => setSelectedAthleteId(e.target.value)} className="w-full rounded-xl border px-3 py-2">
                  {athletes.map((athlete) => {
                    const progress = athleteProgress.get(athlete.id)
                    return (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.name} ({getCategoryMeta(athlete.sportId, athlete.categoryId).sportName} / {getCategoryMeta(athlete.sportId, athlete.categoryId).categoryName}) | Dokumen {progress?.uploaded ?? 0}/{progress?.total ?? athleteDocumentCatalog.length}
                      </option>
                    )
                  })}
                </select>

                {selectedAthlete ? (
                  <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
                    <div><b>Nama:</b> {selectedAthlete.name}</div>
                    <div className="mt-1"><b>Kategori peserta:</b> {participantCategory}</div>
                    <div className="mt-1"><b>Cabor/Kategori lomba:</b> {getCategoryMeta(selectedAthlete.sportId, selectedAthlete.categoryId).sportName} / {getCategoryMeta(selectedAthlete.sportId, selectedAthlete.categoryId).categoryName}</div>
                  </div>
                ) : null}
              </>
            )}
          </>
        ) : (
          <>
            <div className="text-lg font-extrabold text-gray-900">Pilih Official</div>
            {officials.length === 0 ? (
              <div className="text-sm text-gray-600">Belum ada official. Lengkapi input official pada Step 3 terlebih dahulu.</div>
            ) : (
              <>
                <select value={selectedOfficialId} onChange={(e) => setSelectedOfficialId(e.target.value)} className="w-full rounded-xl border px-3 py-2">
                  {officials.map((official) => {
                    const progress = officialProgress.get(official.id)
                    const sportName = SPORTS_CATALOG.find((item) => item.id === official.sportId)?.name ?? official.sportId
                    return (
                      <option key={official.id} value={official.id}>
                        {official.name} ({getOfficialRoleLabel(official.role)} - {sportName}) | Dokumen {progress?.uploaded ?? 0}/{progress?.total ?? getOfficialDocumentCatalog(official.role).length}
                      </option>
                    )
                  })}
                </select>

                {selectedOfficial ? (
                  <div className="rounded-xl border bg-gray-50 p-4 text-sm text-gray-700">
                    <div><b>Nama:</b> {selectedOfficial.name}</div>
                    <div className="mt-1"><b>Peran:</b> {getOfficialRoleLabel(selectedOfficial.role)}</div>
                    <div className="mt-1"><b>Cabor:</b> {SPORTS_CATALOG.find((item) => item.id === selectedOfficial.sportId)?.name ?? selectedOfficial.sportId}</div>
                    <div className="mt-1"><b>WA:</b> {selectedOfficial.phone || "-"}</div>
                  </div>
                ) : null}
              </>
            )}
          </>
        )}
      </div>

      {activeDocs ? (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-extrabold text-gray-900">Daftar Dokumen Upload</div>
              <div className="text-sm text-gray-600">
                {uploadMode === "ATHLETE"
                  ? `Kategori ${participantCategory} wajib mengunggah ${activeCatalog.length} dokumen atlet berikut.`
                  : `Official ${selectedOfficial ? getOfficialRoleLabel(selectedOfficial.role) : ""} wajib mengunggah ${activeCatalog.length} dokumen berikut.`}
              </div>
            </div>
            <div className="text-xs text-gray-500">Format file: PDF/JPG/PNG | Maks 10MB</div>
          </div>

          <div className="space-y-4">
            {activeCatalog.map((item, index) => {
              const savedDoc = activeDocs[item.key as keyof typeof activeDocs]
              const selectedFile = pendingFiles[item.key]
              const statusMeta = getDocStatusMeta(typeof savedDoc === "object" && savedDoc ? savedDoc.status : undefined)

              return (
                <div key={item.key} className="rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50/60 p-4 md:p-5">
                  <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
                    <div>
                      <div className="font-extrabold text-gray-900">{index + 1}) {item.label}</div>
                      <div className="mt-1 text-xs text-gray-600">{item.hint}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-extrabold ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                        <span className="text-xs text-gray-500">Tanggal upload: <b>{formatISO(typeof savedDoc === "object" && savedDoc ? savedDoc.uploadedAt : undefined)}</b></span>
                        <span className="text-xs text-gray-500">File: <b>{typeof savedDoc === "object" && savedDoc ? savedDoc.fileName ?? "-" : "-"}</b></span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-3">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        disabled={!canUploadDocuments || loadingKey === item.key}
                        onChange={(e) => onPickFile(item.key, e.target.files?.[0] ?? null)}
                        className="w-full rounded-lg border px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-600 file:px-3 file:py-1.5 file:font-semibold file:text-white hover:file:bg-emerald-700"
                      />
                      <div className="mt-2 text-xs text-gray-600">File dipilih: <b>{selectedFile?.name ?? "-"}</b></div>
                      <button
                        type="button"
                        disabled={!canUploadDocuments || !selectedFile || loadingKey === item.key}
                        onClick={() => void onSubmitFile(item.key)}
                        className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-extrabold ${!canUploadDocuments || !selectedFile || loadingKey === item.key ? "cursor-not-allowed bg-gray-200 text-gray-500" : "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105"}`}
                      >
                        {loadingKey === item.key ? "Mengunggah..." : "Upload Dokumen"}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
