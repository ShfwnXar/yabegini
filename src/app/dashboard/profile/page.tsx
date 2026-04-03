"use client"

import { useAuth, InstitutionType } from "@/context/AuthContext"
import { useEffect, useMemo, useState } from "react"

const LS_PAYMENT_STATUS_KEY = "mg26_mock_payment_status"

type PaymentStatus = "NONE" | "PENDING" | "APPROVED"

function fieldClass(disabled?: boolean) {
  return `w-full rounded-xl border px-3 py-2.5 text-sm ${disabled ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-white"}`
}

export default function ProfilePage() {
  const { user, getAllUsers } = useAuth()

  const [form, setForm] = useState({
    institutionName: "",
    institutionType: "SMA_MA" as InstitutionType,
    originProvince: "",
    originRegion: "",
    address: "",
    picName: "",
    email: "",
    phone: "",
  })

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("NONE")

  useEffect(() => {
    if (!user) return

    setForm({
      institutionName: user.institutionName,
      institutionType: user.institutionType,
      originProvince: user.originProvince ?? "",
      originRegion: user.originRegion ?? "",
      address: user.address,
      picName: user.picName,
      email: user.email,
      phone: user.phone,
    })

    const storedStatus =
      (localStorage.getItem(LS_PAYMENT_STATUS_KEY) as PaymentStatus | null) ?? "NONE"

    setPaymentStatus(storedStatus)
  }, [user])

  const isLocked = paymentStatus === "PENDING" || paymentStatus === "APPROVED"

  const institutionTypeOptions = useMemo(
    () => [
      { value: "SD_MI", label: "SD/MI" },
      { value: "SMP_MTS", label: "SMP/MTS" },
      { value: "SMA_MA", label: "SMA/MA" },
      { value: "UNIVERSITAS_PTMA", label: "Universitas/PTMA" },
      { value: "PIMPINAN_WILAYAH_MUHAMMADIYAH", label: "Pimpinan Wilayah Muhammadiyah" },
      { value: "PIMPINAN_DAERAH_MUHAMMADIYAH", label: "Pimpinan Daerah Muhammadiyah" },
      { value: "PIMPINAN_RANTING", label: "Pimpinan Ranting" },
      { value: "PIMPINAN_CABANG", label: "Pimpinan Cabang Muhammadiyah" },
    ] as const,
    []
  )

  const handleSaveProfile = () => {
    setError(null)
    setMessage(null)

    if (!form.picName || !form.email || !form.phone) {
      setError("Nama PIC, email, dan nomor HP wajib diisi.")
      return
    }

    const users = getAllUsers()
    const updatedUsers = users.map((u) =>
      u.id === user?.id
        ? {
            ...u,
            institutionName: isLocked ? u.institutionName : form.institutionName,
            institutionType: isLocked ? u.institutionType : form.institutionType,
            originProvince: form.originProvince.trim() || undefined,
            originRegion: form.originRegion.trim() || undefined,
            address: form.address,
            picName: form.picName,
            email: form.email,
            phone: form.phone,
          }
        : u
    )

    localStorage.setItem("mg26_users", JSON.stringify(updatedUsers))
    setMessage("Profil berhasil diperbarui.")
  }

  const handleChangePassword = () => {
    setError(null)
    setMessage(null)

    if (passwordForm.newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.")
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Konfirmasi password tidak sama.")
      return
    }

    const users = getAllUsers()
    const currentUser = users.find((u) => u.id === user?.id)

    if (!currentUser) return

    if (currentUser.password !== passwordForm.oldPassword) {
      setError("Password lama salah.")
      return
    }

    const updatedUsers = users.map((u) =>
      u.id === user?.id ? { ...u, password: passwordForm.newPassword } : u
    )

    localStorage.setItem("mg26_users", JSON.stringify(updatedUsers))
    setMessage("Password berhasil diperbarui.")
    setPasswordForm({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    })
  }

  if (!user) return null

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/70 p-6 shadow-[0_14px_26px_rgba(15,139,76,0.1)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100/70 px-3 py-1 text-xs font-bold text-emerald-800">
              Pengaturan Akun Kontingen
            </div>
            <h1 className="mt-3 text-2xl font-extrabold text-gray-900 md:text-3xl">Profil Kontingen</h1>
            <p className="mt-2 text-sm text-gray-600">Perbarui data instansi, PIC, dan keamanan akun Anda.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Status Pembayaran</div>
              <div className="mt-1 font-extrabold text-gray-900">{paymentStatus}</div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-white px-3 py-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-gray-500">Role</div>
              <div className="mt-1 font-extrabold text-gray-900">{user.role}</div>
            </div>
          </div>
        </div>
      </div>

      {isLocked && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Nama instansi dan jenis instansi terkunci karena pembayaran sudah diajukan atau disetujui.
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-lg font-extrabold text-gray-900">Data Instansi & PIC</h2>
          <p className="mt-1 text-sm text-gray-600">Pastikan data PIC aktif untuk komunikasi validasi pendaftaran.</p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-bold text-gray-800">Nama Instansi</label>
              <input
                value={form.institutionName}
                disabled={isLocked}
                onChange={(e) => setForm({ ...form, institutionName: e.target.value })}
                className={fieldClass(isLocked)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-800">Jenis Instansi</label>
              <select
                value={form.institutionType}
                disabled={isLocked}
                onChange={(e) =>
                  setForm({
                    ...form,
                    institutionType: e.target.value as InstitutionType,
                  })
                }
                className={fieldClass(isLocked)}
              >
                {institutionTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-800">Nama PIC</label>
              <input
                value={form.picName}
                onChange={(e) => setForm({ ...form, picName: e.target.value })}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-800">Asal Pimpinan Wilayah</label>
              <input
                value={form.originProvince}
                onChange={(e) => setForm({ ...form, originProvince: e.target.value })}
                className={fieldClass()}
                placeholder="Contoh: PWM Jawa Tengah"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-800">Asal Pimpinan Daerah</label>
              <input
                value={form.originRegion}
                onChange={(e) => setForm({ ...form, originRegion: e.target.value })}
                className={fieldClass()}
                placeholder="Contoh: PDM Kota Surakarta"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-bold text-gray-800">Alamat</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={fieldClass() + " min-h-[88px]"}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-800">Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-bold text-gray-800">No HP / WA</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={fieldClass()}
              />
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              onClick={handleSaveProfile}
              className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-extrabold text-white hover:bg-green-700"
            >
              Simpan Perubahan Profil
            </button>
          </div>
        </section>

        <aside className="rounded-2xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-extrabold text-gray-900">Info Akun</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="rounded-xl border bg-gray-50 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Nama Instansi</div>
              <div className="mt-1 font-semibold text-gray-900">{user.institutionName}</div>
            </div>
            <div className="rounded-xl border bg-gray-50 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">PIC</div>
              <div className="mt-1 font-semibold text-gray-900">{user.picName}</div>
            </div>
            <div className="rounded-xl border bg-gray-50 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Asal Pimpinan Wilayah</div>
              <div className="mt-1 font-semibold text-gray-900">{user.originProvince || "-"}</div>
            </div>
            <div className="rounded-xl border bg-gray-50 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Asal Pimpinan Daerah</div>
              <div className="mt-1 font-semibold text-gray-900">{user.originRegion || "-"}</div>
            </div>
            <div className="rounded-xl border bg-gray-50 px-3 py-2">
              <div className="text-xs font-bold uppercase tracking-[0.1em] text-gray-500">Email Login</div>
              <div className="mt-1 break-all font-semibold text-gray-900">{user.email}</div>
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-extrabold text-gray-900">Keamanan Akun</h2>
        <p className="mt-1 text-sm text-gray-600">Gunakan password minimal 6 karakter untuk menjaga akses akun kontingen.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-800">Password Lama</label>
            <input
              type="password"
              value={passwordForm.oldPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              className={fieldClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-800">Password Baru</label>
            <input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              className={fieldClass()}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold text-gray-800">Konfirmasi Password Baru</label>
            <input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirmPassword: e.target.value,
                })
              }
              className={fieldClass()}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleChangePassword}
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-2.5 text-sm font-extrabold text-emerald-800 hover:bg-emerald-100"
          >
            Update Password
          </button>
        </div>
      </section>
    </div>
  )
}
