import {
  DEFAULT_REGISTRATION_SETTINGS,
  REGISTRATION_SETTINGS_KEY,
  REGISTRATION_SETTINGS_UPDATED_EVENT,
  type RegistrationSettings,
} from "@/lib/registrationSettings"
import type { RegistrationSettingsRepository } from "@/repositories/registrationSettingsRepo"

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function cloneSettings(settings: RegistrationSettings): RegistrationSettings {
  return JSON.parse(JSON.stringify(settings)) as RegistrationSettings
}

export class MockRegistrationSettingsRepo implements RegistrationSettingsRepository {
  async getSettings(): Promise<RegistrationSettings> {
    const saved = safeParse<RegistrationSettings | null>(localStorage.getItem(REGISTRATION_SETTINGS_KEY), null)
    return cloneSettings(saved ?? DEFAULT_REGISTRATION_SETTINGS)
  }

  async saveSettings(settings: RegistrationSettings): Promise<RegistrationSettings> {
    localStorage.setItem(REGISTRATION_SETTINGS_KEY, JSON.stringify(settings))
    window.dispatchEvent(new CustomEvent(REGISTRATION_SETTINGS_UPDATED_EVENT, { detail: settings }))
    return cloneSettings(settings)
  }
}
