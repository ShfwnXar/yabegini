import type { RegistrationSettings } from "@/lib/registrationSettings"

export interface RegistrationSettingsRepository {
  getSettings(): Promise<RegistrationSettings>
  saveSettings(settings: RegistrationSettings): Promise<RegistrationSettings>
}
