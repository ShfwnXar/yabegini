"use client"

import { useAuth } from "@/context/AuthContext"
import { RegistrationProvider } from "@/context/RegistrationContext"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Slidebar } from "@/components/ui/dashboard/Slidebar"
import { Topbar } from "@/components/ui/dashboard/Topbar"
import { eventConfig } from "@/lib/eventConfig"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login")
      return
    }

    if (user && user.role !== "PESERTA") {
      router.replace("/admin")
    }
  }, [isAuthenticated, user, router])

  if (!isAuthenticated || !user) {
    return <div className="grid min-h-screen place-items-center text-gray-600">Memuat...</div>
  }

  const menu = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/pendaftaran", label: "Pendaftaran" },
    { href: "/dashboard/pembayaran", label: "Pembayaran" },
    { href: "/dashboard/status", label: "Status" },
    { href: "/dashboard/profile", label: "Profil" },
  ]

  const currentLabel = menu.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"))?.label ?? "Dashboard"

  return (
    <RegistrationProvider>
      <div className="page-shell relative">
        <div className="mx-auto flex w-full max-w-[1600px]">
          <Slidebar
            title="Muhammadiyah Games"
            subtitle="Dashboard Kontingen"
            items={menu}
            pathname={pathname}
            footer={
              <div className="space-y-3">
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
                  <div className="text-sm font-extrabold text-gray-900">{user.institutionName}</div>
                  <div className="mt-1 text-xs text-gray-600">PIC: {user.picName}</div>
                  <div className="mt-1 truncate text-xs text-gray-600">{user.email}</div>
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
              eyebrow={`Peserta - ${user.institutionType}`}
              title={currentLabel}
              right={<Badge tone="info" className="hidden sm:inline-flex">{user.email}</Badge>}
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

            <footer className="px-4 pb-6 md:px-8 md:pb-8">
              <div className="rounded-2xl border border-emerald-100 bg-white/95 p-5 shadow-sm md:p-6">
                <div className="grid grid-cols-1 gap-6 border-b border-emerald-100 pb-5 lg:grid-cols-1">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Sponsor Resmi Muhammadiyah Games</div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
                  {eventConfig.sponsors.map((sponsor) => (
                    <div key={sponsor.id} className="group rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-white to-emerald-50/35 p-3 shadow-[0_8px_18px_rgba(15,139,76,0.12)] transition hover:-translate-y-0.5 hover:border-emerald-400 hover:shadow-[0_14px_24px_rgba(15,139,76,0.18)]">
                      <div className="relative h-12 w-full">
                        <Image src={sponsor.src} alt={sponsor.label} fill className="object-contain p-1 transition duration-300 group-hover:scale-105" />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 border-t border-emerald-100 pt-4 text-xs text-gray-500">
                  (c) {new Date().getFullYear()} Muhammadiyah Games 2026
                </div>
              </div>
            </footer>
          </div>
        </div>

        <div className="mascot-float fixed bottom-4 left-4 z-30 hidden rounded-2xl border border-emerald-200 bg-white/95 p-2 shadow-[0_14px_32px_rgba(15,139,76,0.25)] backdrop-blur lg:block">
          <div className="relative h-16 w-16">
            <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" priority />
          </div>
        </div>
      </div>
    </RegistrationProvider>
  )
}

