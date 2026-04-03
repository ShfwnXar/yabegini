"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRegistration } from "@/context/RegistrationContext"
import { useAuth } from "@/context/AuthContext"
import { getExtraAccess, getTopUp, withExtraFlow } from "@/lib/extraAthleteFlow"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import type { RegistrationState as DraftRegistrationState } from "@/context/RegistrationContext"
import type { ExtraAthleteAccessItem, Registration } from "@/types/registration"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Textarea } from "@/components/ui/Textarea"

type HybridRegistrationState = DraftRegistrationState & Partial<Registration>
type RequestDraft = Record<string, string>
const SPORT_VOLI_ID = "voli_indoor"
const VOLI_ROSTER_PER_TEAM = 12

function getRequestUnitLabel(sportId: string) {
  return sportId === SPORT_VOLI_ID ? "Jumlah tim tambahan" : "Jumlah peserta tambahan"
}

function toRequestedSlots(sportId: string, rawValue: string) {
  const baseValue = Math.max(0, Number(rawValue ?? 0))
  return sportId === SPORT_VOLI_ID ? baseValue * VOLI_ROSTER_PER_TEAM : baseValue
}

function fromRequestedSlots(sportId: string, requestedSlots: number) {
  const total = Math.max(0, Number(requestedSlots ?? 0))
  return sportId === SPORT_VOLI_ID ? String(total / VOLI_ROSTER_PER_TEAM) : String(total)
}

function normalizeRequestItems(state: HybridRegistrationState): ExtraAthleteAccessItem[] {
  const existing = Array.isArray(state.extraAthleteAccess?.requestItems) ? state.extraAthleteAccess.requestItems : []
  if (existing.length > 0) {
    return existing.filter((item) => item.sportId && Number(item.requestedSlots) > 0)
  }

  if (state.extraAthleteAccess?.requestedSportId && Number(state.extraAthleteAccess?.requestedSlots ?? 0) > 0) {
    return [{
      sportId: state.extraAthleteAccess.requestedSportId,
      sportName: state.extraAthleteAccess.requestedSportName ?? "Cabor tambahan",
      requestedSlots: Number(state.extraAthleteAccess.requestedSlots ?? 0),
      approvedSlots: Number(state.extraAthleteAccess.approvedSlots ?? 0),
    }]
  }

  return []
}

function buildDraftMap(items: ExtraAthleteAccessItem[]) {
  return items.reduce<RequestDraft>((acc, item) => {
    acc[item.sportId] = fromRequestedSlots(item.sportId, Number(item.requestedSlots ?? 0))
    return acc
  }, {})
}

function formatCompactBreakdown(item: ExtraAthleteAccessItem, type: "requested" | "approved") {
  const slots = type === "requested" ? Number(item.requestedSlots ?? 0) : Number(item.approvedSlots ?? 0)
  if (item.sportId === SPORT_VOLI_ID) {
    return item.sportName + ": " + (slots / VOLI_ROSTER_PER_TEAM) + " tim"
  }

  return item.sportName + ": " + slots + " peserta"
}

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" | "info" | "brand" {
  if (status === "APPROVED" || status === "READY") return "success"
  if (status === "REQUESTED" || status === "PENDING" || status === "REQUIRED") return "warning"
  if (status === "REJECTED" || status === "CLOSED") return "danger"
  if (status === "OPEN") return "info"
  return "neutral"
}

function resolveSubmissionStatus(extraStatus: string, topUpStatus: string) {
  if (extraStatus === "REQUESTED") {
    return {
      label: "Menunggu verifikasi admin",
      description: "Pengajuan tambahan peserta sudah terkirim dan sedang menunggu keputusan admin.",
      tone: "warning" as const,
    }
  }

  if (extraStatus === "OPEN" && (topUpStatus === "REQUIRED" || topUpStatus === "REJECTED" || topUpStatus === "PENDING" || topUpStatus === "NONE")) {
    return {
      label: topUpStatus === "PENDING" ? "Menunggu verifikasi pembayaran tambahan" : "Menunggu pembayaran tambahan",
      description: topUpStatus === "PENDING"
        ? "Bukti pembayaran tambahan sudah dikirim dan sedang diverifikasi admin."
        : "Pengajuan disetujui. Lanjutkan pembayaran tambahan sebelum mengisi kuota baru.",
      tone: "warning" as const,
    }
  }

  if (extraStatus === "OPEN" && topUpStatus === "APPROVED") {
    return {
      label: "Siap isi kuota tambahan",
      description: "Kuota tambahan sudah aktif. Peserta bisa lanjut ke Step 2 untuk mengisi slot baru tanpa mengubah kuota lama.",
      tone: "success" as const,
    }
  }

  if (extraStatus === "CLOSED") {
    return {
      label: "Pengajuan ditutup",
      description: "Admin menolak atau menutup pengajuan tambahan peserta ini.",
      tone: "danger" as const,
    }
  }

  return {
    label: "Belum ada pengajuan",
    description: "Ajukan tambahan peserta jika kuota awal sudah terkunci setelah pembayaran awal.",
    tone: "neutral" as const,
  }
}

export default function TambahPesertaPage() {
  const { user } = useAuth()
  const { state, hydrateReady, dispatch } = useRegistration()
  const hybridState = state as HybridRegistrationState
  const extraAccess = getExtraAccess(hybridState)
  const topUp = getTopUp(hybridState)
  const [reason, setReason] = useState(extraAccess.requestedReason ?? "")
  const sportOptions = SPORTS_CATALOG
  const existingItems = useMemo(() => normalizeRequestItems(hybridState), [hybridState])
  const [requestedBySport, setRequestedBySport] = useState<RequestDraft>({})

  const basePaymentApproved = state.payment.status === "APPROVED"
  const statusInfo = useMemo(() => resolveSubmissionStatus(extraAccess.status, topUp.status), [extraAccess.status, topUp.status])
  const canSubmitRequest = basePaymentApproved && extraAccess.status !== "REQUESTED" && extraAccess.status !== "OPEN"
  const readyForStep3 = extraAccess.status === "OPEN" && topUp.status === "APPROVED" && topUp.additionalAthletes > 0

  useEffect(() => {
    const nextMap = buildDraftMap(existingItems)
    if (Object.keys(nextMap).length > 0) {
      setRequestedBySport(nextMap)
      return
    }

    setRequestedBySport((prev) => {
      if (Object.keys(prev).length > 0) return prev
      return sportOptions.reduce<RequestDraft>((acc, sport) => {
        acc[sport.id] = "0"
        return acc
      }, {})
    })
  }, [existingItems, sportOptions])

  const requestItems = useMemo(() => {
    return sportOptions
      .map((sport) => ({
        sportId: sport.id,
        sportName: sport.name,
        requestedSlots: toRequestedSlots(sport.id, requestedBySport[sport.id] ?? "0"),
      }))
      .filter((item) => item.requestedSlots > 0)
  }, [requestedBySport, sportOptions])

  const requestedSlots = requestItems.reduce((total, item) => total + item.requestedSlots, 0)
  const requestedBreakdown = existingItems.map((item) => formatCompactBreakdown(item, "requested")).join(" | ")
  const approvedBreakdown = existingItems.map((item) => formatCompactBreakdown(item, "approved")).join(" | ")

  const handleSubmitRequest = () => {
    if (!basePaymentApproved) {
      alert("Pembayaran awal harus APPROVED sebelum mengajukan tambah peserta.")
      return
    }

    if (requestItems.length === 0) {
      alert("Isi minimal satu cabor dengan jumlah peserta tambahan lebih dari 0.")
      return
    }

    const normalizedItems = requestItems.map((item) => ({
      ...item,
      approvedSlots: 0,
    }))

    const updated = withExtraFlow({
      ...hybridState,
      status: "EXTRA_ACCESS_REQUESTED",
      extraAthleteAccess: {
        ...hybridState.extraAthleteAccess,
        status: "REQUESTED",
        requestedAt: new Date().toISOString(),
        requestedSlots,
        requestedSportId: normalizedItems[0]?.sportId,
        requestedSportName: normalizedItems.map((item) => item.sportName).join(", "),
        requestItems: normalizedItems,
        requestedReason: reason.trim() || undefined,
        approvedSlots: 0,
        approvedAt: undefined,
        approvedBy: undefined,
      },
      topUpPayment: {
        ...hybridState.topUpPayment,
        status: "NONE",
        additionalAthletes: 0,
        additionalFee: 0,
        proofFileId: undefined,
        proofFileName: undefined,
        proofMimeType: undefined,
        uploadedAt: undefined,
        approvedAt: undefined,
        approvedBy: undefined,
      },
    })

    dispatch({ type: "LOAD", payload: updated as DraftRegistrationState })
    alert("Pengajuan tambah peserta berhasil dikirim. Menunggu verifikasi admin.")
  }

  if (!hydrateReady || !user) {
    return <div className="max-w-5xl rounded-2xl border bg-white p-6 text-sm text-gray-600">Memuat data tambah peserta...</div>
  }

  return (
    <div className="max-w-5xl space-y-6">
      <Card variant="soft">
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-extrabold tracking-wider text-gray-500">FLOW TAMBAHAN PESERTA</div>
              <CardTitle className="mt-1">Ajukan Tambah Peserta</CardTitle>
              <CardDescription className="mt-2">
                Setelah pembayaran awal berhasil, kuota lama tetap terkunci dan aman. Penambahan peserta hanya berlaku untuk kuota baru yang diajukan dan disetujui admin.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
              <Badge tone={statusTone(extraAccess.status)}>Request: {extraAccess.status}</Badge>
              <Badge tone={statusTone(topUp.status)}>Top-up: {topUp.status}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {!basePaymentApproved ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Halaman pengajuan ini aktif setelah pembayaran registrasi pertama berstatus <b>APPROVED</b>.
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Status Pengajuan</CardTitle>
            <CardDescription>{statusInfo.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border bg-white p-4">
                <div className="text-xs text-gray-500">Pembayaran awal</div>
                <div className="mt-1 text-lg font-extrabold text-gray-900">{state.payment.status}</div>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <div className="text-xs text-gray-500">Slot diajukan</div>
                <div className="mt-1 text-lg font-extrabold text-gray-900">{extraAccess.requestedSlots}</div>
                {requestedBreakdown ? <div className="mt-2 text-xs text-gray-500">{requestedBreakdown}</div> : null}
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <div className="text-xs text-gray-500">Slot disetujui</div>
                <div className="mt-1 text-lg font-extrabold text-gray-900">{extraAccess.approvedSlots}</div>
                {approvedBreakdown ? <div className="mt-2 text-xs text-gray-500">{approvedBreakdown}</div> : null}
              </div>
            </div>

            <div className="rounded-2xl border bg-amber-50/60 p-4 text-sm text-gray-700">
              <div><b>Kuota lama aman:</b> slot awal yang sudah dibayar dan diisi tidak diubah.</div>
              <div className="mt-1"><b>Kuota tambahan terpisah:</b> slot baru hanya aktif setelah pengajuan disetujui dan pembayaran tambahan diverifikasi.</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold">Ajukan tambahan per cabor</label>
                <div className="space-y-3">
                  {sportOptions.map((sport) => (
                    <div key={sport.id} className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[1.2fr_0.8fr] md:items-center">
                      <div>
                        <div className="font-extrabold text-gray-900">{sport.name}</div>
                        <div className="text-xs font-semibold text-gray-700">{getRequestUnitLabel(sport.id)}</div>
                        <div className="text-xs text-gray-500">{sport.id === SPORT_VOLI_ID ? "Masukkan jumlah tim. Sistem akan menghitung 12 atlet per tim." : "Tambahkan jumlah peserta baru khusus untuk cabor ini."}</div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        value={requestedBySport[sport.id] ?? "0"}
                        onChange={(e) => setRequestedBySport((prev) => ({ ...prev, [sport.id]: e.target.value }))}
                        disabled={!canSubmitRequest}
                        className="w-full rounded-xl border px-3 py-2"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {existingItems.length > 0 ? (
                <div className="rounded-2xl border bg-slate-50 p-4 text-sm text-gray-700">
                  <div className="font-extrabold text-gray-900">Rincian pengajuan tersimpan</div>
                  <div className="mt-2 space-y-2">
                    {existingItems.map((item) => (
                      <div key={item.sportId} className="flex items-center justify-between gap-3 rounded-xl bg-white px-3 py-2">
                        <span>{item.sportName}</span>
                        <span className="font-bold">{item.sportId === SPORT_VOLI_ID ? "Diminta " + (item.requestedSlots / VOLI_ROSTER_PER_TEAM) + " tim / " + item.requestedSlots + " atlet | Disetujui " + ((item.approvedSlots ?? 0) / VOLI_ROSTER_PER_TEAM) + " tim / " + (item.approvedSlots ?? 0) + " atlet" : "Diminta " + item.requestedSlots + " peserta | Disetujui " + (item.approvedSlots ?? 0) + " peserta"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-2xl border bg-white p-4 text-sm text-gray-700">
                <div className="text-xs text-gray-500">Estimasi biaya tambahan</div>
                <div className="mt-1 text-lg font-extrabold text-gray-900">
                  Rp {(requestedSlots * 150000).toLocaleString("id-ID")}
                </div>
              </div>
            </div>

            <Textarea
              label="Alasan / catatan pengajuan"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Contoh: ada atlet tambahan hasil seleksi tahap akhir"
              disabled={!canSubmitRequest}
            />

            <div className="flex flex-col gap-3 md:flex-row">
              <Button variant="primary" onClick={handleSubmitRequest} disabled={!canSubmitRequest || requestedSlots <= 0}>
                Ajukan Tambah Peserta
              </Button>
              <Link href="/dashboard/pembayaran">
                <Button variant="secondary" className="w-full md:w-auto">Lihat Pembayaran Tambahan</Button>
              </Link>
              <Link href="/dashboard/pendaftaran/atlet">
                <Button variant="secondary" className="w-full md:w-auto" disabled={!readyForStep3}>Lanjut Step 2</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card variant="soft">
          <CardHeader>
            <CardTitle>Ringkasan Status</CardTitle>
            <CardDescription>Urutan proses tambah peserta.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-700">
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-extrabold text-gray-900">1. Menunggu verifikasi admin</div>
              <div className="mt-1">Status request: <b>{extraAccess.status}</b></div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-extrabold text-gray-900">2. Menunggu pembayaran tambahan</div>
              <div className="mt-1">Nominal: <b>Rp {topUp.additionalFee.toLocaleString("id-ID")}</b></div>
              <div className="mt-1">Status top-up: <b>{topUp.status}</b></div>
            </div>
            <div className="rounded-2xl border bg-white p-4">
              <div className="font-extrabold text-gray-900">3. Siap isi kuota tambahan</div>
              <div className="mt-1">Step 2 terbuka setelah top-up <b>APPROVED</b>.</div>
              <div className="mt-1">Slot tambahan aktif: <b>{readyForStep3 ? topUp.additionalAthletes : 0}</b></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

