"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"

type NavItem = {
  label: string
  href: string
  roles?: Array<"PESERTA" | "ADMIN" | "ADMIN_CABOR" | "SUPER_ADMIN">
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  if (pathname === href) return true
  // active untuk subroutes
  return pathname.startsWith(href + "/")
}

export default function AppShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = useMemo<NavItem[]>(() => {
    const items: NavItem[] = [
      // Publik
      { label: "Landing", href: "/" },
      { label: "Download", href: "/download" },
      { label: "Berita", href: "/berita" },
      { label: "Pengumuman", href: "/pengumuman" },
      { label: "Peringkat", href: "/peringkat" },
      { label: "Statistik", href: "/statistik" },

      // Peserta
      { label: "Dashboard Peserta", href: "/dashboard", roles: ["PESERTA"] },
      { label: "Profil", href: "/dashboard/profile", roles: ["PESERTA"] },
      { label: "Pendaftaran (Step 1–4)", href: "/dashboard/pendaftaran", roles: ["PESERTA"] },

      // Admin
      { label: "Dashboard Admin", href: "/admin", roles: ["ADMIN", "ADMIN_CABOR", "SUPER_ADMIN"] },
      { label: "Validasi Pembayaran", href: "/admin/pembayaran", roles: ["ADMIN", "ADMIN_CABOR", "SUPER_ADMIN"] },
      { label: "Validasi Dokumen", href: "/admin/dokumen", roles: ["ADMIN", "ADMIN_CABOR", "SUPER_ADMIN"] },
      { label: "Pemenang / Medali", href: "/admin/pemenang", roles: ["ADMIN", "SUPER_ADMIN"] },
      { label: "Berita & Pengumuman", href: "/admin/berita", roles: ["ADMIN", "SUPER_ADMIN"] },
      { label: "Upload File Download", href: "/admin/download", roles: ["ADMIN", "SUPER_ADMIN"] },
      { label: "Export Data (CSV)", href: "/admin/export", roles: ["ADMIN", "SUPER_ADMIN"] },
    ]

    // filter by role (kalau roles undefined => public)
    if (!user) {
      return items.filter((i) => !i.roles) // hanya publik jika belum login
    }

    return items.filter((i) => {
      if (!i.roles) return true
      return i.roles.includes(user.role)
    })
  }, [user])

  const onLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* SIDEBAR */}
        <aside
          className={`sticky top-0 h-screen bg-white border-r shadow-sm ${
            collapsed ? "w-20" : "w-72"
          } hidden md:flex flex-col`}
        >
          <div className="p-4 border-b flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-extrabold text-green-700 truncate">
                {collapsed ? "MG26" : "Muhammadiyah Games 2026"}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user ? `Role: ${user.role}` : "Publik"}
              </div>
            </div>

            <button
              onClick={() => setCollapsed((v) => !v)}
              className="px-2 py-1 rounded-lg border text-xs font-semibold hover:bg-gray-50"
              title="Collapse sidebar"
            >
              {collapsed ? ">" : "<"}
            </button>
          </div>

          <nav className="p-3 overflow-y-auto">
            <div className="space-y-1">
              {navItems.map((item) => {
                const active = isActivePath(pathname, item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${
                        active ? "bg-green-600" : "bg-gray-300"
                      }`}
                    />
                    <span className={`${collapsed ? "hidden" : "block"} truncate`}>
                      {item.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User Card */}
          <div className="mt-auto p-4 border-t">
            {user ? (
              <div className="rounded-xl border bg-gray-50 p-3">
                <div className={`text-xs text-gray-500 ${collapsed ? "hidden" : "block"}`}>
                  Login sebagai:
                </div>
                <div className={`font-bold text-gray-900 truncate ${collapsed ? "hidden" : "block"}`}>
                  {user.institutionName}
                </div>
                <div className={`text-xs text-gray-600 truncate ${collapsed ? "hidden" : "block"}`}>
                  {user.email}
                </div>

                <button
                  onClick={onLogout}
                  className={`mt-3 w-full px-3 py-2 rounded-lg bg-white border font-semibold hover:bg-gray-100 ${
                    collapsed ? "hidden" : "block"
                  }`}
                >
                  Logout
                </button>

                {collapsed && (
                  <button
                    onClick={onLogout}
                    className="mt-2 w-full px-2 py-2 rounded-lg bg-white border font-semibold hover:bg-gray-100 text-xs"
                    title="Logout"
                  >
                    ⎋
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border bg-gray-50 p-3 text-sm text-gray-600">
                <div className={`${collapsed ? "hidden" : "block"}`}>
                  Anda belum login.
                </div>
                <Link
                  href="/login"
                  className={`mt-2 inline-block px-3 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 ${
                    collapsed ? "hidden" : "inline-block"
                  }`}
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN */}
        <main className="flex-1 min-w-0">
          {/* TOPBAR */}
          <div className="sticky top-0 z-30 bg-white border-b shadow-sm">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs text-gray-500">Muhammadiyah Games 2026</div>
                <div className="text-lg md:text-xl font-extrabold text-gray-900 truncate">
                  {title}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {user && (
                  <>
                    <div className="hidden sm:block text-right">
                      <div className="text-xs text-gray-500">Akun</div>
                      <div className="text-sm font-bold text-gray-900 truncate max-w-[240px]">
                        {user.institutionName}
                      </div>
                    </div>
                    <button
                      onClick={onLogout}
                      className="px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-black"
                    >
                      Logout
                    </button>
                  </>
                )}
                {!user && (
                  <Link
                    href="/login"
                    className="px-4 py-2 rounded-xl bg-green-600 text-white font-semibold hover:bg-green-700"
                  >
                    Login
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-white border rounded-2xl shadow-sm p-5 md:p-7">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
