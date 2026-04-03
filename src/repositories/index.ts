import type { AuthRepository } from "@/repositories/authRepo"
import type { PublicDataRepository } from "@/repositories/publicDataRepo"
import type { RegistrationRepository } from "@/repositories/registrationRepo"
import type { RegistrationSettingsRepository } from "@/repositories/registrationSettingsRepo"
import { ENV } from "@/config/env"
import { MockAuthRepo } from "@/repositories/mock/authRepo.mock"
import { MockPublicDataRepo } from "@/repositories/mock/publicDataRepo.mock"
import { MockRegistrationRepo } from "@/repositories/mock/registrationRepo.mock"
import { MockRegistrationSettingsRepo } from "@/repositories/mock/registrationSettingsRepo.mock"
import { HttpAuthRepo } from "@/repositories/http/authRepo.http"
import { HttpPublicDataRepo } from "@/repositories/http/publicDataRepo.http"
import { HttpRegistrationRepo } from "@/repositories/http/registrationRepo.http"
import { HttpRegistrationSettingsRepo } from "@/repositories/http/registrationSettingsRepo.http"

const mockAuthRepo = new MockAuthRepo()
const mockPublicDataRepo = new MockPublicDataRepo()
const mockRegistrationRepo = new MockRegistrationRepo()

export const Repos: {
  auth: AuthRepository
  publicData: PublicDataRepository
  registration: RegistrationRepository
  registrationSettings: RegistrationSettingsRepository
} = {
  auth: ENV.USE_MOCK ? mockAuthRepo : new HttpAuthRepo(mockAuthRepo),
  publicData: ENV.USE_MOCK ? mockPublicDataRepo : new HttpPublicDataRepo(),
  registration: ENV.USE_MOCK ? mockRegistrationRepo : new HttpRegistrationRepo(),
  registrationSettings: ENV.USE_MOCK ? new MockRegistrationSettingsRepo() : new HttpRegistrationSettingsRepo(),
}

