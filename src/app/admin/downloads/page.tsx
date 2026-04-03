"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import {
  addDownload,
  getDownloadBlobUrl,
  listDownloads,
  removeDownload,
  type DownloadCategory,
  type DownloadItemMeta,
} from "@/lib/downloadStore"

const CATEGORIES: DownloadCategory[] = ["Panduan", "Formulir", "Template", "Pengumuman", "Lainnya"]

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID")
  } catch {
    return iso
  }
}

export default function AdminDownloadsPage() {
  const { user } = useAuth()

  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN"
  const [refresh, setRefresh] = useState(0)

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<DownloadCategory>("Panduan")
  const [file, setFile] = useState<File | null>(null)

  const [q, setQ] = useState("")
  const [catFilter, setCatFilter] = useState<DownloadCategory | "ALL">("ALL")

  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const allItems = useMemo(() => {
    void refresh
    return listDownloads()
  }, [refresh])

  const items = useMemo(() => {
    return allItems.filter((it) => {
      const matchCat = catFilter === "ALL" ? true : it.category === catFilter
      const matchQ = q.trim()
        ? `${it.title} ${it.fileName}`.toLowerCase().includes(q.trim().toLowerCase())
        : true
      return matchCat && matchQ
    })
  }, [allItems, q, catFilter])

  if (!user) return null

  if (!isAdmin) {
    return (
      <div className="max-w-3xl bg-white border rounded-xl p-6">
        <div className="text-lg font-bold">Akses ditolak</div>
        <div className="text-sm text-gray-600 mt-1">
          Menu ini hanya untuk <b>ADMIN</b> / <b>SUPER_ADMIN</b>.
        </div>
      </div>
    )
  }

  const resetForm = () => {
    setTitle("")
    setCategory("Panduan")
    setFile(null)
    const el = document.getElementById("adminDownloadFileInput") as HTMLInputElement | null
    if (el) el.value = ""
  }

  const handleUpload = async () => {
    setMsg(null)
    if (!title.trim()) return setMsg({ type: "error", text: "Judul wajib diisi." })
    if (!file) return setMsg({ type: "error", text: "Pilih file dulu." })

    // batas FE-only (ubah bila perlu)
    const maxMB = 10
    if (file.size > maxMB * 1024 * 1024) {
      return setMsg({ type: "error", text: `File terlalu besar. Maks ${maxMB}MB (sementara FE-only).` })
    }

    try {
      await addDownload({ title, category, file })
      resetForm()
      setRefresh((x) => x + 1)
      setMsg({ type: "success", text: "Upload berhasil. File sudah muncul di /download." })
    } catch (e: any) {
      setMsg({ type: "error", text: e?.message ?? "Gagal upload." })
    }
  }

  const handleOpen = async (it: DownloadItemMeta) => {
    setBusyId(it.id)
    try {
      const url = await getDownloadBlobUrl(it.id)
      if (!url) return alert("File tidak ditemukan.")
      window.open(url, "_blank")
    } finally {
      setBusyId(null)
    }
  }

  const handleDelete = async (it: DownloadItemMeta) => {
    if (!confirm(`Hapus file "${it.title}"?`)) return
    setBusyId(it.id)
    try {
      await removeDownload(it.id)
      setRefresh((x) => x + 1)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Panel Download</h1>
          </div>

          <div className="flex gap-2">
            <Link
              href="/download"
              className="px-4 py-2 rounded-xl border bg-white font-semibold hover:bg-gray-50"
            >
              Lihat Landing Download
            </Link>
          </div>
        </div>
      </div>

      {/* Msg */}
      {msg && (
        <div
          className={`rounded-xl border p-4 text-sm font-semibold ${
            msg.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Upload */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div className="text-lg font-bold">Upload File Baru</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="text-sm font-semibold mb-1">Judul</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Contoh: Juknis Muhammadiyah Games 2026"
            />
          </div>

          <div>
            <div className="text-sm font-semibold mb-1">Kategori</div>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DownloadCategory)}
              className="w-full border rounded-xl px-3 py-2 bg-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <div className="text-sm font-semibold mb-1">File</div>
            <input
              id="adminDownloadFileInput"
              type="file"
              className="w-full border rounded-xl px-3 py-2 bg-white"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              accept="application/pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip"
            />
            <div className="text-xs text-gray-500 mt-1">
              Saran: PDF. Maks 10MB.
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleUpload}
            className="px-5 py-2 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700"
          >
            Upload
          </button>
          <button
            onClick={resetForm}
            className="px-5 py-2 rounded-xl border bg-white font-bold hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </div>

      {/* List + Filter */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-lg font-bold">Daftar File</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-[320px]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="border rounded-xl px-3 py-2"
              placeholder="Cari judul/nama file…"
            />
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value as any)}
              className="border rounded-xl px-3 py-2 bg-white"
            >
              <option value="ALL">Semua kategori</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="text-sm text-gray-600">Belum ada file yang tersedia.</div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const busy = busyId === it.id
              return (
                <div
                  key={it.id}
                  className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <div className="font-extrabold text-gray-900">{it.title}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {it.category} • {it.fileName} • {formatSize(it.size)} • {formatDate(it.createdAt)}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">ID: {it.id}</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpen(it)}
                      disabled={busy}
                      className={`px-4 py-2 rounded-xl border font-bold ${
                        busy ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white hover:bg-gray-50"
                      }`}
                    >
                      {busy ? "Memuat..." : "Buka"}
                    </button>
                    <button
                      onClick={() => handleDelete(it)}
                      disabled={busy}
                      className={`px-4 py-2 rounded-xl font-bold ${
                        busy ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-red-50 text-red-700 hover:bg-red-100"
                      }`}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}