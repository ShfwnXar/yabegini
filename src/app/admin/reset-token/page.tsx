"use client"

import { useAuth } from "@/context/AuthContext"
import { useState } from "react"

export default function AdminResetTokenPage() {
  const { user, generateResetToken } = useAuth()
  const [email, setEmail] = useState("")
  const [result, setResult] = useState<{ token?: string; msg?: string; type?: "ok" | "err" }>({})

  if (!user) return null
  const allowed = user.role === "ADMIN" || user.role === "ADMIN_CABOR" || user.role === "SUPER_ADMIN"
  if (!allowed) {
    return (
      <div className="max-w-4xl bg-white border rounded-xl p-6 shadow-sm">
        <div className="text-sm text-gray-600">Akses ditolak.</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-extrabold text-gray-900">Kode Reset Password Manual</h1>
        <p className="text-gray-600 mt-2">
          Halaman ini bersifat cadangan. Pengguna sekarang bisa meminta <b>kode 6 digit</b> langsung dari menu <b>Lupa Password</b>.
        </p>
      </div>

      {result.msg && (
        <div
          className={`rounded-xl border p-4 text-sm ${
            result.type === "ok"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {result.msg}
          {result.token && (
            <div className="mt-2 text-lg font-extrabold">
              KODE: <span className="tracking-widest">{result.token}</span>
            </div>
          )}
        </div>
      )}

      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-3">
        <label className="block text-sm font-extrabold text-gray-900">Email Peserta</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
          placeholder="contoh: sekolah@domain.com"
        />

        <button
          onClick={() => {
            const res = generateResetToken(email)
            if (!res.ok) {
              setResult({ msg: res.message, type: "err" })
            } else {
              setResult({ msg: "Kode reset manual berhasil dibuat.", token: res.token, type: "ok" })
              setEmail("")
            }
          }}
          className="px-5 py-2 rounded-xl bg-green-600 text-white font-extrabold hover:bg-green-700"
        >
          Buat Kode Reset
        </button>

        <div className="text-xs text-gray-500">
          *Peserta memasukkan email + kode ini pada menu “Lupa Password” di halaman login.
        </div>
      </div>
    </div>
  )
}
