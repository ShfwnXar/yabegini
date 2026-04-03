"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRegistration } from "@/context/RegistrationContext"
import { useRegistrationSettings } from "@/hooks/useRegistrationSettings"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import {
  getRegistrationStepSetting,
  getRegistrationStepStatus,
  type RegistrationStepKey,
} from "@/lib/registrationSettings"

function isActive(pathname: string, href: string) {
  if (pathname === href) return true
  return pathname.startsWith(href + "/")
}

function paymentTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "APPROVED") return "success"
  if (status === "PENDING") return "warning"
  if (status === "REJECTED") return "danger"
  return "neutral"
}

function getCurrentStepKey(pathname: string): RegistrationStepKey | null {
  if (pathname === "/dashboard/pendaftaran") return "step1"
  if (pathname.startsWith("/dashboard/pendaftaran/atlet")) return "step2"
  if (pathname.startsWith("/dashboard/pendaftaran/dokumen")) return "step4"
  return null
}

function formatWindow(startDate: string, endDate: string) {
  return `${startDate} s.d. ${endDate}`
}

function getStepNote(stepStatus: ReturnType<typeof getRegistrationStepStatus>, openNote: string) {
  if (stepStatus.isOpen) return openNote
  return `${stepStatus.statusLabel} (${formatWindow(stepStatus.startDate, stepStatus.endDate)})`
}

function Stepper() {
  const pathname = usePathname()
  const { user } = useAuth()
  const { state, hydrateReady, ensureDraftRegistration, activeRegistrationId } = useRegistration()
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const { settings, isReady } = useRegistrationSettings()

  if (!hydrateReady || !isReady) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Pendaftaran</CardTitle>
          <CardDescription>Memuat data pendaftaran...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-gray-600">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  const isLocked = state.payment.status === "PENDING" || state.payment.status === "APPROVED"
  const hasSubmittedPayment = state.payment.status === "PENDING" || state.payment.status === "APPROVED"
  const step1Status = getRegistrationStepStatus(getRegistrationStepSetting("step1", settings))
  const step2Status = getRegistrationStepStatus(getRegistrationStepSetting("step2", settings))
  const step3Status = getRegistrationStepStatus(getRegistrationStepSetting("step3", settings))
  const step4Status = getRegistrationStepStatus(getRegistrationStepSetting("step4", settings))

  const handleSave = async () => {
    setSaveMessage(null)
    if (!user) {
      setSaveMessage({ type: "error", text: "Sesi user tidak ditemukan. Silakan login ulang." })
      return
    }

    try {
      const hadDraft = !!activeRegistrationId
      let draftId = activeRegistrationId
      if (state.sports.length > 0) {
        draftId = await ensureDraftRegistration(state.sports.map((sport) => sport.id))
      }
      localStorage.setItem(`mg26_registration_${user.id}`, JSON.stringify(state))
      setSaveMessage({
        type: "success",
        text: draftId && hadDraft ? "Draft pendaftaran berhasil disimpan." : "Draft pendaftaran berhasil dibuat dan disimpan.",
      })
    } catch {
      setSaveMessage({ type: "error", text: "Gagal menyimpan draft pendaftaran." })
    }
  }

  const steps = [
    {
      key: "step1" as const,
      label: "Step 1 - Pilih Cabor",
      href: "/dashboard/pendaftaran",
      note: step1Status.isOpen
        ? (isLocked ? "Terkunci karena pembayaran sudah diajukan/diverifikasi" : "Buka sesuai jadwal")
        : getStepNote(step1Status, "Buka sesuai jadwal"),
      disabled: !step1Status.isOpen,
    },
    {
      key: "step2" as const,
      label: "Step 2 - Input Atlet + Kategori",
      href: "/dashboard/pendaftaran/atlet",
      note: getStepNote(step2Status, "Pilih kategori per atlet sesuai kuota"),
      disabled: !step2Status.isOpen,
    },
    {
      key: "step3" as const,
      label: "Step 3 - Pembayaran",
      href: "/dashboard/pembayaran",
      note: getStepNote(step3Status, "Upload bukti pembayaran"),
      disabled: !step3Status.isOpen,
    },
    {
      key: "step4" as const,
      label: "Step 4 - Upload Dokumen Atlet",
      href: "/dashboard/pendaftaran/dokumen",
      note: getStepNote(step4Status, "Upload 5 dokumen per atlet"),
      disabled: !step4Status.isOpen || !hasSubmittedPayment,
    },
  ]

  return (
    <Card variant="soft">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-gray-500 tracking-wider">
              PENDAFTARAN
            </div>
            <CardTitle className="mt-1">Alur Pendaftaran (Step 1-4)</CardTitle>
            <CardDescription className="mt-2">
              Step 4 terbuka setelah bukti pembayaran dikirim dan jadwal step dari admin sedang aktif.
            </CardDescription>

            <div className="mt-3 flex flex-wrap gap-2 items-center">
              <Badge tone={paymentTone(state.payment.status)}>
                Payment: {state.payment.status}
              </Badge>
              {isLocked && <Badge tone="warning">Step 1 terkunci untuk edit</Badge>}
              <Badge tone="info">
                Total: Rp {state.payment.totalFee.toLocaleString("id-ID")}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="primary" size="sm" onClick={handleSave}>
              Simpan Draft
            </Button>
            <Link href="/dashboard">
              <Button variant="secondary" size="sm">
                Kembali
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {saveMessage && (
          <div className={[
            "mb-4 rounded-2xl border px-4 py-3 text-sm font-semibold",
            saveMessage.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800",
          ].join(" ")}>
            {saveMessage.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {steps.map((s) => {
            const active = isActive(pathname, s.href)
            const scheduleClosed = (s.key === "step1" && !step1Status.isOpen) || (s.key === "step2" && !step2Status.isOpen) || (s.key === "step3" && !step3Status.isOpen) || (s.key === "step4" && !step4Status.isOpen)

            return (
              <Link
                key={s.href}
                href={s.disabled ? "#" : s.href}
                onClick={(e) => {
                  if (s.disabled) {
                    e.preventDefault()
                    if (scheduleClosed) {
                      const status = s.key === "step1"
                        ? step1Status
                        : s.key === "step2"
                        ? step2Status
                        : s.key === "step3"
                        ? step3Status
                        : step4Status
                      alert(status.closedMessage)
                      return
                    }
                    alert("Step ini hanya bisa dibuka setelah pembayaran dilakukan.")
                  }
                }}
                className={[
                  "rounded-2xl border p-4 transition-all",
                  "bg-white/70 backdrop-blur",
                  active
                    ? "border-emerald-200 shadow-[0_12px_40px_rgba(16,185,129,0.12)]"
                    : "border-gray-200 hover:border-emerald-150 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]",
                  s.disabled ? "opacity-60 cursor-not-allowed" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-extrabold text-gray-900">
                    {s.label}
                  </div>
                  {active ? <Badge tone="brand">Aktif</Badge> : null}
                </div>

                <div className="mt-2 text-xs text-gray-600">{s.note}</div>

                {s.disabled && (
                  <div className="mt-2 text-xs text-amber-700 font-semibold">
                    {scheduleClosed ? `Terkunci oleh jadwal admin (${s.key === "step1"
                      ? step1Status.statusLabel
                      : s.key === "step2"
                      ? step2Status.statusLabel
                      : s.key === "step3"
                      ? step3Status.statusLabel
                      : step4Status.statusLabel})` : "Terkunci sampai pembayaran dilakukan"}
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Catatan: Setelah upload bukti bayar, status akan <b>PENDING</b> sampai admin memverifikasi. Step 4 sudah bisa dibuka setelah bukti pembayaran dikirim.
        </div>
      </CardContent>
    </Card>
  )
}

export default function PendaftaranLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const currentStepKey = useMemo(() => getCurrentStepKey(pathname), [pathname])
  const { settings, isReady } = useRegistrationSettings()
  const currentStepStatus = currentStepKey ? getRegistrationStepStatus(getRegistrationStepSetting(currentStepKey, settings)) : null

  return (
    <div className="space-y-6">
      <Stepper />
      {isReady && currentStepStatus && !currentStepStatus.isOpen ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <div className="font-extrabold text-amber-950">{currentStepStatus.label} - {currentStepStatus.statusLabel}</div>
          <div className="mt-1">{currentStepStatus.closedMessage}</div>
          <div className="mt-2 text-xs text-amber-800">
            Jadwal aktif: {formatWindow(currentStepStatus.startDate, currentStepStatus.endDate)}.
          </div>
        </div>
      ) : children}
    </div>
  )
}
