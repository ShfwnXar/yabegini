// src/app/admin/statistik/page.tsx
"use client"

import { useAuth } from "@/context/AuthContext"
import { useEffect, useMemo, useState } from "react"
import { DOCUMENT_FIELD_KEYS } from "@/data/documentCatalog"
import type { Registration, DocumentStatus, PaymentStatus } from "@/types/registration"

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

type DocKey = (typeof DOCUMENT_FIELD_KEYS)[number]
const DOC_KEYS: DocKey[] = DOCUMENT_FIELD_KEYS

function fmt(n: number) {
  return n.toLocaleString("id-ID")
}

function statusBadge(kind: "ok" | "warn" | "bad" | "neutral", text: string) {
  const base = "inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold border"
  const cls =
    kind === "ok"
      ? "bg-green-50 text-green-800 border-green-200"
      : kind === "warn"
      ? "bg-yellow-50 text-yellow-800 border-yellow-200"
      : kind === "bad"
      ? "bg-red-50 text-red-800 border-red-200"
      : "bg-gray-50 text-gray-800 border-gray-200"
  return <span className={`${base} ${cls}`}>{text}</span>
}

function docKind(s: DocumentStatus) {
  if (s === "Disetujui") return "ok"
  if (s === "Ditolak") return "bad"
  if (s === "Sudah upload" || s === "Perlu revisi") return "warn"
  return "neutral"
}

function payKind(s: PaymentStatus) {
  if (s === "APPROVED") return "ok"
  if (s === "REJECTED") return "bad"
  if (s === "PENDING") return "warn"
  return "neutral"
}

export default function AdminStatistikPage() {
  const { getAllUsers, user: adminUser, canAccessSport } = useAuth()

  const [sportFilter, setSportFilter] = useState<string>("ALL")
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL")
  const [refreshTick, setRefreshTick] = useState(0)

  // Auto-refresh ringan agar statistik update setelah admin validasi
  useEffect(() => {
    const t = setInterval(() => setRefreshTick((x) => x + 1), 1500)
    return () => clearInterval(t)
  }, [])

  const pesertaUsersAll = useMemo(() => {
    return getAllUsers().filter((u) => u.role === "PESERTA")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getAllUsers, refreshTick])

  const pesertaWithReg = useMemo(() => {
    return pesertaUsersAll
      .map((u) => {
        const reg = safeParse<Registration | null>(localStorage.getItem(`mg26_registration_${u.id}`), null)
        return { u, reg }
      })
      .filter((x) => !!x.reg) as Array<{ u: any; reg: Registration }>
  }, [pesertaUsersAll])

  // Scope visibility untuk ADMIN_CABOR
  const visibleKontingen = useMemo(() => {
    if (!adminUser) return []

    if (adminUser.role === "ADMIN" || adminUser.role === "SUPER_ADMIN") {
      return pesertaWithReg
    }

    if (adminUser.role === "ADMIN_CABOR") {
      return pesertaWithReg.filter(({ reg }) => {
        const sportIds = (reg.sports ?? []).map((s) => s.id)
        return sportIds.some((sid) => canAccessSport(sid))
      })
    }

    return []
  }, [adminUser, pesertaWithReg, canAccessSport])

  // Flatten athletes with kontingen info (scope untuk ADMIN_CABOR juga)
  const visibleAthletes = useMemo(() => {
    if (!adminUser) return []
    const rows: Array<{
      userId: string
      institutionName: string
      picName?: string
      email?: string
      phone?: string
      athleteId: string
      athleteName: string
      institution?: string
      sportId: string
      categoryId: string
      gender?: string
      birthDate?: string
      reg: Registration
    }> = []

    for (const { u, reg } of visibleKontingen) {
      const athletes = reg.athletes ?? []
      for (const a of athletes) {
        if (adminUser.role === "ADMIN_CABOR" && !canAccessSport(a.sportId)) continue
        rows.push({
          userId: u.id,
          institutionName: u.institutionName,
          picName: u.picName,
          email: u.email,
          phone: u.phone,
          athleteId: a.id,
          athleteName: a.name,
          institution: a.institution,
          sportId: a.sportId,
          categoryId: a.categoryId,
          gender: a.gender,
          birthDate: a.birthDate,
          reg,
        })
      }
    }
    return rows
  }, [adminUser, visibleKontingen, canAccessSport])

  const sportOptions = useMemo(() => {
    const s = new Map<string, string>()
    for (const { reg } of visibleKontingen) {
      for (const sp of reg.sports ?? []) s.set(sp.id, sp.name ?? sp.id)
    }
    // fallback dari athletes
    for (const a of visibleAthletes) if (!s.has(a.sportId)) s.set(a.sportId, a.sportId)
    return Array.from(s.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [visibleKontingen, visibleAthletes])

  const categoryOptions = useMemo(() => {
    const set = new Set<string>()
    for (const a of visibleAthletes) {
      if (sportFilter !== "ALL" && a.sportId !== sportFilter) continue
      if (a.categoryId) set.add(a.categoryId)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [visibleAthletes, sportFilter])

  // Apply filters
  const filteredAthletes = useMemo(() => {
    return visibleAthletes.filter((a) => {
      if (sportFilter !== "ALL" && a.sportId !== sportFilter) return false
      if (categoryFilter !== "ALL" && a.categoryId !== categoryFilter) return false
      return true
    })
  }, [visibleAthletes, sportFilter, categoryFilter])

  // ===== Payment Statistics =====
  const paymentStats = useMemo(() => {
    const counts: Record<PaymentStatus, number> = {
      NONE: 0,
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    }
    let totalFee = 0

    for (const { reg } of visibleKontingen) {
      const st = reg.payment?.status ?? "NONE"
      counts[st] += 1
      totalFee += Number(reg.payment?.totalFee ?? 0)
    }

    return {
      counts,
      totalKontingen: visibleKontingen.length,
      totalFee,
    }
  }, [visibleKontingen])

  // ===== Document Statistics (per athlete doc file) =====
  const documentStats = useMemo(() => {
    // hitung per-file dokumen per atlet
    const counts: Record<DocumentStatus, number> = {
      "Belum upload": 0,
      "Sudah upload": 0,
      "Perlu revisi": 0,
      Disetujui: 0,
      Ditolak: 0,
    }

    let totalExpected = 0 // athletes * 5 (filtered)
    let totalAthletes = 0

    // Map athleteId -> docs
    const docsByAth = new Map<string, any>()
    for (const { reg } of visibleKontingen) {
      for (const d of reg.documents ?? []) docsByAth.set(d.athleteId, d)
    }

    for (const a of filteredAthletes) {
      totalAthletes += 1
      totalExpected += DOC_KEYS.length
      const docs = docsByAth.get(a.athleteId)
      for (const k of DOC_KEYS) {
        const st: DocumentStatus = (docs?.[k]?.status as DocumentStatus) ?? "Belum upload"
        counts[st] += 1
      }
    }

    return {
      counts,
      totalAthletes,
      totalExpected,
    }
  }, [filteredAthletes, visibleKontingen])

  // ===== Breakdown per sport/category =====
  const breakdown = useMemo(() => {
    // sportId -> categoryId -> count
    const map = new Map<string, Map<string, number>>()
    const sportName = new Map<string, string>()

    for (const sp of sportOptions) sportName.set(sp.id, sp.name)

    for (const a of filteredAthletes) {
      if (!map.has(a.sportId)) map.set(a.sportId, new Map())
      const inner = map.get(a.sportId)!
      const key = a.categoryId || "-"
      inner.set(key, (inner.get(key) ?? 0) + 1)
    }

    const rows: Array<{ sportId: string; sportName: string; categoryId: string; athleteCount: number }> = []
    for (const [sid, inner] of map.entries()) {
      for (const [cid, cnt] of inner.entries()) {
        rows.push({
          sportId: sid,
          sportName: sportName.get(sid) ?? sid,
          categoryId: cid,
          athleteCount: cnt,
        })
      }
    }

    rows.sort((a, b) => {
      const s = a.sportName.localeCompare(b.sportName)
      if (s !== 0) return s
      return a.categoryId.localeCompare(b.categoryId)
    })

    return rows
  }, [filteredAthletes, sportOptions])

  // ===== Simple derived groups: validated / not validated / rejected =====
  const docGroups = useMemo(() => {
    const approved = documentStats.counts.Disetujui
    const uploaded = documentStats.counts["Sudah upload"] + documentStats.counts["Perlu revisi"]
    const rejected = documentStats.counts.Ditolak
    const empty = documentStats.counts["Belum upload"]

    // interpretasi:
    // - "sudah divalidasi" = APPROVED
    // - "belum divalidasi" = UPLOADED (sudah ada file tapi belum diputus)
    // - "ditolak" = REJECTED
    // - "belum upload" = EMPTY (bonus info)
    return { approved, uploaded, rejected, empty }
  }, [documentStats])

  return (
    <div className="max-w-7xl space-y-6">
      {/* Header */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className="text-xs font-extrabold text-gray-500">Admin</div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900">
              Statistik Pendaftaran
            </h1>
    
            {adminUser?.role === "ADMIN_CABOR" && (
              <div className="mt-3 text-xs text-gray-500">
                Mode <b>ADMIN_CABOR</b>: data dibatasi sesuai cabor yang kamu pegang.
              </div>
            )}
          </div>

          <button
            onClick={() => setRefreshTick((x) => x + 1)}
            className="px-4 py-2 rounded-xl border bg-white font-semibold hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 md:items-end">
          <div className="flex-1">
            <div className="text-sm font-extrabold text-gray-900 mb-2">Filter Cabor</div>
            <select
              value={sportFilter}
              onChange={(e) => {
                setSportFilter(e.target.value)
                setCategoryFilter("ALL")
              }}
              className="w-full border rounded-xl px-3 py-2"
            >
              <option value="ALL">Semua Cabor</option>
              {sportOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <div className="text-sm font-extrabold text-gray-900 mb-2">Filter Kategori</div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full border rounded-xl px-3 py-2"
              disabled={sportFilter === "ALL" && categoryOptions.length === 0}
            >
              <option value="ALL">Semua Kategori</option>
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <div className="text-xs text-gray-500 mt-2">
              Kategori diambil dari data atlet (Step 3).
            </div>
          </div>
        </div>
      </div>

      {/* Top KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Kontingen */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="text-sm text-gray-600 font-semibold">Total Kontingen (punya registration)</div>
          <div className="mt-2 text-3xl font-extrabold text-gray-900">{fmt(paymentStats.totalKontingen)}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {statusBadge(payKind("PENDING"), `PENDING: ${fmt(paymentStats.counts.PENDING)}`)}
            {statusBadge(payKind("APPROVED"), `APPROVED: ${fmt(paymentStats.counts.APPROVED)}`)}
            {statusBadge(payKind("REJECTED"), `REJECTED: ${fmt(paymentStats.counts.REJECTED)}`)}
            {statusBadge(payKind("NONE"), `NONE: ${fmt(paymentStats.counts.NONE)}`)}
          </div>
        </div>

        {/* Atlet */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="text-sm text-gray-600 font-semibold">
            Total Atlet (sesuai filter)
          </div>
          <div className="mt-2 text-3xl font-extrabold text-gray-900">{fmt(documentStats.totalAthletes)}</div>
          <div className="text-xs text-gray-500 mt-2">
            Mengikuti filter cabor/kategori di atas.
          </div>
        </div>

        {/* Dokumen */}
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="text-sm text-gray-600 font-semibold">
            Status Dokumen (per-file, sesuai filter)
          </div>
          <div className="mt-2 text-3xl font-extrabold text-gray-900">{fmt(documentStats.totalExpected)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Total file yang diharapkan = atlet × 5 dokumen.
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {statusBadge("ok", `Sudah divalidasi: ${fmt(docGroups.approved)}`)}
            {statusBadge("warn", `Belum divalidasi: ${fmt(docGroups.uploaded)}`)}
            {statusBadge("bad", `Ditolak: ${fmt(docGroups.rejected)}`)}
            {statusBadge("neutral", `Belum upload: ${fmt(docGroups.empty)}`)}
          </div>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold text-gray-900">Breakdown Pendaftar</div>
            <div className="text-sm text-gray-600 mt-1">
              Jumlah atlet per <b>cabor</b> dan <b>kategori</b> (mengikuti filter).
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Baris: {fmt(breakdown.length)}
          </div>
        </div>

        {breakdown.length === 0 ? (
          <div className="mt-4 text-sm text-gray-500">
            Belum ada data atlet pada filter ini.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 px-3 border-b">Cabor</th>
                  <th className="py-2 px-3 border-b">Kategori</th>
                  <th className="py-2 px-3 border-b">Jumlah Atlet</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((r) => (
                  <tr key={`${r.sportId}__${r.categoryId}`} className="hover:bg-gray-50">
                    <td className="py-2 px-3 border-b">
                      <div className="font-semibold text-gray-900">{r.sportName}</div>
                      <div className="text-xs text-gray-500">{r.sportId}</div>
                    </td>
                    <td className="py-2 px-3 border-b">
                      <div className="font-semibold text-gray-900">{r.categoryId}</div>
                    </td>
                    <td className="py-2 px-3 border-b">
                      <span className="font-extrabold text-gray-900">{fmt(r.athleteCount)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick note */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="text-sm font-extrabold text-gray-900">Catatan</div>
        <ul className="mt-2 text-sm text-gray-600 space-y-1 list-disc pl-5">
          <li>
            “Belum divalidasi” pada dokumen dihitung dari status <b>UPLOADED</b> (file sudah ada, belum approve/reject).
          </li>
          <li>
            “Sudah divalidasi” pada dokumen dihitung dari status <b>APPROVED</b>.
          </li>
          <li>
            Jika ingin statistik “per kontingen” (semua dokumen atletnya lengkap/valid), nanti kita buat mode agregasi tambahan.
          </li>
        </ul>
      </div>
    </div>
  )
}
