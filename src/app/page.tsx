"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useMemo, useState } from "react"
import { eventConfig } from "@/lib/eventConfig"

function Countdown({ targetISO }: { targetISO: string }) {
  const target = useMemo(() => new Date(targetISO).getTime(), [targetISO])
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const diff = now === null ? 0 : Math.max(0, target - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  const started = now !== null && target - now <= 0

  const cells = [
    { label: "Hari", value: days },
    { label: "Jam", value: hours },
    { label: "Menit", value: minutes },
    { label: "Detik", value: seconds },
  ]

  return (
    <div className="overflow-hidden rounded-[2rem] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/80 to-emerald-100/70 p-6 shadow-[0_24px_55px_rgba(15,139,76,0.16)] md:p-7">
      <div className="inline-flex rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
        Countdown Arena
      </div>
      <div className="mt-4 text-2xl font-black leading-tight text-gray-900 md:text-3xl">
        {now === null ? "Menghitung waktu pembukaan..." : started ? "Pertandingan sudah dimulai" : days + " hari menuju pembukaan"}
      </div>
      <div className="mt-2 text-sm text-emerald-800/80">Muhammadiyah Games 2026</div>

      {!started && (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {cells.map((cell) => (
            <div key={cell.label} className="rounded-2xl border border-white/80 bg-white/90 p-4 text-center shadow-[0_10px_24px_rgba(15,139,76,0.08)]">
              <div className="bg-gradient-to-b from-emerald-700 to-emerald-500 bg-clip-text text-3xl font-black text-transparent">
                {String(cell.value).padStart(2, "0")}
              </div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">{cell.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-emerald-100 bg-white/80 p-4 text-sm text-gray-600">
        Jadwal mulai:{" "}
        <b>{formatScheduleStart(eventConfig.tournamentStart)}</b>
      </div>
    </div>
  )
}

function formatScheduleStart(value: string) {
  const parts = new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).formatToParts(new Date(value))

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""

  return `${get("day")}/${get("month")}/${get("year")}, ${get("hour")}.${get("minute")}.${get("second")}`
}

export default function HomePage() {
  const nav = eventConfig.nav
  const [isScrolled, setIsScrolled] = useState(false)

  const portalMenu = [
    { label: "Download", href: nav.download },
    { label: "Berita", href: nav.berita },
    { label: "Pengumuman", href: nav.pengumuman },
    { label: "Peringkat", href: nav.peringkat },
    { label: "Statistik Pendaftar", href: nav.statistik },
  ]

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 120)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <div className={"min-h-screen transition-colors duration-500 " + (isScrolled ? "bg-[linear-gradient(180deg,#f5fbf7_0%,#eef8f1_50%,#f8fbf9_100%)]" : "bg-[linear-gradient(180deg,#f8fbf9_0%,#f3f8f4_100%)]")}>
      <header className={"sticky top-0 z-40 border-b border-emerald-100/80 transition-all duration-300 " + (isScrolled ? "bg-white/92 shadow-[0_18px_44px_rgba(15,36,22,0.08)] backdrop-blur-xl" : "bg-white/80 backdrop-blur-lg")}>
        <div className="mx-auto max-w-7xl px-4 py-3 md:px-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-white shadow-[0_10px_24px_rgba(15,139,76,0.12)]">
                <div className="relative h-8 w-8">
                  <Image src={eventConfig.headerLogos[0].src} alt={eventConfig.headerLogos[0].label} fill className="object-contain" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-black uppercase tracking-[0.14em] text-emerald-700 md:text-[0.82rem]">Muhammadiyah Games 2026</div>
                <div className="truncate text-xs text-gray-500 md:text-sm">Portal resmi pendaftaran kontingen</div>
              </div>
            </div>

            <nav className="hidden xl:flex xl:flex-1 xl:items-center xl:justify-center">
              <div className="portal-nav-shell">
                {portalMenu.map((item) => (
                  <Link key={item.href} href={item.href} className="portal-nav-link">
                    {item.label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="flex items-center gap-2 md:gap-3">
              <Link className="portal-auth-link hidden sm:inline-flex" href={nav.login}>Login</Link>
              <Link className="inline-flex rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(15,139,76,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(15,139,76,0.28)]" href={nav.daftar}>Daftar</Link>
            </div>
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 xl:hidden">
            {portalMenu.map((item) => (
              <Link key={item.href} href={item.href} className="portal-nav-link whitespace-nowrap">
                {item.label}
              </Link>
            ))}
            <Link className="portal-nav-link whitespace-nowrap sm:hidden" href={nav.login}>Login</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-8 pt-8 md:px-6 md:pb-12 md:pt-10">
        <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
          <div className="rounded-[2rem] border border-white/70 bg-white/88 p-6 shadow-[0_26px_60px_rgba(15,36,22,0.08)] backdrop-blur md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
              Pendaftaran Resmi
              <span className="text-emerald-700">Muhammadiyah Games 2026</span>
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] text-gray-900 md:text-5xl xl:text-6xl">
              Portal Pendaftaran Kontingen
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-8 text-gray-600 md:text-lg">
              Daftarkan sekolah atau kampus Anda untuk mengikuti Muhammadiyah Games 2026.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={nav.daftar} className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(15,139,76,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_34px_rgba(15,139,76,0.28)]">
                Daftar Kontingen
              </Link>
              <Link href={nav.berita} className="inline-flex items-center justify-center rounded-2xl border border-emerald-100 bg-white px-6 py-3.5 text-sm font-bold text-gray-700 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50/60">
                Lihat Berita & Informasi
              </Link>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Alur Jelas</div>
                <div className="mt-2 text-sm text-gray-600">Setiap tahap pendaftaran disusun per step agar mudah dipahami admin dan peserta.</div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Verifikasi Cepat</div>
                <div className="mt-2 text-sm text-gray-600">Bukti pembayaran dan dokumen atlet bisa dipantau statusnya secara lebih terstruktur.</div>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-4 shadow-sm">
                <div className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Portal Terpusat</div>
                <div className="mt-2 text-sm text-gray-600">Informasi, pengumuman, statistik, dan pendaftaran tersedia dalam satu tempat.</div>
              </div>
            </div>

            <div className="mt-8 rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/50 to-emerald-100/40 p-5 shadow-[0_16px_32px_rgba(15,139,76,0.12)] md:p-6">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Didukung Sponsor Resmi</div>
                <div className="text-[11px] text-gray-500">Partner 2026</div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                {eventConfig.sponsors.map((s) => (
                  <div key={s.id} className="group rounded-2xl border border-emerald-200/70 bg-white/85 px-3 py-3 shadow-[0_10px_22px_rgba(15,139,76,0.1)] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-[0_16px_28px_rgba(15,139,76,0.16)]">
                    <div className="relative h-12 w-full sm:h-14">
                      <Image src={s.src} alt={s.label} fill className="object-contain p-1 transition duration-300 group-hover:scale-105" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_26px_60px_rgba(15,36,22,0.08)] backdrop-blur md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">Maskot Resmi</div>
                  <div className="mt-1 text-sm text-gray-500">Identitas visual Muhammadiyah Games 2026</div>
                </div>
                <div className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">MG26</div>
              </div>
              <div className="mt-5 flex items-center justify-center rounded-[1.5rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-4">
                <div className="relative h-64 w-full md:h-80">
                  <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" priority />
                </div>
              </div>
              <div className="mt-3 text-center text-sm text-gray-500">{eventConfig.mascot.label}</div>
            </div>

            <Countdown targetISO={eventConfig.tournamentStart} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-10 md:px-6 md:pb-14">
        <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_24px_55px_rgba(15,36,22,0.08)] md:p-8 xl:p-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">4 Tahapan Utama</div>
              <h2 className="mt-2 text-2xl font-black text-gray-900 md:text-3xl">Alur pendaftaran yang sederhana dan konsisten</h2>
              <p className="mt-2 max-w-2xl text-gray-600">Setiap tahap dirancang supaya peserta bisa mengikuti proses tanpa bingung, dari pengisian kuota sampai unggah dokumen.</p>
            </div>
            <Link href={nav.daftar} className="inline-flex items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100/70">
              Mulai Pendaftaran
            </Link>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { no: "01", t: "Isi Kuota", d: "Pilih cabor dan tentukan jumlah peserta serta official yang akan didaftarkan." },
              { no: "02", t: "Input Atlet", d: "Isi data atlet, kategori, dan official sesuai kuota yang sudah dipilih." },
              { no: "03", t: "Pembayaran", d: "Transfer sesuai nominal biaya lalu unggah bukti pembayaran melalui portal." },
              { no: "04", t: "Upload Dokumen", d: "Lengkapi dokumen wajib per atlet untuk proses verifikasi admin." },
            ].map((x) => (
              <div key={x.no} className="group rounded-[1.5rem] border border-emerald-100 bg-gradient-to-b from-white to-emerald-50/45 p-5 shadow-[0_14px_26px_rgba(15,36,22,0.06)] transition hover:-translate-y-1 hover:shadow-[0_20px_32px_rgba(15,139,76,0.12)]">
                <div className="inline-flex rounded-xl bg-emerald-100 px-3 py-1 text-xs font-black tracking-[0.14em] text-emerald-700">{x.no}</div>
                <div className="mt-4 text-lg font-extrabold text-gray-900">{x.t}</div>
                <div className="mt-2 text-sm leading-7 text-gray-600">{x.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-emerald-100 bg-[linear-gradient(180deg,rgba(255,255,255,0.65)_0%,rgba(232,244,236,0.85)_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12">
          <div className="rounded-[2rem] border border-white/70 bg-white/92 p-6 shadow-[0_22px_50px_rgba(15,36,22,0.08)] md:p-8 xl:p-10">
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 shadow-sm">
                    <div className="relative h-8 w-8">
                      <Image src={eventConfig.headerLogos[0].src} alt={eventConfig.headerLogos[0].label} fill className="object-contain" />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-black uppercase tracking-[0.14em] text-emerald-700">Muhammadiyah Games 2026</div>
                    <div className="text-sm text-gray-500">Portal resmi pendaftaran</div>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-gray-600">Portal ini digunakan untuk pendaftaran kontingen, pembaruan informasi resmi, serta pemantauan proses administrasi peserta.</p>
              </div>

              <div>
                <div className="text-sm font-black uppercase tracking-[0.14em] text-gray-900">Menu Website</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {portalMenu.map((item) => (
                    <Link key={item.href} className="footer-link-pill" href={item.href}>{item.label}</Link>
                  ))}
                  <Link className="footer-link-pill" href={nav.login}>Login Peserta</Link>
                  <Link className="footer-link-pill" href={nav.daftar}>Daftar Kontingen</Link>
                </div>
              </div>

              <div>
                <div className="text-sm font-black uppercase tracking-[0.14em] text-gray-900">Informasi & Kontak</div>
                <div className="mt-4 space-y-3 text-sm text-gray-600">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="font-bold text-gray-900">{eventConfig.footer.orgLine1}</div>
                    <div className="mt-1">{eventConfig.footer.orgLine2}</div>
                  </div>
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/80 p-4">{eventConfig.footer.contactNote}</div>
                </div>
              </div>

              <div>
                <div className="text-sm font-black uppercase tracking-[0.14em] text-gray-900">Kanal Sosial & Sponsor</div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Instagram", "YouTube", "TikTok"].map((label) => (
                    <span key={label} className="inline-flex rounded-full border border-emerald-100 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 shadow-sm">{label}</span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {eventConfig.sponsors.slice(0, 6).map((s) => (
                    <div key={s.id} className="group rounded-2xl border border-emerald-100 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_12px_22px_rgba(15,139,76,0.12)]">
                      <div className="relative h-10 w-full">
                        <Image src={s.src} alt={s.label} fill className="object-contain p-1 transition duration-300 group-hover:scale-105" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 border-t border-emerald-100 pt-6 text-sm text-gray-500 md:flex-row md:items-center md:justify-between">
              <div>&copy; {new Date().getFullYear()} Muhammadiyah Games 2026. All rights reserved.</div>  
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
