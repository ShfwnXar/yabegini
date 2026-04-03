import { DEFAULT_ADMIN_CABOR_ACCOUNTS } from "@/data/defaultAdminCabor"

const LS_USERS_KEY = "mg26_users"

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export type ManagedAccount = {
  id: string
  role: string
  institutionName?: string
  picName: string
  email: string
  phone?: string
  password?: string
  isActive?: boolean
  assignedSportIds?: string[]
}

export function getStoredUsers(): ManagedAccount[] {
  if (typeof window === "undefined") return []
  return safeParse<ManagedAccount[]>(localStorage.getItem(LS_USERS_KEY), [])
}

export function saveStoredUsers(users: ManagedAccount[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(LS_USERS_KEY, JSON.stringify(users))
}

export function ensureDefaultAdminCaborAccounts() {
  const users = getStoredUsers()
  const missing = DEFAULT_ADMIN_CABOR_ACCOUNTS.filter((admin) => !users.some((item) => item.email.toLowerCase() === admin.email.toLowerCase()))
  if (missing.length === 0) return false

  const createdAt = new Date().toISOString()
  const generated = missing.map((admin, index) => ({
    id: `u_seed_${Date.now()}_${index}`,
    role: "ADMIN_CABOR",
    institutionName: "Panitia Muhammadiyah Games",
    institutionType: "PIMPINAN_CABANG",
    address: "-",
    picName: admin.picName,
    email: admin.email,
    phone: "0000000000",
    password: admin.password,
    isActive: true,
    assignedSportIds: [admin.sportId],
    createdAt,
  }))

  saveStoredUsers([...generated, ...users])
  return true
}