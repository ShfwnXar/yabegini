"use client"

import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Slidebar } from "@/components/ui/dashboard/Slidebar"
import { Topbar } from "@/components/ui/dashboard/Topbar"
import { Badge } from "@/components/ui/Badge"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    if (user && user.role === "PESERTA") {
      router.replace("/dashboard")
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || !user) {
    return <div className="min-h-screen grid place-items-center text-gray-600">Memuat...</div>
  }

  const isSuperAdmin = user.role === "SUPER_ADMIN"
  const isAdminCabor = user.role === "ADMIN_CABOR"
  const canSeeDownloads = user.role === "ADMIN" || user.role === "SUPER_ADMIN"

  const menu = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/pembayaran", label: "Validasi Pembayaran" },
    { href: "/admin/dokumen", label: "Validasi Dokumen" },
    { href: "/admin/statistik", label: "Statistik" },
    ...(!isAdminCabor ? [{ href: "/admin/pemenang", label: "Pemenang & Peringkat" }] : []),
    ...(!isAdminCabor ? [{ href: "/admin/berita", label: "Berita & Pengumuman" }] : []),
    ...(canSeeDownloads ? [{ href: "/admin/downloads", label: "Panel Download" }] : []),
    ...(!isAdminCabor ? [{ href: "/admin/export", label: "Download Data" }] : []),
    ...(isSuperAdmin ? [{ href: "/admin/kelola-admin", label: "Kelola Akun" }] : []),
    ...(isSuperAdmin ? [{ href: "/admin/pengaturan-pendaftaran", label: "Jadwal Step Pendaftaran" }] : []),
  ]

  const currentLabel = menu.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"))?.label ?? "Admin"

  return (
    <div className="page-shell">
      <div className="mx-auto flex w-full max-w-[1700px]">
        <Slidebar
          title="Muhammadiyah Games"
          subtitle="Admin Panel"
          items={menu}
          pathname={pathname}
          footer={
            <div className="space-y-3">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                <div className="text-sm font-extrabold text-gray-900">{user.picName}</div>
                <div className="mt-1 text-xs text-gray-600">Role: {user.role}</div>
                <div className="mt-1 text-xs text-gray-600 truncate">{user.email}</div>
              </div>
              <Button
                variant="danger"
                className="w-full"
                onClick={async () => {
                  await logout()
                  router.replace("/login")
                }}
              >
                Logout
              </Button>
            </div>
          }
        />

        <div className="min-w-0 flex-1">
          <Topbar
            eyebrow="Admin Workspace"
            title={currentLabel}
            right={<Badge tone="neutral" className="hidden sm:inline-flex">{user.role}</Badge>}
          />

          <div className="border-b border-gray-200 bg-white/70 px-4 py-3 md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {menu.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "menu-link menu-link-active whitespace-nowrap" : "menu-link whitespace-nowrap bg-white"}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <main className="px-4 py-5 md:px-8 md:py-6">
            <div className="surface-card p-4 md:p-6">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}


