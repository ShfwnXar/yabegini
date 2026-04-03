"use client"

import Link from "next/link"
import { useAuth } from "@/context/AuthContext"
import { useEffect, useMemo, useState } from "react"
import { OFFICIAL_SPORTS_REFERENCE, getOfficialCategoryOptions } from "@/data/officialSports"
import { buildMedalTable, getWinnerResults, saveWinnerResults, type WinnerResult } from "@/lib/winnerResults"

type PlacementForm = {
  institutionId: string
  institutionName: string
}

function todayValue() {
  return new Date().toISOString().slice(0, 10)
}

function emptyPlacement(): PlacementForm {
  return { institutionId: "", institutionName: "" }
}

export default function AdminPemenangPage() {
  const { getAllUsers } = useAuth()

  const pesertaUsers = useMemo(() => getAllUsers().filter((u) => u.role === "PESERTA"), [getAllUsers])
  const [results, setResults] = useState<WinnerResult[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const [date, setDate] = useState(todayValue())
  const [sportId, setSportId] = useState(OFFICIAL_SPORTS_REFERENCE[0]?.id ?? "")
  const [categoryName, setCategoryName] = useState(OFFICIAL_SPORTS_REFERENCE[0]?.kategori[0]?.name ?? "")
  const [nomorLombaId, setNomorLombaId] = useState("")
  const [gold, setGold] = useState<PlacementForm>(emptyPlacement())
  const [silver, setSilver] = useState<PlacementForm>(emptyPlacement())
  const [bronze, setBronze] = useState<PlacementForm>(emptyPlacement())

  useEffect(() => {
    setResults(getWinnerResults())
  }, [])

  const selectedSport = useMemo(() => OFFICIAL_SPORTS_REFERENCE.find((sport) => sport.id === sportId) ?? null, [sportId])
  const categoryOptions = useMemo(() => getOfficialCategoryOptions(sportId), [sportId])

  useEffect(() => {
    if (!selectedSport) return
    if (!categoryOptions.some((category) => category.name === categoryName)) {
      setCategoryName(categoryOptions[0]?.name ?? "")
    }
  }, [selectedSport, categoryName, categoryOptions])

  const selectedCategory = useMemo(() => {
    return categoryOptions.find((category) => category.name === categoryName) ?? null
  }, [categoryOptions, categoryName])

  useEffect(() => {
    if (!selectedCategory) return
    if (!selectedCategory.nomorLomba.some((nomor) => nomor.id === nomorLombaId)) {
      setNomorLombaId(selectedCategory.nomorLomba[0]?.id ?? "")
    }
  }, [selectedCategory, nomorLombaId])

  const selectedNomorLomba = useMemo(() => {
    return selectedCategory?.nomorLomba.find((nomor) => nomor.id === nomorLombaId) ?? null
  }, [selectedCategory, nomorLombaId])

  const medalTable = useMemo(() => {
    return buildMedalTable(results).map((row) => ({ ...row, total: row.gold + row.silver + row.bronze }))
  }, [results])

  const handlePlacementChange = (
    setter: React.Dispatch<React.SetStateAction<PlacementForm>>,
    institutionId: string
  ) => {
    const selected = pesertaUsers.find((user) => user.id === institutionId)
    setter({ institutionId, institutionName: selected?.institutionName ?? "" })
  }

  const handleSave = () => {
    if (!selectedSport || !selectedCategory || !selectedNomorLomba) return
    if (!gold.institutionId || !silver.institutionId || !bronze.institutionId) {
      setMessage("Lengkapi juara 1, 2, dan 3 terlebih dahulu.")
      return
    }

    const ids = [gold.institutionId, silver.institutionId, bronze.institutionId]
    if (new Set(ids).size !== ids.length) {
      setMessage("Juara 1, 2, dan 3 harus berasal dari kontingen yang berbeda.")
      return
    }

    const id = `${date}_${sportId}_${nomorLombaId}`
    const nextRow: WinnerResult = {
      id,
      date,
      sportId: selectedSport.id,
      sportName: selectedSport.name,
      categoryId: selectedNomorLomba.id,
      categoryName: selectedNomorLomba.displayName,
      participantCategoryName: selectedCategory.name,
      nomorLombaName: selectedNomorLomba.name,
      nomorLombaDisplayName: selectedNomorLomba.displayName,
      gold,
      silver,
      bronze,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const next = results.some((item) => item.id === id)
      ? results.map((item) => (item.id === id ? { ...nextRow, createdAt: item.createdAt } : item))
      : [nextRow, ...results]

    setResults(next)
    saveWinnerResults(next)
    setMessage("Hasil lomba berhasil disimpan. Tabel medali dihitung otomatis.")
    setGold(emptyPlacement())
    setSilver(emptyPlacement())
    setBronze(emptyPlacement())
    setTimeout(() => setMessage(null), 1600)
  }

  const handleDelete = (id: string) => {
    const next = results.filter((item) => item.id !== id)
    setResults(next)
    saveWinnerResults(next)
    setMessage("Hasil lomba dihapus. Tabel medali diperbarui otomatis.")
    setTimeout(() => setMessage(null), 1600)
  }

  const handleReset = () => {
    if (!window.confirm("Reset semua hasil lomba dan tabel medali otomatis?")) return
    setResults([])
    saveWinnerResults([])
    setMessage("Semua hasil lomba direset.")
    setTimeout(() => setMessage(null), 1600)
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Pemenang & Peringkat Medali</h1>
        <p className="mt-2 text-gray-600">Admin cukup input pemenang lomba per kategori setiap hari. Sistem otomatis menghitung perolehan medali setiap kontingen.</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/peringkat" className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700">
            Buka Halaman Peringkat
          </Link>
          <button onClick={handleReset} className="rounded-lg bg-red-50 px-4 py-2 font-semibold text-red-700 hover:bg-red-100">
            Reset Semua Hasil
          </button>
        </div>

        {message ? <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Input Hasil Lomba</h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Tanggal Lomba</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-gray-700">Cabang Olahraga</label>
              <select value={sportId} onChange={(e) => setSportId(e.target.value)} className="w-full rounded-lg border px-3 py-2">
                {OFFICIAL_SPORTS_REFERENCE.map((sport) => (
                  <option key={sport.id} value={sport.id}>{sport.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Kategori</label>
            <select value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="w-full rounded-lg border px-3 py-2">
              {categoryOptions.map((category) => (
                <option key={category.name} value={category.name}>{category.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Nomor Lomba</label>
            <select value={nomorLombaId} onChange={(e) => setNomorLombaId(e.target.value)} className="w-full rounded-lg border px-3 py-2">
              {(selectedCategory?.nomorLomba ?? []).map((nomor) => (
                <option key={nomor.id} value={nomor.id}>{nomor.displayName}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-yellow-700">Juara 1 / Emas</label>
              <select value={gold.institutionId} onChange={(e) => handlePlacementChange(setGold, e.target.value)} className="w-full rounded-lg border px-3 py-2">
                <option value="">Pilih kontingen</option>
                {pesertaUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.institutionName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Juara 2 / Perak</label>
              <select value={silver.institutionId} onChange={(e) => handlePlacementChange(setSilver, e.target.value)} className="w-full rounded-lg border px-3 py-2">
                <option value="">Pilih kontingen</option>
                {pesertaUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.institutionName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-amber-700">Juara 3 / Perunggu</label>
              <select value={bronze.institutionId} onChange={(e) => handlePlacementChange(setBronze, e.target.value)} className="w-full rounded-lg border px-3 py-2">
                <option value="">Pilih kontingen</option>
                {pesertaUsers.map((user) => (
                  <option key={user.id} value={user.id}>{user.institutionName}</option>
                ))}
              </select>
            </div>
          </div>

          <button onClick={handleSave} className="rounded-lg bg-green-600 px-5 py-2 font-semibold text-white hover:bg-green-700">
            Simpan Hasil Lomba
          </button>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-lg font-bold text-gray-900">Preview Tabel Medali Otomatis</h2>
          {medalTable.length === 0 ? (
            <div className="text-sm text-gray-500">Belum ada hasil lomba tersimpan.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-3 pr-3">Kontingen</th>
                    <th className="py-3 pr-3">Emas</th>
                    <th className="py-3 pr-3">Perak</th>
                    <th className="py-3 pr-3">Perunggu</th>
                    <th className="py-3 pr-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {medalTable.map((row) => (
                    <tr key={row.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-3 font-semibold">{row.name}</td>
                      <td className="py-3 pr-3">{row.gold}</td>
                      <td className="py-3 pr-3">{row.silver}</td>
                      <td className="py-3 pr-3">{row.bronze}</td>
                      <td className="py-3 pr-3 font-bold">{row.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Daftar Hasil Lomba Tersimpan</h2>
        {results.length === 0 ? (
          <div className="text-sm text-gray-500">Belum ada hasil lomba.</div>
        ) : (
          <div className="space-y-3">
            {results.map((result) => (
              <div key={result.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{result.sportName}</div>
                    <div className="text-sm text-gray-600">{result.participantCategoryName ?? "-"}</div>
                    <div className="text-sm text-gray-600">{result.nomorLombaDisplayName ?? result.categoryName}</div>
                    <div className="mt-1 text-xs text-gray-500">Tanggal: {result.date}</div>
                    <div className="mt-3 text-sm text-gray-700">Emas: <b>{result.gold?.institutionName ?? "-"}</b></div>
                    <div className="text-sm text-gray-700">Perak: <b>{result.silver?.institutionName ?? "-"}</b></div>
                    <div className="text-sm text-gray-700">Perunggu: <b>{result.bronze?.institutionName ?? "-"}</b></div>
                  </div>
                  <button onClick={() => handleDelete(result.id)} className="rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">
                    Hapus Hasil
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
