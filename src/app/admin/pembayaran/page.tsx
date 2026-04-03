"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { useAuth } from "@/context/AuthContext"
import { DOCUMENT_FIELD_KEYS } from "@/data/documentCatalog"
import { getExtraAccess, getTopUp, withExtraFlow } from "@/lib/extraAthleteFlow"
import { getFileBlob } from "@/lib/fileStore"
import { Repos } from "@/repositories"
import type { ExtraAthleteAccessItem, Registration, PaymentStatus, TopUpPaymentStatus, ExtraAthleteAccessStatus, AthleteDocuments, DocumentStatus } from "@/types/registration"

type PaymentFilter = "ALL" | "ACC" | "BELUM_ACC"
type ApprovedDraft = Record<string, string>
type PreviewState = {
  open: boolean
  loading: boolean
  error: string | null
  url: string
  mime: string
  fileName: string
}

type KontingenRow = {
  u: ReturnType<ReturnType<typeof useAuth>["getAllUsers"]>[number]
  reg: Registration
}

type DocumentSummary = {
  total: number
  uploaded: number
  approved: number
  pending: number
  rejected: number
}

const DOC_KEYS: Array<keyof Omit<AthleteDocuments, "athleteId">> = DOCUMENT_FIELD_KEYS

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function paymentBadgeClass(status: string) {
  if (status === "APPROVED") return "border-green-200 bg-green-50 text-green-700"
  if (status === "PENDING") return "border-yellow-200 bg-yellow-50 text-yellow-800"
  if (status === "REJECTED") return "border-red-200 bg-red-50 text-red-700"
  return "border-gray-200 bg-gray-50 text-gray-700"
}

function badgeTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "APPROVED") return "success"
  if (status === "PENDING") return "warning"
  if (status === "REJECTED") return "danger"
  return "neutral"
}

function isPdfMime(mime?: string) {
  if (!mime) return false
  return mime === "application/pdf" || mime.includes("pdf")
}

function isImageMime(mime?: string) {
  if (!mime) return false
  return mime.startsWith("image/")
}

function isPaymentApproved(status?: PaymentStatus) {
  return status === "APPROVED"
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  try {
    return new Date(value).toLocaleString("id-ID")
  } catch {
    return value
  }
}

function summarizeDocuments(reg: Registration | null): DocumentSummary {
  const summary: DocumentSummary = { total: 0, uploaded: 0, approved: 0, pending: 0, rejected: 0 }
  if (!reg) return summary

  for (const doc of reg.documents ?? []) {
    for (const key of DOC_KEYS) {
      summary.total += 1
      const status = (doc[key]?.status ?? "Belum upload") as DocumentStatus
      if (status === "Disetujui") summary.approved += 1
      else if (status === "Ditolak") summary.rejected += 1
      else if (status === "Sudah upload" || status === "Perlu revisi") summary.pending += 1
      if (status !== "Belum upload") summary.uploaded += 1
    }
  }

  return summary
}

function countApprovedAthletes(reg: Registration | null) {
  if (!reg) return 0
  return (reg.athletes ?? []).filter((athlete) => {
    const docs = reg.documents.find((item) => item.athleteId === athlete.id)
    if (!docs) return false
    return DOC_KEYS.every((key) => docs[key]?.status === "Disetujui")
  }).length
}

function docProgressPercent(summary: DocumentSummary) {
  if (summary.total <= 0) return 0
  return Math.round((summary.uploaded / summary.total) * 100)
}

function StatCard({ label, value, meta, tone }: { label: string; value: number; meta: string; tone: "green" | "yellow" | "red" | "gray" }) {
  const toneMap = {
    green: "border-emerald-200 bg-gradient-to-br from-white to-emerald-50 text-emerald-700",
    yellow: "border-amber-200 bg-gradient-to-br from-white to-amber-50 text-amber-700",
    red: "border-rose-200 bg-gradient-to-br from-white to-rose-50 text-rose-700",
    gray: "border-slate-200 bg-gradient-to-br from-white to-slate-50 text-slate-700",
  } as const

  return (
    <Card className={toneMap[tone]}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.14em] text-gray-500">{label}</div>
            <div className="mt-2 text-3xl font-black">{value}</div>
            <div className="mt-1 text-xs text-gray-500">{meta}</div>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/80 text-lg shadow-sm">
            {tone === "green" ? "OK" : tone === "yellow" ? ".." : tone === "red" ? "!" : "-"}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AdminPembayaranPage() {
  const { getAllUsers, user: adminUser, canAccessSport } = useAuth()
  const [targetUserId, setTargetUserId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("ALL")
  const [registration, setRegistration] = useState<Registration | null>(null)
  const [status, setStatus] = useState<PaymentStatus>("NONE")
  const [note, setNote] = useState("")
  const [extraStatus, setExtraStatus] = useState<ExtraAthleteAccessStatus>("NONE")
  const [approvedSlots, setApprovedSlots] = useState("0")
  const [approvedBySport, setApprovedBySport] = useState<ApprovedDraft>({})
  const [extraNote, setExtraNote] = useState("")
  const [topUpStatus, setTopUpStatus] = useState<TopUpPaymentStatus>("NONE")
  const [topUpNote, setTopUpNote] = useState("")
  const [preview, setPreview] = useState<PreviewState>({ open: false, loading: false, error: null, url: "", mime: "", fileName: "" })

  const pesertaUsersAll = useMemo(() => getAllUsers().filter((u) => u.role === "PESERTA"), [getAllUsers])
  const pesertaWithReg = useMemo(() => {
    return pesertaUsersAll
      .map((u) => {
        const reg = safeParse<Registration | null>(localStorage.getItem(`mg26_registration_${u.id}`), null)
        return reg ? { u, reg } : null
      })
      .filter((item): item is KontingenRow => item !== null)
  }, [pesertaUsersAll])

  const visibleKontingen = useMemo(() => {
    if (!adminUser) return [] as KontingenRow[]
    if (adminUser.role === "ADMIN" || adminUser.role === "SUPER_ADMIN") return pesertaWithReg
    if (adminUser.role === "ADMIN_CABOR") {
      return pesertaWithReg.filter(({ reg }) => reg.sports.some((sport) => canAccessSport(sport.id)))
    }
    return [] as KontingenRow[]
  }, [adminUser, pesertaWithReg, canAccessSport])

  const paymentSummary = useMemo(() => {
    return visibleKontingen.reduce(
      (acc, { reg }) => {
        const current = reg.payment?.status ?? "NONE"
        if (current === "APPROVED") acc.approved += 1
        else if (current === "PENDING") acc.pending += 1
        else if (current === "REJECTED") acc.rejected += 1
        else acc.none += 1
        return acc
      },
      { approved: 0, pending: 0, rejected: 0, none: 0 }
    )
  }, [visibleKontingen])

  const filteredKontingen = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return visibleKontingen.filter(({ u, reg }) => {
      const currentStatus = reg.payment?.status ?? "NONE"
      const matchFilter = paymentFilter === "ALL" ? true : paymentFilter === "ACC" ? isPaymentApproved(currentStatus) : !isPaymentApproved(currentStatus)
      if (!matchFilter) return false
      if (!query) return true
      const haystack = [u.institutionName, u.email, reg.sports.map((sport) => sport.name).join(" ")].join(" ").toLowerCase()
      return haystack.includes(query)
    })
  }, [visibleKontingen, paymentFilter, searchQuery])

  useEffect(() => {
    if (filteredKontingen.length === 0) {
      setTargetUserId("")
      setRegistration(null)
      setStatus("NONE")
      setNote("")
      return
    }

    if (!filteredKontingen.some(({ u }) => u.id === targetUserId)) {
      setTargetUserId(filteredKontingen[0].u.id)
    }
  }, [filteredKontingen, targetUserId])

  useEffect(() => {
    let active = true

    const loadRegistration = async () => {
      if (!targetUserId) return
      const reg = (await Repos.registration.getRegistrationByUserId(targetUserId)) as unknown as Registration | null
      if (!active) return
      setRegistration(reg)

      if (reg?.payment) {
        setStatus(reg.payment.status)
        setNote(reg.payment.note ?? "")
      } else {
        setStatus("NONE")
        setNote("")
      }

      const nextExtra = getExtraAccess((reg ?? {}) as any)
      const nextTopUp = getTopUp((reg ?? {}) as any)
      setExtraStatus(nextExtra.status as ExtraAthleteAccessStatus)
      setApprovedSlots(String(nextExtra.approvedSlots || nextExtra.requestedSlots || 0))
      setApprovedBySport(
        (nextExtra.requestItems ?? []).reduce((acc: ApprovedDraft, item: ExtraAthleteAccessItem) => {
          const baseSlots = Number(item.approvedSlots ?? item.requestedSlots ?? 0)
          acc[item.sportId] = item.sportId === "voli_indoor" ? String(baseSlots / 12) : String(baseSlots)
          return acc
        }, {})
      )
      setExtraNote(nextExtra.adminNote ?? "")
      setTopUpStatus(nextTopUp.status as TopUpPaymentStatus)
      setTopUpNote(nextTopUp.note ?? "")
    }

    void loadRegistration()
    return () => {
      active = false
    }
  }, [targetUserId])

  const selectedKontingen = useMemo(() => filteredKontingen.find(({ u }) => u.id === targetUserId) ?? null, [filteredKontingen, targetUserId])
  const selectedDocSummary = useMemo(() => summarizeDocuments(registration), [registration])
  const approvedAthletes = useMemo(() => countApprovedAthletes(registration), [registration])
  const extraRequestItems = useMemo<ExtraAthleteAccessItem[]>(() => getExtraAccess((registration ?? {}) as any).requestItems ?? [], [registration])
  const athleteRows = useMemo(() => {
    if (!registration) return []
    return registration.athletes.map((athlete) => {
      const docs = registration.documents.find((item) => item.athleteId === athlete.id)
      const uploaded = DOC_KEYS.reduce((total, key) => total + ((docs?.[key]?.status ?? "Belum upload") !== "Belum upload" ? 1 : 0), 0)
      const approved = DOC_KEYS.reduce((total, key) => total + ((docs?.[key]?.status ?? "Belum upload") === "Disetujui" ? 1 : 0), 0)
      const rejected = DOC_KEYS.reduce((total, key) => total + ((docs?.[key]?.status ?? "Belum upload") === "Ditolak" ? 1 : 0), 0)
      return { athlete, uploaded, approved, rejected, pending: Math.max(0, uploaded - approved - rejected) }
    })
  }, [registration])

  const openStoredPreview = async (fileId?: string, mime?: string, fileName?: string) => {
    if (!fileId) return alert("File tidak ditemukan.")
    if (preview.url) URL.revokeObjectURL(preview.url)
    setPreview({ open: true, loading: true, error: null, url: "", mime: mime ?? "", fileName: fileName ?? "file" })

    try {
      const blob = await getFileBlob(fileId)
      if (!blob) {
        setPreview((prev) => ({ ...prev, loading: false, error: "File tidak tersedia di penyimpanan browser." }))
        return
      }
      const objectUrl = URL.createObjectURL(blob)
      setPreview({ open: true, loading: false, error: null, url: objectUrl, mime: mime || blob.type || "application/octet-stream", fileName: fileName ?? "file" })
    } catch {
      setPreview((prev) => ({ ...prev, loading: false, error: "Gagal membuka preview file." }))
    }
  }

  const closePreview = () => {
    if (preview.url) URL.revokeObjectURL(preview.url)
    setPreview({ open: false, loading: false, error: null, url: "", mime: "", fileName: "" })
  }

  const handleSave = async () => {
    if (!targetUserId) return
    const key = `mg26_registration_${targetUserId}`
    const reg = safeParse<Registration | null>(localStorage.getItem(key), null)
    if (!reg) return

    if (adminUser?.role === "ADMIN_CABOR") {
      const allowed = reg.sports.some((sport) => canAccessSport(sport.id))
      if (!allowed) return alert("Anda tidak memiliki akses untuk kontingen ini.")
    }

    const updated: Registration = {
      ...reg,
      payment: {
        ...reg.payment,
        status,
        approvedTotalFee: status === "APPROVED" ? reg.payment.totalFee : reg.payment.approvedTotalFee,
        note: note.trim() ? note.trim() : undefined,
      },
      status: status === "APPROVED" ? "PAYMENT_APPROVED" : status === "REJECTED" ? "WAITING_PAYMENT_UPLOAD" : status === "PENDING" ? "WAITING_PAYMENT_VERIFICATION" : reg.status,
      updatedAt: new Date().toISOString(),
    }

    try {
      await Repos.registration.adminUpdatePayment({ userId: targetUserId, status, note: note.trim() ? note.trim() : undefined })
      if (status === "APPROVED") localStorage.setItem(`mg26_approved_payment_total_${targetUserId}`, String(reg.payment.totalFee))
      localStorage.setItem("mg26_mock_payment_status", status === "NONE" ? "NONE" : status)
      localStorage.setItem(key, JSON.stringify(updated))
      setRegistration(updated)
      alert("Status pembayaran berhasil disimpan.")
    } catch {
      alert("Gagal menyimpan status pembayaran.")
    }
  }

  return (
    <div className="max-w-7xl space-y-6">
      <Card variant="soft">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Admin Workspace</div>
              <CardTitle className="mt-1">Validasi Pembayaran Peserta</CardTitle>
              <CardDescription className="mt-2 max-w-3xl">Pantau status pembayaran, progres dokumen kontingen, dan bukti transfer dari satu tampilan yang lebih informatif.</CardDescription>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              <Badge tone="success">Approved: {paymentSummary.approved}</Badge>
              <Badge tone="warning">Pending: {paymentSummary.pending}</Badge>
              <Badge tone="danger">Rejected: {paymentSummary.rejected}</Badge>
              <Badge tone="neutral">Belum Upload: {paymentSummary.none}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Approved" value={paymentSummary.approved} meta="Total peserta terverifikasi" tone="green" />
        <StatCard label="Pending" value={paymentSummary.pending} meta="Menunggu validasi admin" tone="yellow" />
        <StatCard label="Rejected" value={paymentSummary.rejected} meta="Perlu perbaikan peserta" tone="red" />
        <StatCard label="Belum Upload" value={paymentSummary.none} meta="Belum ada bukti pembayaran" tone="gray" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Filter dan Pencarian Kontingen</CardTitle>
          <CardDescription>Cari cepat berdasarkan nama kontingen, email, atau cabang olahraga.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-[1fr_260px]">
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari nama kontingen / email / cabang olahraga" className="w-full rounded-2xl border px-4 py-3" />
          <select value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)} className="w-full rounded-2xl border px-4 py-3">
            <option value="ALL">Semua Status</option>
            <option value="ACC">Approved</option>
            <option value="BELUM_ACC">Belum Approved</option>
          </select>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-gray-700">Pilih kontingen yang ingin divalidasi</label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full rounded-2xl border px-4 py-3"
              disabled={filteredKontingen.length === 0}
            >
              {filteredKontingen.length === 0 ? (
                <option value="">Tidak ada kontingen yang cocok</option>
              ) : (
                filteredKontingen.map(({ u, reg }) => (
                  <option key={u.id} value={u.id}>
                    {u.institutionName} - {reg.payment?.status ?? "NONE"} - {reg.sports.map((sport) => sport.name).join(", ")}
                  </option>
                ))
              )}
            </select>
            <div className="mt-2 text-xs text-gray-500">
              Dropdown ini menentukan data pembayaran mana yang sedang Anda validasi.
            </div>
          </div>
        </CardContent>
      </Card>

      {!selectedKontingen || !registration ? (
        <Card>
          <CardContent className="p-6 text-sm text-gray-500">Tidak ada kontingen yang cocok dengan filter saat ini.</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Detail Kontingen</CardTitle>
                <CardDescription>Ringkasan cepat untuk membantu admin memverifikasi pembayaran dan progres dokumen.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Nama Sekolah / Kontingen</div>
                    <div className="mt-2 text-lg font-extrabold text-gray-900">{selectedKontingen.u.institutionName}</div>
                    <div className="mt-1 text-sm text-gray-600">{selectedKontingen.u.email}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                    <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Cabang Lomba</div>
                    <div className="mt-2 text-sm font-semibold text-gray-900">{registration.sports.map((sport) => sport.name).join(", ") || "-"}</div>
                    <div className="mt-2 text-sm text-gray-600">Jumlah atlet: <b>{registration.athletes.length}</b></div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="text-xs text-gray-500">Dokumen</div>
                    <div className="mt-2 text-2xl font-black text-gray-900">{selectedDocSummary.uploaded} / {selectedDocSummary.total}</div>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="text-xs text-gray-500">Approved</div>
                    <div className="mt-2 text-2xl font-black text-emerald-700">{selectedDocSummary.approved}</div>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="text-xs text-gray-500">Pending</div>
                    <div className="mt-2 text-2xl font-black text-amber-700">{selectedDocSummary.pending}</div>
                  </div>
                  <div className="rounded-2xl border bg-white p-4 shadow-sm">
                    <div className="text-xs text-gray-500">Rejected</div>
                    <div className="mt-2 text-2xl font-black text-rose-700">{selectedDocSummary.rejected}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-gray-700">
                    <span>Progress dokumen kontingen</span>
                    <span>{docProgressPercent(selectedDocSummary)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-emerald-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${docProgressPercent(selectedDocSummary)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Ringkasan Atlet & Dokumen</CardTitle>
                <CardDescription>Lihat atlet yang dokumennya sudah lengkap atau masih menunggu verifikasi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-gray-700">Atlet dengan 5 dokumen approved: <b>{approvedAthletes}</b></div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-gray-700">Status pembayaran: <Badge tone={badgeTone(registration.payment.status)} className="ml-2">{registration.payment.status}</Badge></div>
                </div>
                <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                  {athleteRows.map(({ athlete, uploaded, approved, pending, rejected }) => (
                    <div key={athlete.id} className="rounded-2xl border bg-white p-4 shadow-sm">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-extrabold text-gray-900">{athlete.name}</div>
                          <div className="mt-1 text-xs text-gray-500">Dokumen {uploaded} / {DOC_KEYS.length} | Approved {approved}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <Badge tone="info">Pending {pending}</Badge>
                          <Badge tone="danger">Rejected {rejected}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Validasi Pembayaran Utama</CardTitle>
                <CardDescription>Preview bukti transfer dan lakukan update status pembayaran peserta.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border bg-gray-50 p-4">
                  <div className="text-xs text-gray-500">Bukti pembayaran</div>
                  <div className="mt-2 text-sm font-extrabold text-gray-900">{registration.payment.proofFileName ?? "-"}</div>
                  <div className="mt-1 text-xs text-gray-500">Upload: {formatDateTime(registration.payment.uploadedAt)}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge tone={badgeTone(registration.payment.status)}>{registration.payment.status}</Badge>
                    <Badge tone="info">Total: Rp {registration.payment.totalFee.toLocaleString("id-ID")}</Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Set Status</label>
                    <select value={status} onChange={(e) => setStatus(e.target.value as PaymentStatus)} className="w-full rounded-2xl border px-4 py-3">
                      <option value="NONE">NONE</option>
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Catatan Admin</label>
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[110px] w-full rounded-2xl border px-4 py-3" placeholder="Contoh: bukti belum jelas / nominal kurang / valid" />
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:flex-row">
                  <Button variant="secondary" onClick={() => openStoredPreview(registration.payment.proofFileId, registration.payment.proofMimeType, registration.payment.proofFileName)} disabled={!registration.payment.proofFileId}>Buka Dokumen</Button>
                  <Button onClick={handleSave}>Simpan Pembayaran Utama</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg md:text-xl">Pengajuan Tambah Peserta</CardTitle>
                <CardDescription>Flow top-up tetap tersedia, namun tampil lebih ringkas dan informatif.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={badgeTone(extraStatus)}>Request: {extraStatus}</Badge>
                  <Badge tone={badgeTone(topUpStatus)}>Top-up: {topUpStatus}</Badge>
                  <Badge tone="info">Item: {extraRequestItems.length}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border bg-gray-50 p-4"><div className="text-xs text-gray-500">Slot Diajukan</div><div className="mt-2 text-2xl font-black text-gray-900">{registration.extraAthleteAccess?.requestedSlots ?? 0}</div></div>
                  <div className="rounded-2xl border bg-gray-50 p-4"><div className="text-xs text-gray-500">Slot Disetujui</div><div className="mt-2 text-2xl font-black text-gray-900">{registration.extraAthleteAccess?.approvedSlots ?? 0}</div></div>
                  <div className="rounded-2xl border bg-gray-50 p-4"><div className="text-xs text-gray-500">Nominal Top-up</div><div className="mt-2 text-2xl font-black text-gray-900">Rp {getTopUp(registration as any).additionalFee.toLocaleString("id-ID")}</div></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Status Pengajuan Tambahan</label>
                    <select value={extraStatus} onChange={(e) => setExtraStatus(e.target.value as ExtraAthleteAccessStatus)} className="w-full rounded-2xl border px-4 py-3">
                      <option value="NONE">NONE</option><option value="REQUESTED">REQUESTED</option><option value="OPEN">OPEN / Disetujui</option><option value="CLOSED">CLOSED / Ditolak</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Status Pembayaran Tambahan</label>
                    <select value={topUpStatus} onChange={(e) => setTopUpStatus(e.target.value as TopUpPaymentStatus)} className="w-full rounded-2xl border px-4 py-3">
                      <option value="NONE">NONE</option><option value="REQUIRED">REQUIRED</option><option value="PENDING">PENDING</option><option value="APPROVED">APPROVED</option><option value="REJECTED">REJECTED</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <textarea value={extraNote} onChange={(e) => setExtraNote(e.target.value)} className="min-h-[110px] w-full rounded-2xl border px-4 py-3" placeholder="Catatan pengajuan tambahan" />
                  <textarea value={topUpNote} onChange={(e) => setTopUpNote(e.target.value)} className="min-h-[110px] w-full rounded-2xl border px-4 py-3" placeholder="Catatan pembayaran tambahan" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Slot Disetujui Per Cabor</label>
                  {extraRequestItems.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2">
                      {extraRequestItems.map((item) => (
                        <div key={item.sportId} className="rounded-2xl border bg-gray-50 p-4">
                          <div className="text-sm font-extrabold text-gray-900">{item.sportName}</div>
                          <div className="mt-1 text-xs text-gray-500">Diminta: {item.sportId === "voli_indoor" ? item.requestedSlots / 12 + " tim / " + item.requestedSlots + " atlet" : item.requestedSlots + " peserta"}</div>
                          <input type="number" min={0} value={approvedBySport[item.sportId] ?? (item.sportId === "voli_indoor" ? String((item.approvedSlots ?? item.requestedSlots ?? 0) / 12) : String(item.approvedSlots ?? item.requestedSlots ?? 0))} onChange={(e) => setApprovedBySport((prev) => ({ ...prev, [item.sportId]: e.target.value }))} className="mt-3 w-full rounded-2xl border px-4 py-3" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <input type="number" min={0} value={approvedSlots} onChange={(e) => setApprovedSlots(e.target.value)} className="w-full rounded-2xl border px-4 py-3" />
                  )}
                </div>
                <Button onClick={() => {
                  if (!targetUserId || !registration) return
                  const key = `mg26_registration_${targetUserId}`
                  const requestItems = getExtraAccess(registration as any).requestItems ?? []
                  const normalizedRequestItems = requestItems.map((item: ExtraAthleteAccessItem) => ({ ...item, approvedSlots: extraStatus === "OPEN" ? Math.max(0, item.sportId === "voli_indoor" ? Number(approvedBySport[item.sportId] ?? ((item.requestedSlots ?? 0) / 12)) * 12 : Number(approvedBySport[item.sportId] ?? item.requestedSlots ?? 0)) : 0 }))
                  const requestedSlots = Math.max(0, Number(registration.extraAthleteAccess?.requestedSlots ?? 0))
                  const normalizedApprovedSlots = extraStatus === "OPEN" ? (normalizedRequestItems.length > 0 ? normalizedRequestItems.reduce((total: number, item: ExtraAthleteAccessItem) => total + Math.max(0, Number(item.approvedSlots ?? 0)), 0) : Math.max(1, Number(approvedSlots || requestedSlots || 0))) : 0
                  const normalizedTopUpStatus = extraStatus === "OPEN" ? (topUpStatus === "NONE" ? "REQUIRED" : topUpStatus) : "NONE"
                  const updated = withExtraFlow({ ...registration, status: extraStatus === "REQUESTED" ? "EXTRA_ACCESS_REQUESTED" : extraStatus === "OPEN" && normalizedTopUpStatus === "APPROVED" ? "TOP_UP_APPROVED" : extraStatus === "OPEN" && normalizedTopUpStatus === "PENDING" ? "TOP_UP_PENDING" : extraStatus === "OPEN" ? "TOP_UP_REQUIRED" : extraStatus === "CLOSED" ? "PAYMENT_APPROVED" : registration.status, extraAthleteAccess: { ...registration.extraAthleteAccess, status: extraStatus, approvedSlots: normalizedApprovedSlots, requestItems: normalizedRequestItems.length > 0 ? normalizedRequestItems : registration.extraAthleteAccess?.requestItems, adminNote: extraNote.trim() ? extraNote.trim() : undefined, approvedAt: extraStatus === "OPEN" ? new Date().toISOString() : registration.extraAthleteAccess?.approvedAt, approvedBy: extraStatus === "OPEN" ? adminUser?.email : registration.extraAthleteAccess?.approvedBy }, topUpPayment: { ...registration.topUpPayment, status: normalizedTopUpStatus, additionalAthletes: normalizedApprovedSlots, additionalFee: normalizedApprovedSlots * 150000, note: topUpNote.trim() ? topUpNote.trim() : undefined, approvedAt: normalizedTopUpStatus === "APPROVED" ? new Date().toISOString() : registration.topUpPayment?.approvedAt, approvedBy: normalizedTopUpStatus === "APPROVED" ? adminUser?.email : registration.topUpPayment?.approvedBy } } as any) as unknown as Registration
                  localStorage.setItem(key, JSON.stringify(updated))
                  setRegistration(updated)
                  alert("Status pengajuan tambahan peserta berhasil disimpan.")
                }}>Simpan Pengajuan Tambahan</Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {preview.open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl overflow-hidden rounded-2xl border bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="font-extrabold text-gray-900">Preview Bukti Pembayaran</div>
                <div className="text-xs text-gray-500">{preview.fileName}</div>
              </div>
              <Button variant="secondary" onClick={closePreview}>Tutup</Button>
            </div>
            <div className="p-4">
              {preview.loading && <div className="text-sm text-gray-600">Memuat file...</div>}
              {!preview.loading && preview.error && <div className="text-sm text-red-700">{preview.error}</div>}
              {!preview.loading && !preview.error && preview.url && isImageMime(preview.mime) && <div className="flex justify-center"><img src={preview.url} alt="Bukti pembayaran" className="max-h-[70vh] rounded-xl border object-contain" /></div>}
              {!preview.loading && !preview.error && preview.url && isPdfMime(preview.mime) && <div className="h-[70vh] overflow-hidden rounded-xl border"><iframe title="payment-preview" src={preview.url} className="h-full w-full" /></div>}
              {!preview.loading && !preview.error && preview.url && !isImageMime(preview.mime) && !isPdfMime(preview.mime) && <a href={preview.url} target="_blank" rel="noreferrer" className="rounded-lg border bg-white px-3 py-2 text-sm font-bold hover:bg-gray-50">Buka file di tab baru</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

