"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useRegistration } from "@/context/RegistrationContext"

function canOpenExtraRequest(userId?: string) {
  if (!userId || typeof window === "undefined") return false
  try {
    const raw = localStorage.getItem(`mg26_registration_${userId}`)
    if (!raw) return false
    const registration = JSON.parse(raw) as { payment?: { status?: string } }
    return registration.payment?.status === "APPROVED"
  } catch {
    return false
  }
}

export default function DashboardHomePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { registrationSummaries, openRegistration, deleteRegistration, activeRegistrationId } = useRegistration()

  if (!user) return null
  const canRequestExtra = canOpenExtraRequest(user.id)

  const registrationSummary = {
    statusLabel: "Belum Memulai Pendaftaran",
    statusBadge: "bg-gray-200 text-gray-800",
    totalAthletes: 0,
    totalFee: 0,
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/60 p-6 shadow-[0_14px_28px_rgba(15,139,76,0.1)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
              Dashboard Peserta
            </div>
            <h1 className="mt-3 text-2xl font-bold text-gray-900">
              Selamat datang, {user.institutionName}
            </h1>
            <p className="mt-1 text-gray-600">
              Akun kontingen untuk Muhammadiyah Games 2026.
            </p>

            <div className="mt-3 space-y-1 text-sm text-gray-700">
              <div>
                <span className="font-semibold">PIC:</span> {user.picName}
              </div>
              <div>
                <span className="font-semibold">Kontak:</span> {user.email} - {user.phone}
              </div>
              <div>
                <span className="font-semibold">Alamat:</span> {user.address}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/profile"
              className="rounded-lg border border-emerald-200 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-emerald-50"
            >
              Edit Profile
            </Link>

            <Link
              href="/dashboard/pendaftaran"
              className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700"
            >
              Mulai Pendaftaran
            </Link>


            {canRequestExtra ? (
              <Link
                href="/dashboard/tambah-peserta"
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 font-semibold text-amber-800 hover:bg-amber-100"
              >
                Tambah Peserta
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Status Pendaftaran</div>
          <div className="mt-2">
            <span className={`inline-block rounded px-3 py-1 ${registrationSummary.statusBadge}`}>
              {registrationSummary.statusLabel}
            </span>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Status akan berubah sesuai progres Step 1-4 dan validasi admin.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Total Atlet (rencana)</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{registrationSummary.totalAthletes}</div>
          <p className="mt-2 text-xs text-gray-500">
            Diisi pada Step 1 (kuota per kategori).
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-gray-600">Estimasi Total Biaya</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            Rp {registrationSummary.totalFee.toLocaleString()}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            150rb/atlet, official gratis, voli 1,5jt/tim.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-emerald-100 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">Aksi Cepat</h2>
        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <Link
            href="/dashboard/pendaftaran"
            className="rounded-lg bg-green-600 px-4 py-2 text-center font-semibold text-white hover:bg-green-700"
          >
            Buka Step Pendaftaran
          </Link>

          <Link
            href="/dashboard/status"
            className="rounded-lg border border-emerald-200 px-4 py-2 text-center font-semibold text-gray-700 hover:bg-emerald-50"
          >
            Lihat Status
          </Link>
        </div>

      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-gray-900">Daftar Registrasi</h2>
          {activeRegistrationId ? <div className="text-xs font-semibold text-emerald-700">Draft aktif: {activeRegistrationId}</div> : null}
        </div>
        {registrationSummaries.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">Belum ada draft/backend registration. Mulai dari menu pendaftaran untuk membuat draft baru.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {registrationSummaries.map((registration) => (
              <div key={registration.id} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-bold text-gray-900">{registration.title}</div>
                  <div className="mt-1 text-xs text-gray-500">ID: {registration.id} | Status: {registration.status}</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await openRegistration(registration.id)
                        router.push("/dashboard/pendaftaran")
                      } catch (error) {
                        window.alert(error instanceof Error ? error.message : "Gagal membuka detail registrasi.")
                      }
                    }}
                    className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-800 hover:bg-emerald-100"
                  >
                    Buka Detail
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = window.confirm("Hapus draft registrasi ini?")
                      if (!ok) return
                      try {
                        await deleteRegistration(registration.id)
                      } catch (error) {
                        window.alert(error instanceof Error ? error.message : "Gagal menghapus registrasi.")
                      }
                    }}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 font-semibold text-rose-800 hover:bg-rose-100"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


