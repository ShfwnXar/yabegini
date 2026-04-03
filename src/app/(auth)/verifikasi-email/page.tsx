"use client"

import Link from "next/link"
import Image from "next/image"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { eventConfig } from "@/lib/eventConfig"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Toast } from "@/components/ui/Toast"

function VerifyEmailPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { verifyEmail, requestEmailVerification } = useAuth()

  const [resolvedEmail, setResolvedEmail] = useState("")
  const [code, setCode] = useState("")
  const [latestCode, setLatestCode] = useState<string | null>(null)
  const [loadingVerify, setLoadingVerify] = useState(false)
  const [loadingResend, setLoadingResend] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null)

  useEffect(() => {
    const qEmail = (searchParams.get("email") || "").trim().toLowerCase()
    if (qEmail) {
      setResolvedEmail(qEmail)
      try {
        localStorage.setItem("mg26_pending_verify_email", qEmail)
      } catch {}
      return
    }

    try {
      const saved = (localStorage.getItem("mg26_pending_verify_email") || "").trim().toLowerCase()
      if (saved) setResolvedEmail(saved)
    } catch {}
  }, [searchParams])

  const onVerify = (e: React.FormEvent) => {
    e.preventDefault()
    if (!resolvedEmail) {
      setMessage({
        type: "error",
        text: "Email akun tidak ditemukan. Daftar ulang atau buka verifikasi dari link setelah registrasi.",
      })
      return
    }

    setLoadingVerify(true)
    setMessage(null)
    const res = verifyEmail({ email: resolvedEmail, code })
    setLoadingVerify(false)
    setMessage({ type: res.ok ? "success" : "error", text: res.message })

    if (res.ok) {
      try {
        localStorage.removeItem("mg26_pending_verify_email")
      } catch {}
      setTimeout(() => router.push("/login"), 900)
    }
  }

  const onResend = () => {
    if (!resolvedEmail) {
      setMessage({
        type: "error",
        text: "Email akun tidak ditemukan. Daftar ulang atau buka verifikasi dari link setelah registrasi.",
      })
      return
    }

    setLoadingResend(true)
    setMessage(null)
    const res = requestEmailVerification(resolvedEmail)
    setLoadingResend(false)
    setMessage({ type: res.ok ? "info" : "error", text: res.message })
    setLatestCode(res.ok && res.code ? res.code : null)
  }

  return (
    <main className="page-shell relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8 md:px-6">
      <div className="pointer-events-none absolute -top-28 -right-10 h-72 w-72 rounded-full bg-emerald-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-14 h-80 w-80 rounded-full bg-lime-200/30 blur-3xl" />

      <div className="grid w-full max-w-6xl gap-5 lg:grid-cols-[1.05fr_1fr]">
        <section className="hidden overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/65 to-emerald-100/55 p-7 shadow-[0_24px_52px_rgba(15,139,76,0.18)] lg:block">
          <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white/85 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
            Account Security
          </div>
          <h1 className="mt-3 text-3xl font-extrabold leading-tight text-gray-900">Verifikasi Email Akun Peserta</h1>

          <div className="relative mt-6 h-60 w-full">
            <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" priority />
          </div>
        </section>

        <section className="relative rounded-3xl border border-white/70 bg-white/95 p-6 shadow-[0_22px_48px_rgba(14,23,38,0.09)] backdrop-blur md:p-7">
          <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-emerald-700">
            Email Verification
          </div>
          <h2 className="mt-3 text-2xl font-extrabold text-gray-900">Menu Verifikasi Email</h2>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Peserta cukup memasukkan kode verifikasi. Email akun dibaca otomatis dari proses pendaftaran.
          </p>

          {message ? (
            <Toast
              className="mt-4"
              tone={message.type === "success" ? "success" : message.type === "error" ? "error" : "info"}
              message={message.text}
            />
          ) : null}

          {latestCode ? (
            <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
              <div className="text-xs font-bold uppercase tracking-wide text-sky-700">Mode Mock</div>
              <div className="mt-1 text-sm text-sky-900">
                Kode verifikasi terbaru:
                <span className="ml-2 rounded-md bg-white px-2 py-1 font-mono text-base font-extrabold tracking-widest text-sky-950">
                  {latestCode}
                </span>
              </div>
            </div>
          ) : null}

          <form onSubmit={onVerify} className="mt-5 space-y-4 rounded-2xl border border-gray-100 bg-white p-4 md:p-5">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Email Akun</div>
              <div className="mt-1 text-sm font-bold text-gray-900">{resolvedEmail || "Tidak ditemukan"}</div>
            </div>

            <Input
              label="Kode Verifikasi"
              placeholder="6 digit kode"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" isLoading={loadingVerify} disabled={!resolvedEmail}>
              Verifikasi Email
            </Button>
          </form>

          <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-4">
            <div className="text-sm font-bold text-gray-900">Tidak menerima kode?</div>
            <div className="mt-1 text-xs text-gray-600">Klik kirim ulang untuk membuat kode verifikasi baru.</div>
            <Button type="button" variant="secondary" className="mt-3 w-full" onClick={onResend} isLoading={loadingResend} disabled={!resolvedEmail}>
              Kirim Ulang Kode
            </Button>
          </div>

          <div className="mt-5 space-y-1 text-sm text-gray-700">
            <p>Sudah terverifikasi? <Link href="/login" className="font-bold text-emerald-700 hover:underline">Login sekarang</Link></p>
            <p>Belum punya akun? <Link href="/daftar" className="font-bold text-emerald-700 hover:underline">Daftar di sini</Link></p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  )
}
