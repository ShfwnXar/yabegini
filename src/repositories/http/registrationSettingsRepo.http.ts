import { ENV } from "@/config/env"
import { http } from "@/lib/http"
import type { RegistrationSettings } from "@/lib/registrationSettings"
import type {
  GetRegistrationSettingsResponse,
  SaveRegistrationSettingsRequest,
} from "@/types/api"
import type { RegistrationSettingsRepository } from "@/repositories/registrationSettingsRepo"

function toUrl(path: string) {
  if (ENV.API_BASE_URL) return `${ENV.API_BASE_URL}${path}`
  return path
}

export class HttpRegistrationSettingsRepo implements RegistrationSettingsRepository {
  async getSettings(): Promise<RegistrationSettings> {
    return http<GetRegistrationSettingsResponse>(toUrl("/registration-settings"))
  }

  async saveSettings(settings: RegistrationSettings): Promise<RegistrationSettings> {
    return http<RegistrationSettings>(toUrl("/registration-settings"), {
      method: "PUT",
      body: settings satisfies SaveRegistrationSettingsRequest,
    })
  }
}
