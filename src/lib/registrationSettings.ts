export type RegistrationStepKey = "step1" | "step2" | "step3" | "step4"

export type RegistrationStepSetting = {
  key: RegistrationStepKey
  label: string
  description: string
  path: string
  startDate: string
  endDate: string
  updatedAt?: string
  updatedBy?: string
}

export type RegistrationSettings = {
  steps: Record<RegistrationStepKey, RegistrationStepSetting>
}

export type RegistrationStepAvailability = "UPCOMING" | "OPEN" | "CLOSED"
export const REGISTRATION_SETTINGS_UPDATED_EVENT = "mg26:registration-settings-updated"

export const REGISTRATION_SETTINGS_KEY = "mg26_registration_settings"

export const REGISTRATION_STEP_ORDER: RegistrationStepKey[] = ["step1", "step2", "step3", "step4"]

export const DEFAULT_REGISTRATION_SETTINGS: RegistrationSettings = {
  steps: {
    step1: {
      key: "step1",
      label: "Step 1 - Pilih Cabor",
      description: "Pemilihan cabang olahraga dan jumlah peserta.",
      path: "/dashboard/pendaftaran",
      startDate: "2026-01-01",
      endDate: "2099-12-31",
    },
    step2: {
      key: "step2",
      label: "Step 2 - Input Atlet + Kategori",
      description: "Input data atlet, kategori, dan official.",
      path: "/dashboard/pendaftaran/atlet",
      startDate: "2026-01-01",
      endDate: "2099-12-31",
    },
    step3: {
      key: "step3",
      label: "Step 3 - Pembayaran",
      description: "Upload bukti pembayaran dan top-up bila diperlukan.",
      path: "/dashboard/pembayaran",
      startDate: "2026-01-01",
      endDate: "2099-12-31",
    },
    step4: {
      key: "step4",
      label: "Step 4 - Upload Dokumen Atlet",
      description: "Upload dokumen wajib untuk setiap atlet.",
      path: "/dashboard/pendaftaran/dokumen",
      startDate: "2026-01-01",
      endDate: "2099-12-31",
    },
  },
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeStepSetting(
  key: RegistrationStepKey,
  saved?: Partial<RegistrationStepSetting> | null
): RegistrationStepSetting {
  const base = DEFAULT_REGISTRATION_SETTINGS.steps[key]
  return {
    ...base,
    ...(saved ?? {}),
    key,
  }
}

function migrateLegacySettings(raw: unknown): RegistrationSettings {
  if (raw && typeof raw === "object" && "steps" in raw) {
    const savedSteps = (raw as RegistrationSettings).steps ?? {}
    return {
      steps: {
        step1: normalizeStepSetting("step1", savedSteps.step1),
        step2: normalizeStepSetting("step2", savedSteps.step2),
        step3: normalizeStepSetting("step3", savedSteps.step3),
        step4: normalizeStepSetting("step4", savedSteps.step4),
      },
    }
  }

  if (raw && typeof raw === "object" && "registrationOpen" in raw) {
    const legacyOpen = Boolean((raw as { registrationOpen?: boolean }).registrationOpen)
    if (legacyOpen) return DEFAULT_REGISTRATION_SETTINGS

    const closedDate = "2000-01-01"
    return {
      steps: {
        step1: { ...DEFAULT_REGISTRATION_SETTINGS.steps.step1, startDate: closedDate, endDate: closedDate },
        step2: { ...DEFAULT_REGISTRATION_SETTINGS.steps.step2, startDate: closedDate, endDate: closedDate },
        step3: { ...DEFAULT_REGISTRATION_SETTINGS.steps.step3, startDate: closedDate, endDate: closedDate },
        step4: { ...DEFAULT_REGISTRATION_SETTINGS.steps.step4, startDate: closedDate, endDate: closedDate },
      },
    }
  }

  return DEFAULT_REGISTRATION_SETTINGS
}

function formatLocalDate(now: Date) {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function readRegistrationSettings(): RegistrationSettings {
  if (typeof window === "undefined") return DEFAULT_REGISTRATION_SETTINGS
  const saved = safeParse<unknown>(localStorage.getItem(REGISTRATION_SETTINGS_KEY), null)
  return migrateLegacySettings(saved)
}

export function writeRegistrationSettings(settings: RegistrationSettings) {
  if (typeof window === "undefined") return
  localStorage.setItem(REGISTRATION_SETTINGS_KEY, JSON.stringify(settings))
  window.dispatchEvent(new CustomEvent(REGISTRATION_SETTINGS_UPDATED_EVENT, { detail: settings }))
}

export function isDateInRange(startDate: string, endDate: string, now = new Date()) {
  if (!startDate || !endDate) return false
  const currentDate = formatLocalDate(now)
  return startDate <= currentDate && currentDate <= endDate
}

export function getRegistrationStepAvailability(step: RegistrationStepSetting, now = new Date()): RegistrationStepAvailability {
  if (!step.startDate || !step.endDate) return "CLOSED"

  const currentDate = formatLocalDate(now)
  if (currentDate < step.startDate) return "UPCOMING"
  if (currentDate > step.endDate) return "CLOSED"
  return "OPEN"
}

export function getRegistrationStepClosedMessage(status: RegistrationStepAvailability) {
  if (status === "UPCOMING") {
    return "Tahap ini saat ini belum tersedia atau telah ditutup. Silakan cek kembali sesuai jadwal yang ditentukan. Jika Anda mengalami kendala, hubungi admin atau penyelenggara."
  }

  if (status === "CLOSED") {
    return "Step ini telah ditutup. Jika terdapat kendala atau membutuhkan bantuan, silakan hubungi admin atau penyelenggara."
  }

  return ""
}

export function getRegistrationStepStatus(step: RegistrationStepSetting, now = new Date()) {
  const availability = getRegistrationStepAvailability(step, now)
  const isOpen = availability === "OPEN"
  return {
    ...step,
    availability,
    isOpen,
    statusLabel: availability === "OPEN" ? "Dibuka" : availability === "UPCOMING" ? "Belum tersedia" : "Ditutup",
    closedMessage: getRegistrationStepClosedMessage(availability),
  }
}

export function getRegistrationStepStatuses(settings = readRegistrationSettings(), now = new Date()) {
  return REGISTRATION_STEP_ORDER.map((key) => getRegistrationStepStatus(settings.steps[key], now))
}

export function getRegistrationStepSetting(stepKey: RegistrationStepKey, settings = readRegistrationSettings()) {
  return normalizeStepSetting(stepKey, settings.steps[stepKey])
}
