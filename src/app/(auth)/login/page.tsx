"use client"

import Image from "next/image"
import { useAuth } from "@/context/AuthContext"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { ENV } from "@/config/env"
import { eventConfig } from "@/lib/eventConfig"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Toast } from "@/components/ui/Toast"

export default function LoginPage() {
  const { login, requestPasswordReset, resetPasswordWithToken, isAuthenticated, user } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<"LOGIN" | "FORGOT">("LOGIN")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const [form, setForm] = useState({ email: "", password: "" })
  const [fpEmail, setFpEmail] = useState("")
  const [fpToken, setFpToken] = useState("")
  const [fpNewPass, setFpNewPass] = useState("")
  const [fpConfirm, setFpConfirm] = useState("")
  const [sentResetToken, setSentResetToken] = useState<string | null>(null)
  const forgotPasswordModeLabel = ENV.USE_MOCK
    ? "Lupa password berjalan penuh dalam mode mock lokal."
    : "Reset password email backend belum tersedia, jadi bagian ini sementara masih memakai mode mock lokal."

  const switchMode = (nextMode: "LOGIN" | "FORGOT") => {
    setMode(nextMode)
    setMessage(null)
    if (nextMode === "LOGIN") {
      setSentResetToken(null)
    }
  }

  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace(user.role === "PESERTA" ? "/dashboard" : "/admin")
    }
  }, [isAuthenticated, user, router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    const res = await login(form)
    setLoading(false)
    setMessage({ type: res.ok ? "success" : "error", text: res.message })
  }

  return (
    <main className="page-shell flex min-h-screen items-center justify-center p-4 md:p-6">
      <div className="grid w-full max-w-5xl gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="hidden overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/60 to-emerald-100/50 p-6 shadow-[0_24px_48px_rgba(15,139,76,0.14)] lg:block">
          <div className="inline-flex rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Portal Access</div>
          <h1 className="mt-3 text-3xl font-extrabold text-gray-900">Masuk ke Sistem MG2026</h1>
          <p className="mt-2 text-sm text-gray-600">Kelola pendaftaran kontingen, pembayaran, dan dokumen dari satu dashboard terpadu.</p>
          <div className="relative mt-6 h-72 w-full">
            <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" priority />
          </div>
        </section>

        <section className="surface-card w-full p-6 md:p-7">
          <h2 className="text-2xl font-extrabold text-gray-900">{mode === "LOGIN" ? "Login Akun" : "Lupa Password"}</h2>
          <p className="mt-1 text-sm text-gray-600">
            {mode === "LOGIN" ? "Masuk untuk melanjutkan pendaftaran Muhammadiyah Games 2026." : "Masukkan email, kirim kode reset, lalu atur password baru Anda."}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border bg-gray-50 p-1">
            <button type="button" onClick={() => switchMode("LOGIN")} className={mode === "LOGIN" ? "rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-emerald-800 shadow" : "rounded-lg px-3 py-2 text-sm font-bold text-gray-600"}>Login</button>
            <button type="button" onClick={() => switchMode("FORGOT")} className={mode === "FORGOT" ? "rounded-lg bg-white px-3 py-2 text-sm font-extrabold text-emerald-800 shadow" : "rounded-lg px-3 py-2 text-sm font-bold text-gray-600"}>Lupa Password</button>
          </div>

          {message ? <Toast className="mt-4" tone={message.type === "success" ? "success" : "error"} message={message.text} /> : null}

          {mode === "LOGIN" ? (
            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <Input type="email" label="Email" placeholder="email@contoh.com" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} required />
              <Input type="password" label="Password" placeholder="Masukkan password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} required />
              <Button type="submit" className="w-full" isLoading={loading}>Login</Button>
            </form>
          ) : (
            <div className="mt-5 space-y-3">
              <p className="text-sm text-gray-600">{forgotPasswordModeLabel}</p>
              <Input placeholder="Email" value={fpEmail} onChange={(e) => setFpEmail(e.target.value)} />
              <Button className="w-full" variant="secondary" onClick={() => {
                const res = requestPasswordReset(fpEmail)
                setMessage({ type: res.ok ? "success" : "error", text: res.message })
                setSentResetToken(res.ok ? res.token ?? null : null)
              }}>
                Kirim Kode Reset
              </Button>
              {sentResetToken ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  <b>Mode mock:</b> kode reset terbaru adalah <span className="font-extrabold tracking-[0.2em]">{sentResetToken}</span>
                </div>
              ) : null}
              <Input placeholder="Kode Reset (6 digit)" value={fpToken} onChange={(e) => setFpToken(e.target.value)} />
              <Input type="password" placeholder="Password Baru" value={fpNewPass} onChange={(e) => setFpNewPass(e.target.value)} />
              <Input type="password" placeholder="Konfirmasi Password" value={fpConfirm} onChange={(e) => setFpConfirm(e.target.value)} />
              <Button className="w-full" onClick={() => {
                const res = resetPasswordWithToken({ email: fpEmail, token: fpToken, newPassword: fpNewPass, confirmPassword: fpConfirm })
                setMessage({ type: res.ok ? "success" : "error", text: res.message })
                if (res.ok) {
                  switchMode("LOGIN")
                  setFpEmail("")
                  setFpToken("")
                  setFpNewPass("")
                  setFpConfirm("")
                  setSentResetToken(null)
                }
              }}>Reset Password</Button>
            </div>
          )}

          <p className="mt-5 text-sm text-gray-700">Belum punya akun? <Link href="/daftar" className="font-bold text-emerald-700 hover:underline">Daftar di sini</Link></p>
          <p className="mt-1 text-sm text-gray-700">Belum verifikasi email? <Link href="/verifikasi-email" className="font-bold text-emerald-700 hover:underline">Buka menu verifikasi</Link></p>
        </section>
      </div>
    </main>
  )
}
