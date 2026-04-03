"use client"

import Image from "next/image"
import React, { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { InstitutionType, useAuth } from "@/context/AuthContext"
import { eventConfig } from "@/lib/eventConfig"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { Toast } from "@/components/ui/Toast"

export default function DaftarPage() {
  const { register } = useAuth()
  const router = useRouter()

  const [form, setForm] = useState({
    institutionName: "",
    institutionType: "SMA_MA" as InstitutionType,
    originProvince: "",
    originRegion: "",
    address: "",
    picName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const institutionTypeOptions = useMemo(() => [
    { value: "SD_MI", label: "SD/MI" },
    { value: "SMP_MTS", label: "SMP/MTS" },
    { value: "SMA_MA", label: "SMA/MA" },
    { value: "UNIVERSITAS_PTMA", label: "Universitas/PTMA" },
    { value: "PIMPINAN_WILAYAH_MUHAMMADIYAH", label: "Pimpinan Wilayah Muhammadiyah" },
    { value: "PIMPINAN_DAERAH_MUHAMMADIYAH", label: "Pimpinan Daerah Muhammadiyah" },
    { value: "PIMPINAN_RANTING", label: "Pimpinan Ranting" },
    { value: "PIMPINAN_CABANG", label: "Pimpinan Cabang Muhammadiyah" },
  ], [])

  const setField = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const res = await register({
      institutionName: form.institutionName,
      institutionType: form.institutionType,
      originProvince: form.originProvince,
      originRegion: form.originRegion,
      address: form.address,
      picName: form.picName,
      email: form.email,
      phone: form.phone,
      password: form.password,
      confirmPassword: form.confirmPassword,
    })

    setLoading(false)
    setMessage({ type: res.ok ? "success" : "error", text: res.message })
    if (res.ok) {
      const normalizedEmail = form.email.trim().toLowerCase()
      try {
        localStorage.setItem("mg26_pending_verify_email", normalizedEmail)
      } catch {}
      const email = encodeURIComponent(normalizedEmail)
      setTimeout(() => router.push(`/verifikasi-email?email=${email}`), 900)
    }
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center px-4 py-8 md:py-10">
      <div className="grid w-full max-w-6xl gap-5 lg:grid-cols-[1fr_1.2fr]">
        <section className="hidden overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-emerald-100/50 p-6 shadow-[0_24px_48px_rgba(15,139,76,0.14)] lg:block">
          <div className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Kontingen Onboarding</div>
          <h1 className="mt-3 text-3xl font-extrabold text-gray-900">Buat Akun Kontingen</h1>
          <p className="mt-2 text-sm text-gray-600">Daftarkan instansi dan siapkan seluruh kebutuhan pendaftaran Muhammadiyah Games 2026.</p>
          <div className="relative mt-6 h-72 w-full">
            <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" priority />
          </div>
        </section>

        <section className="surface-card w-full p-6 md:p-8">
          <h2 className="text-2xl font-extrabold text-gray-900">Form Registrasi</h2>
          <p className="mt-2 text-sm text-gray-600">Akun ini digunakan untuk mendaftarkan kontingen pada Muhammadiyah Games 2026.</p>

          {message ? <Toast className="mt-4" tone={message.type === "success" ? "success" : "error"} message={message.text} /> : null}

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Input label="Nama Instansi" placeholder="Contoh: SMA Muhammadiyah 1" value={form.institutionName} onChange={(e) => setField("institutionName", e.target.value)} />

            <Select label="Jenis Instansi" value={form.institutionType} onChange={(e) => setField("institutionType", e.target.value as InstitutionType)} hint="Gunakan jenis instansi yang paling sesuai.">
              {institutionTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Asal Pimpinan Wilayah" placeholder="Contoh: PWM Jawa Tengah" value={form.originProvince} onChange={(e) => setField("originProvince", e.target.value)} />
              <Input label="Asal Pimpinan Daerah" placeholder="Contoh: PDM Kota Surakarta" value={form.originRegion} onChange={(e) => setField("originRegion", e.target.value)} />
            </div>

            <Textarea label="Alamat Instansi" placeholder="Alamat lengkap instansi" className="min-h-[90px]" value={form.address} onChange={(e) => setField("address", e.target.value)} />
            <Input label="Nama PIC (Penanggung Jawab)" placeholder="Nama penanggung jawab kontingen" value={form.picName} onChange={(e) => setField("picName", e.target.value)} />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input type="email" label="Email" placeholder="email@contoh.com" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              <Input label="No HP / WA" placeholder="08xxxxxxxxxx" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input type="password" label="Password" placeholder="Minimal 6 karakter" value={form.password} onChange={(e) => setField("password", e.target.value)} />
              <Input type="password" label="Konfirmasi Password" value={form.confirmPassword} onChange={(e) => setField("confirmPassword", e.target.value)} />
            </div>

            <Button type="submit" className="mt-2 w-full" isLoading={loading}>Buat Akun</Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">Sudah punya akun? <Link href="/login" className="font-bold text-emerald-700 hover:underline">Login di sini</Link></p>
          <p className="mt-2 text-center text-sm text-gray-600">Belum verifikasi email? <Link href="/verifikasi-email" className="font-bold text-emerald-700 hover:underline">Verifikasi di sini</Link></p>
        </section>
      </div>
    </main>
  )
}
