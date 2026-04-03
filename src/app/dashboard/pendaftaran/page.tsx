"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useRegistration } from "@/context/RegistrationContext"
import { useAuth } from "@/context/AuthContext"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"

type SportCatalogItem = { id: string; name: string; desc: string }

const SPORT_CATALOG: SportCatalogItem[] = SPORTS_CATALOG.map((sport) => ({
  id: sport.id,
  name: sport.name,
  desc:
    sport.id === "voli_indoor"
      ? "Kategori tim dipilih di Step 3. Biaya dihitung per tim putra/putri."
      : "Kategori, nomor lomba, dan detail pertandingan dipilih di Step 3 per atlet.",
}))

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export default function Step1PilihCaborDanJumlahPage() {
  const router = useRouter()
  const { user } = useAuth()
  const {
    state,
    hydrateReady,
    setSports,
    updateSportPlanning,
    dispatch,
    masterSports,
    activeRegistrationId,
    ensureDraftRegistration,
  } = useRegistration()
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const approvedTotal = useMemo(() => {
    if (!user) return 0
    const raw = localStorage.getItem(`mg26_approved_payment_total_${user.id}`)
    const total = Number(raw || 0)
    return Number.isFinite(total) ? Math.max(0, total) : 0
  }, [user])

  const additionalDue = Math.max(0, state.payment.totalFee - approvedTotal)
  const isLocked = state.payment.status === "PENDING"

  const selectedIds = useMemo(() => new Set(state.sports.map((s) => s.id)), [state.sports])
  const selectedCount = state.sports.length
  const sportCatalog = useMemo(() => {
    if (masterSports.length === 0) return SPORT_CATALOG
    return masterSports.map((sport) => ({
      id: String(sport.id),
      name: sport.name ?? sport.title ?? String(sport.id),
      desc: sport.description ?? "Data cabor dari backend.",
    }))
  }, [masterSports])

  const toggleSport = (id: string) => {
    setMsg(null)
    if (isLocked) {
      setMsg({ type: "error", text: "Step 1 terkunci karena pembayaran tambahan sedang PENDING." })
      return
    }

    const exists = selectedIds.has(id)
    if (exists) {
      const next = state.sports.filter((s) => s.id !== id)
      setSports(next)
      return
    }

    const cat = sportCatalog.find((x) => x.id === id)
    const next = [
      ...state.sports,
      {
        id,
        name: cat?.name ?? id,
        plannedAthletes: 0,
        officialCount: 0,
        voliMenTeams: id === "voli_indoor" ? 0 : undefined,
        voliWomenTeams: id === "voli_indoor" ? 0 : undefined,
        categories: [],
      },
    ]
    setSports(next)
  }

  useEffect(() => {
    if (state.payment.status !== "APPROVED") return
    if (additionalDue <= 0) return
    dispatch({ type: "SET_PAYMENT_STATUS", status: "NONE" })
  }, [additionalDue, dispatch, state.payment.status])

  const goToPayment = async () => {
    if (selectedCount === 0) return
    try {
      await ensureDraftRegistration(state.sports.map((sport) => sport.id))
      router.push("/dashboard/pendaftaran/atlet")
    } catch (error) {
      setMsg({
        type: "error",
        text: error instanceof Error ? error.message : "Gagal membuat draft registrasi.",
      })
    }
  }

  if (!hydrateReady) {
    return (
      <div className="max-w-6xl">
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Step 1 - Pilih Cabor & Jumlah Peserta</CardTitle>
            <CardDescription>Memuat data...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">Loading...</div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Card variant="soft">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <div className="text-xs font-extrabold text-gray-500 tracking-wider">STEP 1</div>
              <CardTitle className="mt-1">Pilih Cabor & Jumlah Peserta</CardTitle>
              <CardDescription className="mt-2">
                Di Step 1 kamu memilih <b>cabor</b> dan mengisi <b>jumlah peserta</b> untuk kalkulasi biaya.
                Detail atlet + kategori/kelas dipilih nanti di <b>Step 2</b>.
              </CardDescription>

              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <Badge tone="info">Terpilih: {selectedCount} cabor</Badge>
                <Badge tone="neutral">Payment: {state.payment.status}</Badge>
                <Badge tone="brand">Total: Rp {state.payment.totalFee.toLocaleString("id-ID")}</Badge>
                {activeRegistrationId ? <Badge tone="success">Draft ID: {activeRegistrationId}</Badge> : null}
                {isLocked ? <Badge tone="warning">Terkunci</Badge> : <Badge tone="success">Bisa diedit</Badge>}
                {approvedTotal > 0 ? <Badge tone={additionalDue > 0 ? "warning" : "info"}>Pembayaran di-ACC: Rp {approvedTotal.toLocaleString("id-ID")}</Badge> : null}
              </div>

              {isLocked && (
                <div className="mt-3 text-sm text-amber-800">
                  Step 1 dikunci sementara selama bukti pembayaran tambahan sedang diverifikasi.
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white/70 backdrop-blur p-4 min-w-[320px]">
              <div className="text-xs text-gray-500">Aksi</div>
              <div className="mt-2 flex flex-col gap-2">
                <Button className="w-full" variant="primary" disabled={selectedCount === 0} onClick={goToPayment}>
                    Lanjut Step 2 (Input Atlet)
                </Button>
                <Link href="/dashboard/status">
                  <Button className="w-full" variant="secondary">Lihat Status</Button>
                </Link>
                {approvedTotal > 0 ? (
                  <div className="mt-1 text-xs text-gray-500">Jika total naik, pembayaran tambahan saat ini: Rp {additionalDue.toLocaleString("id-ID")}.</div>
                ) : null}
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Setelah upload bukti bayar -&gt; status PENDING -&gt; Step 1 dan Step 2 terkunci.
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {msg && (
        <div
          className={cx(
            "rounded-2xl border p-4 text-sm font-semibold",
            msg.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          )}
        >
          {msg.text}
        </div>
      )}

      {/* Catalog pilih cabor */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Daftar Cabang Olahraga</CardTitle>
          <CardDescription>Klik kartu untuk memilih/menonaktifkan cabor (multi-cabor boleh).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sportCatalog.map((s) => {
              const picked = selectedIds.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSport(s.id)}
                  disabled={isLocked}
                  className={cx(
                    "text-left rounded-2xl border p-5 transition-all bg-white/70 backdrop-blur",
                    picked
                      ? "border-emerald-200 shadow-[0_14px_46px_rgba(16,185,129,0.16)]"
                      : "border-gray-200 hover:border-emerald-150 hover:shadow-[0_12px_40px_rgba(0,0,0,0.06)]",
                    isLocked ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-extrabold text-gray-900">{s.name}</div>
                      <div className="mt-1 text-sm text-gray-600">{s.desc}</div>
                    </div>
                    {picked ? <Badge tone="brand">Dipilih</Badge> : <Badge tone="neutral">Belum</Badge>}
                  </div>
                  <div className="mt-4 text-xs text-gray-500">
                    ID: <b>{s.id}</b>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Input jumlah peserta per cabor */}
      <Card variant="soft">
        <CardHeader>
          <CardTitle>Jumlah Peserta yang Diikutkan</CardTitle>
          <CardDescription>
            Isi jumlah atlet/official untuk kalkulasi biaya. Khusus voli: isi jumlah tim putra/putri (biaya per tim).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedCount === 0 ? (
            <div className="text-sm text-gray-600">Pilih minimal 1 cabor dulu.</div>
          ) : (
            <div className="space-y-4">
              {state.sports.map((s) => {
                const isVoli = s.id === "voli_indoor"
                return (
                  <div key={s.id} className="rounded-2xl border bg-white p-5">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div>
                        <div className="text-sm font-extrabold text-gray-900">{s.name}</div>
                        <div className="text-xs text-gray-500 mt-1">ID: {s.id}</div>
                      </div>
                      <Badge tone={isVoli ? "info" : "neutral"}>
                        {isVoli ? "Voli: biaya per tim" : "Biaya per atlet"}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      {!isVoli ? (
                        <>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Jumlah Atlet</div>
                            <input
                              type="number"
                              min={0}
                              disabled={isLocked}
                              value={s.plannedAthletes}
                              onChange={(e) =>
                                updateSportPlanning(s.id, { plannedAthletes: Number(e.target.value || 0) })
                              }
                              className="w-full rounded-xl border px-3 py-2"
                            />
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 mb-1">Jumlah Official</div>
                            <input
                              type="number"
                              min={0}
                              disabled={isLocked}
                              value={s.officialCount}
                              onChange={(e) =>
                                updateSportPlanning(s.id, { officialCount: Number(e.target.value || 0) })
                              }
                              className="w-full rounded-xl border px-3 py-2"
                            />
                          </div>

                          <div className="rounded-xl border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Estimasi Biaya Cabor</div>
                            <div className="mt-1 font-extrabold">
                              Rp {(s.plannedAthletes * 150_000).toLocaleString("id-ID")}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Atlet 150rb/orang - Official gratis
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Tim Putra</div>
                            <input
                              type="number"
                              min={0}
                              disabled={isLocked}
                              value={s.voliMenTeams ?? 0}
                              onChange={(e) =>
                                updateSportPlanning(s.id, { voliMenTeams: Number(e.target.value || 0) })
                              }
                              className="w-full rounded-xl border px-3 py-2"
                            />
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 mb-1">Tim Putri</div>
                            <input
                              type="number"
                              min={0}
                              disabled={isLocked}
                              value={s.voliWomenTeams ?? 0}
                              onChange={(e) =>
                                updateSportPlanning(s.id, { voliWomenTeams: Number(e.target.value || 0) })
                              }
                              className="w-full rounded-xl border px-3 py-2"
                            />
                          </div>

                          <div className="rounded-xl border bg-gray-50 p-3">
                            <div className="text-xs text-gray-500">Estimasi Biaya Voli</div>
                            <div className="mt-1 font-extrabold">
                              Rp {(((s.voliMenTeams ?? 0) + (s.voliWomenTeams ?? 0)) * 1_500_000).toLocaleString("id-ID")}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              1.500.000 / tim
                            </div>
                          </div>

                          <div className="md:col-span-3">
                            <div className="text-xs text-gray-500 mb-1">Jumlah Official Voli</div>
                            <input
                              type="number"
                              min={0}
                              disabled={isLocked}
                              value={s.officialCount}
                              onChange={(e) =>
                                updateSportPlanning(s.id, { officialCount: Number(e.target.value || 0) })
                              }
                              className="w-full rounded-xl border px-3 py-2"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              Official gratis
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    {isLocked && (
                      <div className="mt-3 text-xs text-amber-700 font-semibold">
                        Terkunci karena pembayaran tambahan sedang PENDING.
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

          )}

          <div className="flex flex-col md:flex-row gap-2 pt-2">
            <Button variant="primary" disabled={selectedCount === 0} onClick={goToPayment}>
                Lanjut Step 2 (Input Atlet)
            </Button>
            <Link href="/dashboard/pendaftaran/atlet">
              <Button variant="secondary">
                Ke Step 2
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

