import type { User } from "@/context/AuthContext"
import type {
  CreateAdminRequest,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types/api"

export type ResetTokenResult = { ok: boolean; message: string; token?: string }

export interface AuthRepository {
  login(input: LoginRequest): Promise<{ ok: boolean; message: string; data?: LoginResponse }>
  register(input: RegisterRequest): Promise<{ ok: boolean; message: string }>
  me(): Promise<{ ok: boolean; message: string; data?: User }>

  logout(): Promise<void>

  // admin/user management
  listUsers(): Promise<User[]>
  updateUserPassword(userId: string, newPassword: string): Promise<{ ok: boolean; message: string }>
  setUserActive(userId: string, active: boolean): Promise<{ ok: boolean; message: string }>
  deleteUser(userId: string): Promise<{ ok: boolean; message: string }>
  createAdmin(input: CreateAdminRequest): Promise<{ ok: boolean; message: string }>

  // forgot password flow (token dibuat backend / admin)
  generateResetToken(email: string): Promise<ResetTokenResult>
  resetPasswordWithToken(input: ResetPasswordRequest): Promise<{ ok: boolean; message: string }>
}
