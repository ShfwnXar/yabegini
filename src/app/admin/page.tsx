"use client"

import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { useEffect, useState } from "react"

const LS_PAYMENT_STATUS_KEY = "mg26_mock_payment_status"
const LS_DOCS_STATUS_KEY = "mg26_mock_docs_status"
const LS_FINAL_VALID_KEY = "mg26_mock_final_valid"

export default function AdminHomePage() {
  const { user } = useAuth()

  const [paymentStatus, setPaymentStatus] = useState("NONE")
  const [docsStatus, setDocsStatus] = useState("NONE")
  const [finalValid, setFinalValid] = useState(false)

  useEffect(() => {
    setPaymentStatus(localStorage.getItem(LS_PAYMENT_STATUS_KEY) ?? "NONE")
    setDocsStatus(localStorage.getItem(LS_DOCS_STATUS_KEY) ?? "NONE")
    setFinalValid(localStorage.getItem(LS_FINAL_VALID_KEY) === "true")
  }, [])

  if (!user) return null

  return (
    <div className="max-w-5xl space-y-6">
      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">Panel admin untuk validasi pembayaran, validasi berkas, berita, pemenang, statistik, dan export data.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Status Pembayaran (mock)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{paymentStatus}</div>
          <p className="mt-2 text-xs text-gray-500">Ubah status di menu Validasi Pembayaran.</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Status Dokumen (mock)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{docsStatus}</div>
          <p className="mt-2 text-xs text-gray-500">Tinjau, revisi, setujui, atau tolak dokumen di menu Validasi Dokumen.</p>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Final Valid (mock)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{finalValid ? "YA" : "BELUM"}</div>
          <p className="mt-2 text-xs text-gray-500">Otomatis YA jika semua dokumen Disetujui.</p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Aksi Cepat</h2>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <Link href="/admin/pembayaran" className="rounded-lg bg-green-600 px-4 py-2 text-center font-semibold text-white hover:bg-green-700">Validasi Pembayaran</Link>
          <Link href="/admin/dokumen" className="rounded-lg border border-emerald-200 px-4 py-2 text-center font-semibold text-gray-700 hover:bg-emerald-50">Validasi Dokumen</Link>
          {user.role === "SUPER_ADMIN" && <Link href="/admin/pengaturan-pendaftaran" className="rounded-lg border border-emerald-200 px-4 py-2 text-center font-semibold text-gray-700 hover:bg-emerald-50">Jadwal Step Pendaftaran</Link>}
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Ringkasan Role</h2>
        <ul className="mt-3 space-y-1 text-sm text-gray-700">
          <li><b>ADMIN</b>: validasi pembayaran dan dokumen semua cabor.</li>
          <li><b>ADMIN_CABOR</b>: validasi sesuai cabor yang ditugaskan.</li>
          <li><b>SUPER_ADMIN</b>: kelola akun admin dan validasi semua data.</li>
        </ul>
      </div>
    </div>
  )
}

