"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRegistration } from "@/context/RegistrationContext"
import type { RegistrationState as DraftRegistrationState } from "@/context/RegistrationContext"
import { DOCUMENT_FIELD_KEYS } from "@/data/documentCatalog"
import { getApprovedAthleteQuota, getActiveAthleteCount, getExtraAccess, getPendingTopUpCount, getTopUp } from "@/lib/extraAthleteFlow"
import { listVerificationEmailDrafts } from "@/lib/verificationEmailStore"
import type { Registration } from "@/types/registration"
import { readRevisionMode, writeRevisionMode } from "@/lib/registrationFlow"

type DocKey = (typeof DOCUMENT_FIELD_KEYS)[number]
const DOC_KEYS: DocKey[] = DOCUMENT_FIELD_KEYS
type HybridRegistrationState = DraftRegistrationState & Partial<Registration>


function Badge({
  text,
  variant,
}: {
  text: string
  variant: "gray" | "yellow" | "green" | "red"
}) {
  const cls =
    variant === "gray"
      ? "bg-gray-100 border-gray-200 text-gray-700"
      : variant === "yellow"
      ? "bg-yellow-50 border-yellow-200 text-yellow-800"
      : variant === "green"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-red-50 border-red-200 text-red-800"

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border ${cls}`}
    >
      {text}
    </span>
  )
}

function formatISO(iso?: string) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("id-ID")
  } catch {
    return iso
  }
}

export default function StatusPage() {
  const { user } = useAuth()
  const { state, hydrateReady, dispatch, activeRegistrationId, submitRegistration } = useRegistration()
  const hybridState = state as HybridRegistrationState
  const approvedAthleteQuota = getApprovedAthleteQuota(hybridState)
  const activeAthleteCount = getActiveAthleteCount(hybridState)
  const pendingTopUpCount = getPendingTopUpCount(hybridState)
  const extraAccess = getExtraAccess(hybridState)
  const topUp = getTopUp(hybridState)
  const [actionMsg, setActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const paymentStatus = state.payment.status
  const paymentApproved = paymentStatus === "APPROVED"
  const paymentSubmitted = paymentStatus === "PENDING" || paymentStatus === "APPROVED"
  const revisionOpen = user ? readRevisionMode(user.id) : false
  const canAccessAthleteFlow = !paymentSubmitted || revisionOpen
  const canAccessDocumentFlow = paymentSubmitted || revisionOpen
  const verificationEmails = useMemo(() => (user ? listVerificationEmailDrafts(user.id) : []), [user])

  const handleReopenRegistration = () => {
    const ok = window.confirm("Buka revisi pendaftaran? Step 1 akan terbuka lagi dan Anda perlu melakukan pembayaran ulang setelah revisi kuota.")
    if (!ok) return

    if (user) writeRevisionMode(user.id, true)
    dispatch({ type: "SET_PAYMENT_STATUS", status: "NONE" })
    setActionMsg({ type: "success", text: "Mode revisi dibuka. Silakan ubah kuota di Step 1 dan Step 2, lalu lanjutkan pembayaran ulang di Step 3." })
  }
  const paymentBadge = useMemo(() => {
    if (paymentStatus === "NONE") return <Badge text="Belum Upload" variant="gray" />
    if (paymentStatus === "PENDING") return <Badge text="Menunggu Verifikasi" variant="yellow" />
    if (paymentStatus === "APPROVED") return <Badge text="Approved" variant="green" />
    return <Badge text="Rejected" variant="red" />
  }, [paymentStatus])

  // Step 1: total kuota atlet & total official
  const step1 = useMemo(() => {
    let totalAthleteQuota = 0
    let totalOfficialQuota = 0

    const rows: Array<{
      sportId: string
      sportName: string
      categoryName: string
      quota: number
    }> = []

    for (const s of state.sports) {
      totalOfficialQuota += Number(s.officialCount || 0)
      for (const c of s.categories) {
        const q = Number(c.quota || 0)
        if (q <= 0) continue
        totalAthleteQuota += q
        rows.push({
          sportId: s.id,
          sportName: s.name,
          categoryName: c.name,
          quota: q,
        })
      }
    }

    const filledSports = rows.length
    const done = totalAthleteQuota > 0 || totalOfficialQuota > 0

    return {
      totalAthleteQuota,
      totalOfficialQuota,
      rows,
      filledSports,
      done,
    }
  }, [state.sports])

  // Step 3: total atlet terisi & ringkasan terisi per kategori
  const step3 = useMemo(() => {
    const totalAthletes = state.athletes.length

    const map = new Map<string, number>() // key: sportId|categoryId
    for (const a of state.athletes) {
      const k = `${a.sportId}__${a.categoryId}`
      map.set(k, (map.get(k) ?? 0) + 1)
    }

    // buat summary berdasarkan kuota step1 agar "terisi/kuota"
    const rows: Array<{
      sportName: string
      categoryName: string
      filled: number
      quota: number
    }> = []

    for (const s of state.sports) {
      for (const c of s.categories) {
        const q = Number(c.quota || 0)
        if (q <= 0) continue
        const filled = map.get(`${s.id}__${c.id}`) ?? 0
        rows.push({ sportName: s.name, categoryName: c.name, filled, quota: q })
      }
    }

    const done = step1.totalAthleteQuota > 0 && totalAthletes > 0
    const complete = step1.totalAthleteQuota > 0 && totalAthletes >= step1.totalAthleteQuota

    return {
      totalAthletes,
      rows,
      done,
      complete,
    }
  }, [state.athletes, state.sports, step1.totalAthleteQuota])

  // Step 4: dokumen per atlet
  const step4 = useMemo(() => {
    const rows = state.athletes.map((a) => {
      const d = state.documents.find((x) => x.athleteId === a.id)
      let uploaded = 0
      for (const k of DOC_KEYS) {
        const file = d?.[k]
        if (file?.status && file.status !== "Belum upload") uploaded += 1
      }
      return {
        athleteId: a.id,
        name: a.name,
        sportId: a.sportId,
        categoryId: a.categoryId,
        uploaded,
        total: DOC_KEYS.length,
      }
    })

    const totalAthletes = state.athletes.length
    const totalDocsNeeded = totalAthletes * DOC_KEYS.length
    const totalUploaded = rows.reduce((acc, r) => acc + r.uploaded, 0)

    const done = totalAthletes > 0 && totalUploaded > 0
    const complete = totalAthletes > 0 && totalUploaded >= totalDocsNeeded

    return {
      totalAthletes,
      totalDocsNeeded,
      totalUploaded,
      rows,
      done,
      complete,
    }
  }, [state.athletes, state.documents])

  // Checklist step completion
  const checklist = useMemo(() => {
    const step1Ready = step1.done
      const step2Ready = step3.done
      const step2Approved = paymentStatus === "APPROVED"
      const step3Ready = paymentStatus === "PENDING" || paymentStatus === "APPROVED"
      const step4Ready = (paymentStatus === "PENDING" || paymentStatus === "APPROVED") && step4.done
    const allStepsComplete = step1Ready && step2Approved && step3.complete && step4.complete

    return {
      step1Ready,
      step2Ready,
      step2Approved,
      step3Ready,
      step4Ready,
      allStepsComplete,
    }
  }, [step1.done, step3.complete, step3.done, step4.complete, step4.done, paymentStatus])

  if (!hydrateReady) {
    return (
      <div className="max-w-6xl">
        <div className="bg-white border rounded-xl p-6 shadow-sm text-sm text-gray-600">
          Memuat status...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Status Pendaftaran</h1>
            <p className="text-gray-600 mt-2">
              Ringkasan progres Step 1-4 + status verifikasi admin (mock).
            </p>

            <div className="mt-4 flex flex-wrap gap-2 items-center">
              {paymentBadge}
              <Badge
                text={`Total Biaya: Rp ${state.payment.totalFee.toLocaleString()}`}
                variant="gray"
              />
              <Badge text={"Kuota Terbayar: " + approvedAthleteQuota} variant="gray" />
              <Badge text={"Atlet Aktif: " + activeAthleteCount} variant="gray" />
              {pendingTopUpCount > 0 ? <Badge text={"Pending Top-up: " + pendingTopUpCount} variant="yellow" /> : null}
              {extraAccess.status !== "NONE" ? <Badge text={"Akses Tambahan: " + extraAccess.status} variant={extraAccess.status === "OPEN" ? "green" : "yellow"} /> : null}
              {user?.institutionName ? (
                <Badge text={user.institutionName} variant="gray" />
              ) : null}
              {activeRegistrationId ? <Badge text={`Registration ID: ${activeRegistrationId}`} variant="gray" /> : null}
            </div>
          </div>

          {actionMsg && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {actionMsg.text}
            </div>
          )}
          <div className="rounded-xl border bg-gray-50 p-4 min-w-[320px]">
            <div className="text-xs text-gray-500">Aksi Cepat</div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link
                href="/dashboard/pendaftaran"
                className="px-3 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50 text-sm text-center"
              >
                Step 1
              </Link>
              <Link
                href="/dashboard/pendaftaran/atlet"
                className="px-3 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50 text-sm text-center"
              >
                Step 2
              </Link>
              <Link
                href="/dashboard/pembayaran"
                className={`px-3 py-2 rounded-xl font-extrabold text-sm text-center ${
                  canAccessAthleteFlow
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-600 cursor-not-allowed"
                }`}
                onClick={(e) => {
                  if (!canAccessAthleteFlow) {
                    e.preventDefault()
                    alert("Step 2 terkunci karena pembayaran sudah diajukan.")
                  }
                }}
                >
                  Step 3
                </Link>
                <Link
                  href="/dashboard/pendaftaran/dokumen"
                  className={`px-3 py-2 rounded-xl font-extrabold text-sm text-center ${
                    canAccessDocumentFlow
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "bg-gray-200 text-gray-600 cursor-not-allowed"
                }`}
                onClick={(e) => {
                  if (!canAccessDocumentFlow) {
                    e.preventDefault()
                    alert("Step 4 hanya bisa dibuka setelah pembayaran dilakukan.")
                  }
                }}
              >
                Step 4
              </Link>
            </div>
          </div>
        </div>
      </div>
          {checklist.allStepsComplete && (
            <button
              onClick={handleReopenRegistration}
              className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-amber-600"
            >
              Revisi / Tambah Atlet Lagi
            </button>
          )}
          {paymentApproved && !checklist.allStepsComplete && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Tombol tambah atlet lagi akan aktif setelah Step 1 sampai Step 4 selesai lengkap.
            </div>
          )}










      {/* Checklist Steps */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="text-lg font-extrabold text-gray-900">Checklist Step</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-gray-900">Step 1</div>
              <div className="text-xs text-gray-600 mt-1">Pilih cabor & kuota</div>
            </div>
            {checklist.step1Ready ? <Badge text="OK" variant="green" /> : <Badge text="Belum" variant="gray" />}
          </div>

          <div className="rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-gray-900">Step 2</div>
              <div className="text-xs text-gray-600 mt-1">Input atlet + kategori</div>
            </div>
            {checklist.step2Ready ? <Badge text="Siap" variant="green" /> : <Badge text="Belum" variant="gray" />}
          </div>

          <div className="rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-gray-900">Step 3</div>
              <div className="text-xs text-gray-600 mt-1">Upload bukti pembayaran</div>
            </div>
            {checklist.step3Ready ? <Badge text="Sudah Bayar" variant="yellow" /> : <Badge text="Belum" variant="gray" />}
          </div>

          <div className="rounded-xl border p-4 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-gray-900">Step 4</div>
              <div className="text-xs text-gray-600 mt-1">Upload dokumen</div>
            </div>
            {checklist.step4Ready ? <Badge text="Progress" variant="yellow" /> : <Badge text="Terkunci" variant="gray" />}
          </div>
        </div>
        <div className="mt-5">
          <button
            type="button"
            disabled={!checklist.allStepsComplete || !activeRegistrationId}
            onClick={async () => {
              const ok = window.confirm("Submit registrasi ini ke panitia?")
              if (!ok) return
              try {
                const result = await submitRegistration()
                setActionMsg({ type: result.ok ? "success" : "error", text: result.message })
              } catch (error) {
                setActionMsg({
                  type: "error",
                  text: error instanceof Error ? error.message : "Gagal submit registrasi.",
                })
              }
            }}
            className={`w-full rounded-xl px-4 py-3 text-sm font-extrabold ${
              checklist.allStepsComplete && activeRegistrationId
                ? "bg-green-600 text-white hover:bg-green-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            Submit Registrasi
          </button>
          {!activeRegistrationId ? (
            <div className="mt-2 text-xs text-gray-500">Draft backend belum terbentuk. Simpan draft dari Step 1 terlebih dahulu.</div>
          ) : null}
        </div>
      </div>

      {/* Pembayaran Detail */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="text-lg font-extrabold text-gray-900">Status Tambahan Atlet</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="rounded-xl border p-4"><div className="text-xs text-gray-500">Kuota Terbayar</div><div className="mt-2 text-2xl font-extrabold text-gray-900">{approvedAthleteQuota}</div></div>
          <div className="rounded-xl border p-4"><div className="text-xs text-gray-500">Atlet Aktif</div><div className="mt-2 text-2xl font-extrabold text-gray-900">{activeAthleteCount}</div></div>
          <div className="rounded-xl border p-4"><div className="text-xs text-gray-500">Akses Tambahan</div><div className="mt-2 text-sm font-extrabold text-gray-900">{extraAccess.status}</div></div>
          <div className="rounded-xl border p-4"><div className="text-xs text-gray-500">Top-up</div><div className="mt-2 text-sm font-extrabold text-gray-900">{topUp.status}{topUp.additionalFee > 0 ? " - Rp " + topUp.additionalFee.toLocaleString() : ""}</div></div>
        </div>
      </div>
        <div className="text-lg font-extrabold text-gray-900">Detail Pembayaran</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Status</div>
            <div className="mt-2">{paymentBadge}</div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Bukti</div>
            <div className="mt-2 text-sm text-gray-900 font-bold">
              {state.payment.proofFileName ?? "-"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Upload: {formatISO(state.payment.uploadedAt)}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Total</div>
            <div className="mt-2 text-2xl font-extrabold text-gray-900">
              Rp {state.payment.totalFee.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Step 1 Summary */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Step 1 - Kuota Dipilih</div>
            <div className="text-sm text-gray-600 mt-1">
              Total kuota atlet: <b>{step1.totalAthleteQuota}</b> | Official: <b>{step1.totalOfficialQuota}</b>
            </div>
          </div>
          <Link
            href="/dashboard/pendaftaran"
            className="px-4 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50 text-sm"
          >
            Edit Step 1
          </Link>
        </div>

        {step1.rows.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">Belum ada kuota yang diisi.</div>
        ) : (
          <div className="mt-4 space-y-2">
            {step1.rows.map((r, idx) => (
              <div key={idx} className="rounded-xl border p-4 flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-gray-900">{r.sportName}</div>
                  <div className="text-xs text-gray-600 mt-1">{r.categoryName}</div>
                </div>
                <Badge text={`Kuota: ${r.quota}`} variant="gray" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2 Summary */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Step 2 - Atlet</div>
            <div className="text-sm text-gray-600 mt-1">
              Total atlet terisi: <b>{step3.totalAthletes}</b> / <b>{step1.totalAthleteQuota}</b>
            </div>
          </div>

          <Link
            href="/dashboard/pendaftaran/atlet"
            className={`px-4 py-2 rounded-xl font-extrabold text-sm ${
              canAccessAthleteFlow
                ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105"
                : "bg-gray-200 text-gray-600 cursor-not-allowed"
            }`}
            onClick={(e) => {
              if (!canAccessAthleteFlow) {
                e.preventDefault()
                alert("Step 2 terkunci karena pembayaran sudah diajukan.")
              }
            }}
          >
            Buka Step 2
          </Link>
        </div>

        {!canAccessAthleteFlow && (
          <div className="mt-4 text-sm text-gray-600">
            Step 2 terkunci karena pembayaran sudah diajukan.
          </div>
        )}

        {canAccessAthleteFlow && step3.rows.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">Belum ada atlet diinput.</div>
        ) : canAccessAthleteFlow ? (
          <div className="mt-4 space-y-2">
            {step3.rows.map((r, idx) => {
              const ok = r.filled >= r.quota
              return (
                <div key={idx} className="rounded-xl border p-4 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-gray-900">{r.sportName}</div>
                    <div className="text-xs text-gray-600 mt-1">{r.categoryName}</div>
                  </div>
                  <Badge text={`${r.filled} / ${r.quota}`} variant={ok ? "green" : "yellow"} />
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      {/* Step 3 Summary */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Step 3 - Pembayaran</div>
            <div className="text-sm text-gray-600 mt-1">
              Status pembayaran saat ini: <b>{paymentStatus}</b>
            </div>
          </div>

          <Link
            href="/dashboard/pembayaran"
            className="px-4 py-2 rounded-xl font-extrabold text-sm bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105"
          >
            Buka Step 3
          </Link>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Status</div>
            <div className="mt-2">{paymentBadge}</div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Bukti</div>
            <div className="mt-2 text-sm text-gray-900 font-bold">
              {state.payment.proofFileName ?? "-"}
            </div>
          </div>

          <div className="rounded-xl border p-4">
            <div className="text-xs text-gray-500">Upload</div>
            <div className="mt-2 text-sm text-gray-900 font-bold">
              {formatISO(state.payment.uploadedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Step 4 Summary */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Step 4 - Dokumen</div>
            <div className="text-sm text-gray-600 mt-1">
              Total dokumen terupload: <b>{step4.totalUploaded}</b> / <b>{step4.totalDocsNeeded}</b>
            </div>
          </div>

          <Link
            href="/dashboard/pendaftaran/dokumen"
            className={`px-4 py-2 rounded-xl font-extrabold text-sm ${
              canAccessDocumentFlow
                ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105"
                : "bg-gray-200 text-gray-600 cursor-not-allowed"
            }`}
            onClick={(e) => {
              if (!canAccessDocumentFlow) {
                e.preventDefault()
                alert("Step 4 hanya bisa dibuka setelah pembayaran dilakukan.")
              }
            }}
          >
            Buka Step 4
          </Link>
        </div>

        {!canAccessDocumentFlow && (
          <div className="mt-4 text-sm text-gray-600">
            Step 4 masih terkunci sampai pembayaran dilakukan.
          </div>
        )}

        {canAccessDocumentFlow && step4.rows.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">Belum ada atlet, jadi belum ada dokumen.</div>
        ) : canAccessDocumentFlow ? (
          <div className="mt-4 space-y-2">
            {step4.rows.map((r) => {
              const ok = r.uploaded >= r.total
              return (
                <div key={r.athleteId} className="rounded-xl border p-4 flex items-center justify-between">
                  <div>
                    <div className="font-extrabold text-gray-900">{r.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {r.sportId} | {r.categoryId}
                    </div>
                  </div>
                  <Badge text={`${r.uploaded}/${r.total}`} variant={ok ? "green" : "yellow"} />
                </div>
              )
            })}
          </div>
        ) : null}
      </div>

      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Email Konfirmasi Verifikasi</div>
            <div className="mt-1 text-sm text-gray-600">
              Riwayat email mock yang disiapkan otomatis saat admin memvalidasi berkas peserta atau official.
            </div>
          </div>
          <Badge text={`Total: ${verificationEmails.length}`} variant="gray" />
        </div>

        {verificationEmails.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed p-4 text-sm text-gray-500">
            Belum ada email konfirmasi verifikasi yang tercatat.
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {verificationEmails.slice(0, 8).map((email) => (
              <div key={email.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-extrabold text-gray-900">{email.subject}</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Kepada {email.recipientName} ({email.recipientEmail}) • {formatISO(email.sentAt)}
                    </div>
                  </div>
                  <Badge
                    text={email.verificationStatus}
                    variant={
                      email.verificationStatus === "Disetujui"
                        ? "green"
                        : email.verificationStatus === "Ditolak"
                        ? "red"
                        : "yellow"
                    }
                  />
                </div>

                <div className="mt-3 text-sm leading-6 text-gray-700">{email.body}</div>
                <div className="mt-2 text-sm leading-6 text-gray-600">{email.nextStep}</div>
                {email.note ? (
                  <div className="mt-3 rounded-xl border bg-gray-50 px-4 py-3 text-sm text-gray-700">
                    <b>Catatan validator:</b> {email.note}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
