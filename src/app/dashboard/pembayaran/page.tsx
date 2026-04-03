"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRegistration } from "@/context/RegistrationContext"
import type { RegistrationState as DraftRegistrationState } from "@/context/RegistrationContext"
import { useAuth } from "@/context/AuthContext"
import { useRegistrationSettings } from "@/hooks/useRegistrationSettings"
import { getRegistrationStepSetting, getRegistrationStepStatus } from "@/lib/registrationSettings"
import { putFileBlob } from "@/lib/fileStore" 
import { getTopUp, withExtraFlow } from "@/lib/extraAthleteFlow"
import type { Registration } from "@/types/registration"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Textarea } from "@/components/ui/Textarea"

type HybridRegistrationState = DraftRegistrationState & Partial<Registration>

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function paymentTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "APPROVED") return "success"
  if (status === "PENDING") return "warning"
  if (status === "REJECTED") return "danger"
  return "neutral"
}

function formatISO(iso?: string) {
  if (!iso) return "-"
  try {
    return new Date(iso).toLocaleString("id-ID")
  } catch {
    return iso
  }
}

export default function Step3PembayaranPage() {
  const { user } = useAuth()
  const { state, hydrateReady, setPaymentProof, dispatch } = useRegistration()
  const { settings, isReady } = useRegistrationSettings()

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [note, setNote] = useState<string>("")
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null)
  const [selectedTopUpFile, setSelectedTopUpFile] = useState<File | null>(null)
  const [isSubmittingTopUp, setIsSubmittingTopUp] = useState(false)
  const [isSubmittingProof, setIsSubmittingProof] = useState(false)
  const hybridState = state as HybridRegistrationState
  const step3Status = getRegistrationStepStatus(getRegistrationStepSetting("step3", settings))

  useEffect(() => {
    setNote(state.payment.note ?? "")
  }, [state.payment.note])
  const selectedSportsCount = state.sports.length
  const topUp = getTopUp(hybridState)


  const canUpload = useMemo(() => {
    if (!step3Status.isOpen) return false
    // harus pilih minimal 1 cabor dulu
    if (selectedSportsCount === 0) return false
    // jika sudah APPROVED, peserta tidak perlu upload ulang
    if (state.payment.status === "APPROVED") return false

    return true
  }, [selectedSportsCount, state.payment.status, step3Status.isOpen])

  const canUploadTopUp = step3Status.isOpen && topUp.additionalAthletes > 0 && (topUp.status === "REQUIRED" || topUp.status === "REJECTED")

  const onPickProof = (file: File | null) => {
    if (!file) {
      setSelectedProofFile(null)
      return
    }
    setMsg(null)

    if (selectedSportsCount === 0) {
      setMsg({ type: "error", text: "Pilih minimal 1 cabor di Step 1 sebelum upload bukti pembayaran." })
      setSelectedProofFile(null)
      return
    }

    const maxMB = 5
    if (file.size > maxMB * 1024 * 1024) {
      setMsg({ type: "error", text: "Ukuran file terlalu besar. Maks " + maxMB + "MB." })
      setSelectedProofFile(null)
      return
    }

    setSelectedProofFile(file)
  }

  const onSubmitProof = async () => {
    if (!selectedProofFile || !canUpload) return

    setMsg(null)
    setIsSubmittingProof(true)
    try {
      const fileId = "pay_user_" + Date.now() + "_" + Math.random().toString(16).slice(2)
      await putFileBlob(fileId, selectedProofFile)
      setPaymentProof(fileId, selectedProofFile.name, selectedProofFile.type || "application/octet-stream")
      setSelectedProofFile(null)
      setMsg({
        type: "success",

        text: "Bukti pembayaran tersimpan. Status berubah menjadi PENDING (menunggu verifikasi admin).",
      })
    } catch (e) {
      console.error(e)
      setMsg({ type: "error", text: "Gagal menyimpan bukti pembayaran. Coba ulangi." })
    } finally {
      setIsSubmittingProof(false)
    }
  }

  const onSubmitTopUp = async () => {
    if (!selectedTopUpFile || !canUploadTopUp) return

    setMsg(null)
    setIsSubmittingTopUp(true)
    try {
      const fileId = "topup_user_" + Date.now() + "_" + Math.random().toString(16).slice(2)
      await putFileBlob(fileId, selectedTopUpFile)
      const updated = withExtraFlow({
        ...hybridState,
        status: "TOP_UP_PENDING",
        topUpPayment: {
          ...hybridState.topUpPayment,
          status: "PENDING",
          additionalAthletes: topUp.additionalAthletes,
          additionalFee: topUp.additionalFee,
          proofFileId: fileId,
          proofFileName: selectedTopUpFile.name,
          proofMimeType: selectedTopUpFile.type || "application/octet-stream",
          uploadedAt: new Date().toISOString(),
          note: hybridState.topUpPayment?.note,
        },
      })
      dispatch({ type: "LOAD", payload: updated as DraftRegistrationState })
      setSelectedTopUpFile(null)
      setMsg({ type: "success", text: "Bukti top-up tersimpan. Menunggu verifikasi admin." })
      setMsg({ type: "success", text: "Bukti top-up tersimpan. Menunggu verifikasi admin." })
    } catch (e) {
      console.error(e)
      setMsg({ type: "error", text: "Gagal menyimpan bukti top-up. Coba ulangi." })
    } finally {
      setIsSubmittingTopUp(false)
    }
  }

  const onPickTopUp = (file: File | null) => {
    if (!file) {
      setSelectedTopUpFile(null)
      return
    }
    setMsg(null)
    const maxMB = 5
    if (file.size > maxMB * 1024 * 1024) {
      setMsg({ type: "error", text: "Ukuran file terlalu besar. Maks " + maxMB + "MB." })
      setSelectedTopUpFile(null)
      return
    }
    setSelectedTopUpFile(file)
  }

  if (!hydrateReady || !isReady) {
    return (
      <div className="max-w-5xl">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Step 3 - Pembayaran</CardTitle>
            <CardDescription>Memuat data pembayaran...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!step3Status.isOpen) {
    return (
      <div className="max-w-5xl space-y-6">
        <Card variant="soft">
          <CardHeader>
            <CardTitle>Step 3 - Pembayaran</CardTitle>
            <CardDescription>Status saat ini: {step3Status.statusLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <div className="font-extrabold text-amber-950">{step3Status.closedMessage}</div>
              <div className="mt-2 text-xs text-amber-800">
                Jadwal aktif: {step3Status.startDate} - {step3Status.endDate}
              </div>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <Link href="/dashboard/pendaftaran">
                <Button variant="secondary">Kembali ke Step 1</Button>
              </Link>
              <Link href="/dashboard/status">
                <Button variant="primary">Lihat Status</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <Card variant="soft">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold text-gray-500 tracking-wider">STEP 3</div>
              <CardTitle className="mt-1">Pembayaran & Upload Bukti Transfer</CardTitle>
              <CardDescription className="mt-2">
                Transfer dilakukan manual, lalu upload bukti pembayaran. Admin akan memverifikasi.
              </CardDescription>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <Badge tone={paymentTone(state.payment.status)}>
                  Payment: {state.payment.status}
                </Badge>
                <Badge tone="info">Total: Rp {state.payment.totalFee.toLocaleString("id-ID")}</Badge>
                <Badge tone="neutral">Cabor dipilih: {selectedSportsCount}</Badge>
                <Badge tone={step3Status.isOpen ? "success" : "danger"}>Jadwal Step 3: {step3Status.startDate} - {step3Status.endDate}</Badge>
              </div>

              {state.payment.status === "REJECTED" && state.payment.note && (
                <div className="mt-3 text-sm text-rose-800">
                  <b>Catatan Admin:</b> {state.payment.note}
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 min-w-[320px]">
              <div className="text-xs text-gray-500">Navigasi</div>
              <div className="mt-2 flex flex-col gap-2">
                <Button variant="primary" className="w-full" onClick={() => {
                  if (!user) return setMsg({ type: "error", text: "Sesi user tidak ditemukan. Silakan login ulang." })
                  try { localStorage.setItem(`mg26_registration_${user.id}`, JSON.stringify(state)); setMsg({ type: "success", text: "Data Step 3 berhasil disimpan." }) }
                  catch { setMsg({ type: "error", text: "Gagal menyimpan data Step 3." }) }
                }}>
                  Simpan Step 3
                </Button>
                <Link href="/dashboard/pendaftaran/atlet">
                  <Button variant="secondary" className="w-full">
                    Kembali Step 2
                  </Button>
                </Link>
                <Link href="/dashboard/pendaftaran/dokumen">
                  <Button variant="secondary" className="w-full">
                    Ke Step 4
                  </Button>
                </Link>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Step 4 akan terbuka setelah bukti pembayaran berhasil dikirim.
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {msg && (
        <div
          className={cx(
            "rounded-2xl border p-4 text-sm font-semibold",
            msg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}
        >
          {msg.text}
        </div>
      )}

      {/* Rekening + Instruksi */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="glass" className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Rekening Tujuan</CardTitle>
            <CardDescription>Silakan transfer sesuai total biaya berikut.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-2xl border bg-white p-5">
              <div className="text-xs text-gray-500">Nomor Rekening</div>
              <div className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">4000444338</div>
              <div className="mt-1 text-sm text-gray-700 font-semibold">a.n. LPO PP Muhammadiyah BSI</div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-2xl border bg-gradient-to-br from-white to-emerald-50/60 p-4">
                  <div className="text-xs text-gray-500">Total yang harus ditransfer</div>
                  <div className="mt-1 text-xl font-extrabold">Rp {state.payment.totalFee.toLocaleString("id-ID")}</div>
                  <div className="mt-1 text-xs text-gray-500">Atlet 150rb/orang, Official gratis, Voli 1,5jt/tim.</div>
                </div>

                <div className="rounded-2xl border bg-gradient-to-br from-white to-sky-50/60 p-4">
                  <div className="text-xs text-gray-500">Status pembayaran</div>
                  <div className="mt-2">
                    <Badge tone={paymentTone(state.payment.status)}>{state.payment.status}</Badge>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Upload bukti -&gt; <b>PENDING</b> -&gt; Admin verifikasi -&gt; <b>APPROVED/REJECTED</b>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-sm text-gray-700">
                <b>Catatan:</b> Gunakan berita transfer yang jelas (misal: nama instansi / kontingen) agar admin mudah memverifikasi.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="soft">
          <CardHeader>
            <CardTitle>Upload Bukti</CardTitle>
            <CardDescription>Format JPG/PNG/PDF (maks 5MB).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs text-gray-500">File terakhir</div>
              <div className="mt-1 text-sm font-extrabold text-gray-900">{state.payment.proofFileName ?? "-"}</div>
              <div className="mt-1 text-xs text-gray-600">
                Upload: <b>{formatISO(state.payment.uploadedAt)}</b>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-500 mb-2">Pilih file bukti</div>
              <input
                type="file"
                accept="image/*,application/pdf"
                disabled={!canUpload || isSubmittingProof}
                onChange={(e) => onPickProof(e.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm"
              />
              <div className="mt-2 text-xs text-gray-600">
                File dipilih: <b>{selectedProofFile?.name ?? "-"}</b>
              </div>
              <div className="mt-3">
                <Button
                  variant="primary"
                  className="w-full"
                  disabled={!canUpload || !selectedProofFile || isSubmittingProof}
                  onClick={onSubmitProof}
                >
                  {isSubmittingProof ? "Menyimpan..." : "Submit Bukti Pembayaran"}
                </Button>
              </div>
              {!canUpload && (
                <div className="mt-2 text-xs text-gray-500">
                  {selectedSportsCount === 0
                    ? "Pilih cabor dulu di Step 1."
                    : state.payment.status === "APPROVED"
                    ? "Sudah APPROVED. Tidak perlu upload ulang."
                    : "Upload dinonaktifkan."}
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-amber-50/60 p-4">
              <div className="text-xs text-gray-500">Top-up tambahan atlet</div>
              <div className="mt-1 text-sm font-extrabold text-gray-900">Status: {topUp.status} | Atlet: {topUp.additionalAthletes} | Nominal: Rp {topUp.additionalFee.toLocaleString("id-ID")}</div>
              <input type="file" accept="image/*,application/pdf" disabled={!canUploadTopUp || isSubmittingTopUp} onChange={(e) => onPickTopUp(e.target.files?.[0] ?? null)} className="mt-3 w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm" />
              <div className="mt-2 text-xs text-gray-600">File top-up dipilih: <b>{selectedTopUpFile?.name ?? "-"}</b></div>
              <Button variant="primary" className="mt-3 w-full" disabled={!canUploadTopUp || !selectedTopUpFile || isSubmittingTopUp} onClick={onSubmitTopUp}>
                {isSubmittingTopUp ? "Menyimpan Top-up..." : "Submit Bukti Top-up"}
              </Button>
            </div>
            <Textarea
              label="Catatan Peserta (opsional)"
              value={note}
              onChange={(e) => { const value = e.target.value; setNote(value); dispatch({ type: "SET_PAYMENT_STATUS", status: state.payment.status, note: value.trim() ? value.trim() : undefined }) }}
              placeholder="Contoh: Transfer dari rekening ... / Nominal ..."
            />

            <Link href="/dashboard/status">
              <Button variant="secondary" className="w-full">
                Lihat Status
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}








