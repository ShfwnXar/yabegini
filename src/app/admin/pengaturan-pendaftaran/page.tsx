"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { useRegistrationSettings } from "@/hooks/useRegistrationSettings"
import {
  getRegistrationStepStatus,
  readRegistrationSettings,
  REGISTRATION_STEP_ORDER,
  type RegistrationSettings,
  type RegistrationStepKey,
  writeRegistrationSettings,
} from "@/lib/registrationSettings"

function formatDateRange(startDate: string, endDate: string) {
  return `${startDate} s.d. ${endDate}`
}

export default function PengaturanPendaftaranPage() {
  const { user } = useAuth()
  const { saveSettings } = useRegistrationSettings()
  const [settings, setSettings] = useState<RegistrationSettings>(() => readRegistrationSettings())
  const [messageByStep, setMessageByStep] = useState<Partial<Record<RegistrationStepKey, string>>>({})

  const stepStatuses = useMemo(() => {
    return REGISTRATION_STEP_ORDER.map((stepKey) => getRegistrationStepStatus(settings.steps[stepKey]))
  }, [settings])

  if (!user || user.role !== "SUPER_ADMIN") return null

  const updateStepField = (stepKey: RegistrationStepKey, field: "startDate" | "endDate", value: string) => {
    setSettings((prev) => ({
      steps: {
        ...prev.steps,
        [stepKey]: {
          ...prev.steps[stepKey],
          [field]: value,
        },
      },
    }))
    setMessageByStep((prev) => ({ ...prev, [stepKey]: "" }))
  }

  const saveStep = async (stepKey: RegistrationStepKey) => {
    const step = settings.steps[stepKey]
    if (!step.startDate || !step.endDate) {
      setMessageByStep((prev) => ({ ...prev, [stepKey]: "Start date dan end date wajib diisi." }))
      return
    }

    if (step.startDate > step.endDate) {
      setMessageByStep((prev) => ({ ...prev, [stepKey]: "Start date tidak boleh melebihi end date." }))
      return
    }

    const nextSettings: RegistrationSettings = {
      steps: {
        ...settings.steps,
        [stepKey]: {
          ...step,
          updatedAt: new Date().toISOString(),
          updatedBy: user.email,
        },
      },
    }

    try {
      const saved = await saveSettings(nextSettings)
      writeRegistrationSettings(saved)
      setSettings(saved)
      setMessageByStep((prev) => ({ ...prev, [stepKey]: "Konfigurasi step berhasil disimpan." }))
    } catch {
      setMessageByStep((prev) => ({ ...prev, [stepKey]: "Gagal menyimpan konfigurasi step." }))
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Pengaturan Jadwal Step Pendaftaran</h1>
        <p className="mt-2 text-gray-600">
          Admin bisa mengatur tanggal buka dan tutup untuk setiap step. Sistem akan otomatis membuka step saat tanggal hari ini berada di dalam rentang tersebut.
        </p>
      </div>

      <div className="grid gap-4">
        {stepStatuses.map((step) => (
          <div key={step.key} className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">{step.label}</h2>
                <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className={`inline-flex rounded-full px-3 py-1 ${step.isOpen ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {step.statusLabel}
                  </span>
                  <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                    {formatDateRange(step.startDate, step.endDate)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-gray-500 md:text-right">
                <div>Path: {step.path}</div>
                <div>Update terakhir: {step.updatedAt ? new Date(step.updatedAt).toLocaleString("id-ID") : "-"}</div>
                <div>Oleh: {step.updatedBy ?? "-"}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">Start date</label>
                <input
                  type="date"
                  value={settings.steps[step.key].startDate}
                  onChange={(e) => updateStepField(step.key, "startDate", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-semibold text-gray-700">End date</label>
                <input
                  type="date"
                  value={settings.steps[step.key].endDate}
                  onChange={(e) => updateStepField(step.key, "endDate", e.target.value)}
                  className="w-full rounded-xl border px-3 py-2"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="text-xs text-gray-500">
                Step ini otomatis aktif hanya saat tanggal hari ini berada di antara start date dan end date.
              </div>
              <button
                onClick={() => void saveStep(step.key)}
                className="rounded-lg bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
              >
                Simpan
              </button>
            </div>

            {messageByStep[step.key] ? (
              <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${messageByStep[step.key] === "Konfigurasi step berhasil disimpan." ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
                {messageByStep[step.key]}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}
