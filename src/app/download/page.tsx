"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  getDownloadBlobUrl,
  listDownloads,
  type DownloadCategory,
  type DownloadItemMeta,
} from "@/lib/downloadStore"
import { eventConfig } from "@/lib/eventConfig"

const CATEGORIES: DownloadCategory[] = ["Panduan", "Formulir", "Template", "Pengumuman", "Lainnya"]

function categoryLabel(category: DownloadCategory) {
  switch (category) {
    case "Panduan":
      return "Panduan"
    case "Formulir":
      return "Formulir"
    case "Template":
      return "Template"
    case "Pengumuman":
      return "Pengumuman"
    case "Lainnya":
      return "Lainnya"
    default:
      return category
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("id-ID")
  } catch {
    return iso
  }
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + " B"
  const kb = bytes / 1024
  if (kb < 1024) return kb.toFixed(1) + " KB"
  return (kb / 1024).toFixed(1) + " MB"
}

export default function DownloadPage() {
  const [files, setFiles] = useState<DownloadItemMeta[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  const syncFiles = useCallback(() => {
    setFiles(listDownloads())
  }, [])

  useEffect(() => {
    syncFiles()

    const handleFocus = () => syncFiles()
    const handleVisibility = () => {
      if (document.visibilityState === "visible") syncFiles()
    }

    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [syncFiles])

  const grouped = useMemo(() => {
    const groups: Record<DownloadCategory, DownloadItemMeta[]> = {
      Panduan: [],
      Formulir: [],
      Template: [],
      Pengumuman: [],
      Lainnya: [],
    }

    for (const file of files) groups[file.category].push(file)
    for (const category of CATEGORIES) {
      groups[category] = groups[category].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    }

    return groups
  }, [files])

  const handleDownload = async (file: DownloadItemMeta) => {
    setBusyId(file.id)
    try {
      const url = await getDownloadBlobUrl(file.id)
      if (!url) {
        alert("File tidak ditemukan.")
        return
      }

      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = file.fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/40 to-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-[0_20px_40px_rgba(15,139,76,0.12)] md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                Resource Center
              </div>
              <h1 className="mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">Download Center</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
                Akses semua panduan, formulir, template, dan pengumuman Muhammadiyah Games 2026 dengan tampilan yang lebih cepat dan rapi.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/" className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-emerald-50">
                  Kembali ke Landing
                </Link>
                <Link href="/pengumuman" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Lihat Pengumuman
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Official Mascot</div>
              <div className="relative mt-2 h-36 w-full md:h-44">
                <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" />
              </div>
            </div>
          </div>
        </section>

        {files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 bg-white/80 p-6 text-sm text-gray-600 shadow-sm">
            Belum ada file yang tersedia. Admin dapat mengunggah file dari panel admin.
          </div>
        ) : (
          <div className="space-y-5">
            {CATEGORIES.map((category) => (
              <section key={category} className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900">{categoryLabel(category)}</h2>

                {grouped[category].length === 0 ? (
                  <div className="mt-3 text-sm text-gray-500">Belum ada file.</div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {grouped[category].map((file) => (
                      <div
                        key={file.id}
                        className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-4 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <div className="font-semibold text-gray-900">{file.title}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {file.fileName} - {formatSize(file.size)} - {formatDate(file.createdAt)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleDownload(file)}
                          disabled={busyId === file.id}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                        >
                          {busyId === file.id ? "Memuat..." : "Download"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
