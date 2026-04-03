// src/app/dashboard/pendaftaran/atlet/page.tsx
"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { ENV } from "@/config/env"
import type { Athlete as RegistrationAthlete } from "@/context/RegistrationContext"
import { useRegistration } from "@/context/RegistrationContext"
import { DOCUMENT_FIELD_KEYS, getOfficialRoleLabel, isUploadedDocumentStatus, type OfficialRole } from "@/data/documentCatalog"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"
import { Input } from "@/components/ui/Input"
import { Modal } from "@/components/ui/Modal"
import type { AthleteDocuments } from "@/types/registration"
import type { BackendTeam } from "@/types/api"
import { useAuth } from "@/context/AuthContext"
import { readRevisionMode } from "@/lib/registrationFlow"
import { Repos } from "@/repositories"
import {
  getActiveAthleteCount,
  getApprovedAthleteQuota,
  getApprovedExtraSlotsForSport,
  getExtraAccess,
  getPendingTopUpCount,
  getUsedExtraSlotsForSport,
  getTopUp,
} from "@/lib/extraAthleteFlow"

type Gender = "PUTRA" | "PUTRI"
type AthleteFormRow = { name: string; gender: Gender; birthDate: string; institution: string }
type TeamFormState = { id?: string; name: string }

type CatalogCategory = {
  id: string
  name: string
  // opsional (kalau sudah kamu tambahkan di catalog)
  rosterSize?: number // 1 individu, 2 ganda, 12 voli, dst
  slot?: number
}

type CatalogSport = {
  id: string
  name: string
  categories: CatalogCategory[]
}

const SPORT_VOLI_ID = "voli_indoor"
const VOLI_ROSTER_PER_TEAM = 12

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}


// Infer roster size kalau catalog belum punya rosterSize
function inferRosterSize(sportId: string, category?: CatalogCategory | null) {
  if (!category) return 1
  if (typeof category.rosterSize === "number" && category.rosterSize > 0) return category.rosterSize

  const n = (category.name || "").toLowerCase()

  // ganda
  if (n.includes("ganda") || n.includes("double")) return 2

  // beregu/tim (default 5 kalau tidak jelas)
  if (n.includes("beregu") || n.includes("team") || n.includes("tim")) {
    if (sportId === "voli_indoor") return 12
    return 5
  }

  // voli khusus
  if (sportId === "voli_indoor") return 12

  return 1
}

function categoryLabel(sportId: string, categoryId: string) {
  const s = (SPORTS_CATALOG as CatalogSport[]).find((x) => x.id === sportId)
  const c = s?.categories?.find((k) => k.id === categoryId)
  return c?.name ?? categoryId
}
function getSportAthleteQuota(s: any) {
  if (!s) return 0
  if (s.id === SPORT_VOLI_ID) {
    const men = Math.max(0, Number(s.voliMenTeams ?? 0))
    const women = Math.max(0, Number(s.voliWomenTeams ?? 0))
    const fromTeams = (men + women) * VOLI_ROSTER_PER_TEAM
    const planned = Math.max(0, Number(s.athleteQuota ?? s.plannedAthletes ?? 0))
    return Math.max(fromTeams, planned)
  }
  return Math.max(0, Number(s.athleteQuota ?? s.plannedAthletes ?? 0))
}

/** =========================
 *  Helper: "Atlet Lengkap"
 *  ========================= */
type DocKey = keyof Omit<AthleteDocuments, "athleteId">

const REQUIRED_DOCS: DocKey[] = DOCUMENT_FIELD_KEYS

function isAthleteProfileComplete(a: any) {
  return !!a?.name?.trim() && !!a?.birthDate
}

function isAthleteDocsComplete(doc: AthleteDocuments | undefined | null) {
  if (!doc) return false
  return REQUIRED_DOCS.every((key) => isUploadedDocumentStatus(doc[key]?.status))
}

function isAthleteComplete(a: any, doc: AthleteDocuments | undefined | null) {
  return isAthleteProfileComplete(a) && isAthleteDocsComplete(doc)
}

export default function Step2AtletPage() {
  const { user } = useAuth()
  const {
    state,
    hydrateReady,
    addAthlete,
    updateAthlete,
    removeAthlete,
    addOfficial,
    removeOfficial,
    syncAthleteBatch,
    deleteAthleteRemote,
    activeRegistrationId,
    refreshRemoteRegistration,
  } = useRegistration()
  const revisionOpen = user ? readRevisionMode(user.id) : false

  const athleteStepLocked = (state.payment.status === "PENDING" || state.payment.status === "APPROVED") && !revisionOpen
  const canEditAthleteStep = !athleteStepLocked
  const canOpenDocuments = state.payment.status === "PENDING" || state.payment.status === "APPROVED" || revisionOpen
  const approvedAthleteQuota = getApprovedAthleteQuota(state as any)
  const activeAthleteCount = getActiveAthleteCount(state as any)
  const pendingTopUpCount = getPendingTopUpCount(state as any)
  const extraAccess = getExtraAccess(state as any)
  const topUp = getTopUp(state as any)

  const [selectedSportId, setSelectedSportId] = useState<string>("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [teams, setTeams] = useState<BackendTeam[]>([])
  const [teamForm, setTeamForm] = useState<TeamFormState>({ name: "" })
  const [teamModalOpen, setTeamModalOpen] = useState(false)
  const [teamSubmitting, setTeamSubmitting] = useState(false)
  const [teamMsg, setTeamMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [editingAthlete, setEditingAthlete] = useState<RegistrationAthlete | null>(null)
  const [editAthleteForm, setEditAthleteForm] = useState<AthleteFormRow>({
    name: "",
    gender: "PUTRA",
    birthDate: "",
    institution: "",
  })
  const [athleteSubmitting, setAthleteSubmitting] = useState(false)

  // ==== SPORT OPTIONS (yang dipilih Step 1) ====
  // Support dua versi field:
  // - lama: athleteQuota
  // - baru: plannedAthletes
  const sportOptions = useMemo(() => {
    const baseSports = state.sports || []
    const extraSports = (extraAccess.requestItems || [])
      .filter((item: any) => Math.max(0, Number(item.approvedSlots ?? 0)) > 0)
      .map((item: any) => {
        const catalogSport = (SPORTS_CATALOG as CatalogSport[]).find((sport) => sport.id === item.sportId)
        return {
          id: item.sportId,
          name: item.sportName,
          athleteQuota: Math.max(0, Number(item.approvedSlots ?? 0)),
          categories: catalogSport?.categories ?? [],
          plannedAthletes: Math.max(0, Number(item.approvedSlots ?? 0)),
          officialCount: 0,
        }
      })
    const mergedSports = [...baseSports]
    for (const sport of extraSports) {
      if (!mergedSports.some((existing: any) => existing.id === sport.id)) {
        mergedSports.push(sport as any)
      }
    }

    return mergedSports.filter((s: any) => {
      const q = getSportAthleteQuota(s)
      const extraQuota = getApprovedExtraSlotsForSport(state as any, s.id)
      return q > 0 || extraQuota > 0 || (state.athletes || []).some((a) => a.sportId === s.id)
    })
  }, [state.sports, state.athletes, extraAccess.requestItems, state])

  const selectedSport = useMemo(() => {
    return sportOptions.find((s: any) => s.id === selectedSportId) ?? null
  }, [sportOptions, selectedSportId])

  // ==== categories dari catalog ====
  const categoriesForSport = useMemo(() => {
    const s = (SPORTS_CATALOG as CatalogSport[]).find((x) => x.id === selectedSportId)
    return s?.categories ?? []
  }, [selectedSportId])

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null
    return categoriesForSport.find((c) => c.id === selectedCategoryId) ?? null
  }, [categoriesForSport, selectedCategoryId])

  const teamsForSelection = useMemo(() => {
    return teams.filter((team) => {
      const teamSportId = String(team.sport_id ?? "")
      const teamCategoryId = String(team.category_id ?? "")
      if (teamSportId !== selectedSportId) return false
      if (selectedCategoryId && teamCategoryId && teamCategoryId !== selectedCategoryId) return false
      return true
    })
  }, [selectedCategoryId, selectedSportId, teams])

  const rosterSize = useMemo(() => {
    return inferRosterSize(selectedSportId, selectedCategory)
  }, [selectedSportId, selectedCategory])

  // ==== Kuota sport ====
  const sportQuota = useMemo(() => {
    const s: any = selectedSport
    if (!s) return 0
    return getSportAthleteQuota(s)
  }, [selectedSport])
  // terisi dihitung dari jumlah atlet terinput (bukan status dokumen)
  const filledInSport = useMemo(() => {
    if (!selectedSportId) return 0
    return (state.athletes || []).filter((a) => a.sportId === selectedSportId).length
  }, [state.athletes, selectedSportId])

  const remainingInSport = sportQuota - filledInSport

  const categoryQuota = useMemo(() => {
    const s: any = selectedSport
    if (!s || !selectedCategoryId) return null

    const q = (s.categories || []).find((x: any) => x.id === selectedCategoryId)?.quota
    const n = Number(q ?? 0)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [selectedSport, selectedCategoryId])

  const filledInCategory = useMemo(() => {
    if (!selectedSportId || !selectedCategoryId) return 0
    return (state.athletes || []).filter((a) => a.sportId === selectedSportId && a.categoryId === selectedCategoryId).length
  }, [state.athletes, selectedSportId, selectedCategoryId])

  const remainingInCategory = categoryQuota == null ? Number.POSITIVE_INFINITY : categoryQuota - filledInCategory

  const documentsByAthleteId = useMemo(() => {
    const map = new Map<string, AthleteDocuments>()
    for (const d of state.documents || []) {
      if (d?.athleteId) map.set(d.athleteId, d as AthleteDocuments)
    }
    return map
  }, [state.documents])
  // ==== Ringkasan global ====
  const totalPlan = useMemo(() => {
    return (state.sports || []).reduce((acc: number, s: any) => acc + getSportAthleteQuota(s), 0)
  }, [state.sports])

  const totalFilled = useMemo(() => (state.athletes || []).length, [state.athletes])
  const initialAthletesCount = useMemo(() => (state.athletes || []).filter((a: any) => a?.registrationState?.source !== "EXTRA_ACCESS").length, [state.athletes])
  const approvedExtraSlotsForSport = useMemo(() => getApprovedExtraSlotsForSport(state as any, selectedSportId), [state, selectedSportId])
  const usedExtraSlotsForSport = useMemo(() => getUsedExtraSlotsForSport(state as any, selectedSportId), [state, selectedSportId])
  const extraSlotsRemaining = Math.max(0, approvedExtraSlotsForSport - usedExtraSlotsForSport)
  const paidSlotsRemaining = Math.max(0, approvedAthleteQuota - initialAthletesCount)

  // ==== kategori summary card ====
  const categorySummary = useMemo(() => {
    if (!selectedSportId) return []
    const athletes = state.athletes || []
    return categoriesForSport.map((c) => {
      const filled = athletes.filter((a) => a.sportId === selectedSportId && a.categoryId === c.id).length
      const rs = inferRosterSize(selectedSportId, c)
      return {
        id: c.id,
        name: c.name,
        rosterSize: rs,
        filled,
      }
    })
  }, [state.athletes, categoriesForSport, selectedSportId])

  // ==== Auto select sport pertama ====
  useEffect(() => {
    if (!hydrateReady) return
    if (selectedSportId) return
    if (sportOptions.length > 0) setSelectedSportId(sportOptions[0].id)
  }, [hydrateReady, selectedSportId, sportOptions])

  // reset category saat sport berubah
  useEffect(() => {
    setSelectedCategoryId("")
  }, [selectedSportId])

  // auto pick category pertama kalau ada
  useEffect(() => {
    if (!hydrateReady) return
    if (!selectedSportId) return
    if (selectedCategoryId) return
    if (categoriesForSport.length > 0) setSelectedCategoryId(categoriesForSport[0].id)
  }, [hydrateReady, selectedSportId, selectedCategoryId, categoriesForSport])

  useEffect(() => {
    if (ENV.USE_MOCK || !activeRegistrationId) {
      setTeams([])
      return
    }

    let cancelled = false
    void Repos.registration.listTeams(activeRegistrationId)
      .then((items) => {
        if (cancelled) return
        const filtered = items.filter((team) => String(team.registration_id ?? "") === activeRegistrationId)
        setTeams(filtered)
      })
      .catch(() => {
        if (cancelled) return
        setTeams([])
      })

    return () => {
      cancelled = true
    }
  }, [activeRegistrationId])

  useEffect(() => {
    if (!selectedTeamId) return
    if (teamsForSelection.some((team) => String(team.id) === selectedTeamId)) return
    setSelectedTeamId("")
  }, [selectedTeamId, teamsForSelection])

  // ==== Officials per sport ====
  const officialsForSelectedSport = useMemo(() => {
    if (!selectedSportId) return []
    return (state.officials || []).filter((o) => o.sportId === selectedSportId)
  }, [state.officials, selectedSportId])

  const officialQuota = useMemo(() => {
    const s: any = selectedSport
    return Number(s?.officialCount ?? 0)
  }, [selectedSport])

  const canAddOfficialHere = useMemo(() => {
    if (!selectedSport) return false
    return canEditAthleteStep && officialsForSelectedSport.length < officialQuota
  }, [canEditAthleteStep, officialsForSelectedSport.length, officialQuota, selectedSport])

  const [officialForm, setOfficialForm] = useState<{ name: string; phone: string; role: OfficialRole }>({
    name: "",
    phone: "",
    role: "OFFICIAL",
  })

  // ==== Form atlet dynamic sesuai rosterSize ====
  const [athleteForms, setAthleteForms] = useState<AthleteFormRow[]>([
    { name: "", gender: "PUTRA", birthDate: "", institution: "" },
  ])

  // Auto resize roster form saat kategori berubah
  useEffect(() => {
    if (!selectedSportId) return
    const size = Math.max(1, rosterSize || 1)
    setAthleteForms((prev) => {
      const next = [...prev]
      while (next.length < size) {
        next.push({ name: "", gender: "PUTRA", birthDate: "", institution: "" })
      }
      return next.slice(0, size)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryId, selectedSportId, rosterSize])

  const updateAthleteForm = (idx: number, patch: Partial<AthleteFormRow>) => {
    setAthleteForms((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  const resetAthleteForms = () => {
    setAthleteForms((prev) => {
      const size = Math.max(1, rosterSize || 1)
      const next: AthleteFormRow[] = []
      for (let i = 0; i < size; i++) next.push({ name: "", gender: "PUTRA", birthDate: "", institution: "" })
      return next
    })
  }

  // ==== List atlet filter ====
  const athletesFiltered = useMemo(() => {
    if (!selectedSportId) return []
    const list = (state.athletes || []).filter((a) => a.sportId === selectedSportId)
    if (!selectedCategoryId) return list
    return list.filter((a) => a.categoryId === selectedCategoryId)
  }, [state.athletes, selectedSportId, selectedCategoryId])

  // ==== Validasi tombol tambah ====
  const rosterFieldsValid = useMemo(() => {
    // minimal: name + birthDate per atlet
    return athleteForms.every((a) => a.name.trim().length > 0 && String(a.birthDate || "").trim().length > 0)
  }, [athleteForms])

  const needRoster = Math.max(1, rosterSize || 1)
  const canUsePaidSlots =
    canEditAthleteStep &&
    !!selectedSportId &&
    !!selectedCategoryId &&
    rosterFieldsValid &&
    paidSlotsRemaining >= needRoster &&
    remainingInCategory >= needRoster

  const canUseExtraSlots =
    canEditAthleteStep &&
    !!selectedSportId &&
    !!selectedCategoryId &&
    rosterFieldsValid &&
    extraAccess.status === "OPEN" &&
    topUp.status === "APPROVED" &&
    extraSlotsRemaining >= needRoster &&
    remainingInCategory >= needRoster

  const canAddRoster = canUsePaidSlots || canUseExtraSlots

  const reloadTeams = async () => {
    if (ENV.USE_MOCK || !activeRegistrationId) return
    const items = await Repos.registration.listTeams(activeRegistrationId)
    setTeams(items.filter((team) => String(team.registration_id ?? "") === activeRegistrationId))
  }

  const openCreateTeam = () => {
    setTeamForm({ name: "" })
    setTeamMsg(null)
    setTeamModalOpen(true)
  }

  const openEditTeam = (team: BackendTeam) => {
    setTeamForm({ id: String(team.id), name: team.name ?? team.title ?? "" })
    setTeamMsg(null)
    setTeamModalOpen(true)
  }

  const submitTeam = async () => {
    if (ENV.USE_MOCK) {
      setTeamMsg({ type: "error", text: "Team CRUD hanya aktif saat API backend digunakan." })
      return
    }
    if (!activeRegistrationId) {
      setTeamMsg({ type: "error", text: "Draft registrasi belum tersedia." })
      return
    }
    if (!selectedSportId) {
      setTeamMsg({ type: "error", text: "Pilih cabor terlebih dahulu." })
      return
    }
    if (!teamForm.name.trim()) {
      setTeamMsg({ type: "error", text: "Nama tim wajib diisi." })
      return
    }

    setTeamSubmitting(true)
    setTeamMsg(null)
    try {
      const payload = {
        registration_id: activeRegistrationId,
        sport_id: selectedSportId,
        category_id: selectedCategoryId || undefined,
        name: teamForm.name.trim(),
      }

      if (teamForm.id) await Repos.registration.updateTeam(teamForm.id, payload)
      else await Repos.registration.createTeam(payload)

      await reloadTeams()
      setTeamModalOpen(false)
      setTeamMsg({ type: "success", text: teamForm.id ? "Tim berhasil diperbarui." : "Tim berhasil ditambahkan." })
      setTeamForm({ name: "" })
    } catch (error) {
      setTeamMsg({ type: "error", text: error instanceof Error ? error.message : "Gagal menyimpan tim." })
    } finally {
      setTeamSubmitting(false)
    }
  }

  const removeTeamRemote = async (teamId: string) => {
    if (ENV.USE_MOCK || !activeRegistrationId) return
    await Repos.registration.deleteTeam(teamId)
    await reloadTeams()
  }

  const startEditAthlete = (athlete: RegistrationAthlete) => {
    setEditingAthlete(athlete)
    setEditAthleteForm({
      name: athlete.name,
      gender: athlete.gender,
      birthDate: athlete.birthDate,
      institution: athlete.institution,
    })
  }

  const submitAthleteEdit = async () => {
    if (!editingAthlete) return
    if (!editAthleteForm.name.trim() || !editAthleteForm.birthDate) {
      alert("Nama dan tanggal lahir atlet wajib diisi.")
      return
    }

    setAthleteSubmitting(true)
    try {
      if (ENV.USE_MOCK || !activeRegistrationId) {
        updateAthlete({
          ...editingAthlete,
          name: editAthleteForm.name.trim(),
          gender: editAthleteForm.gender,
          birthDate: editAthleteForm.birthDate,
          institution: editAthleteForm.institution.trim(),
        })
      } else {
        await Repos.registration.updateAthlete(editingAthlete.id, {
          registration_id: activeRegistrationId,
          team_id: (editingAthlete.teamId ?? selectedTeamId) || undefined,
          sport_id: editingAthlete.sportId,
          category_id: editingAthlete.categoryId,
          name: editAthleteForm.name.trim(),
          gender: editAthleteForm.gender,
          birth_date: editAthleteForm.birthDate,
          institution: editAthleteForm.institution.trim(),
        })
        await refreshRemoteRegistration(activeRegistrationId)
      }
      setEditingAthlete(null)
    } catch (error) {
      alert(error instanceof Error ? error.message : "Gagal memperbarui atlet.")
    } finally {
      setAthleteSubmitting(false)
    }
  }

  const handleAddRoster = () => {
    if (!canEditAthleteStep) return alert("Step 2 terkunci karena pembayaran sudah diajukan.")
    if (!selectedSportId) return alert("Pilih cabor terlebih dahulu.")
    if (!selectedCategoryId) return alert("Pilih kategori/kelas/nomor terlebih dahulu.")

    if (remainingInCategory < needRoster) {
      alert(`Kuota kategori tidak cukup. Sisa kuota kategori: ${Math.max(0, Number.isFinite(remainingInCategory) ? remainingInCategory : 0)} (butuh ${needRoster}).`)
      return
    }

    if (!canUsePaidSlots && !canUseExtraSlots) {
      alert("Slot terbayar habis. Ajukan tambah peserta, tunggu persetujuan admin, lalu selesaikan pembayaran tambahan terlebih dahulu.")
      return
    }

    const rows = athleteForms.slice(0, needRoster).map((a) => ({
      teamId: selectedTeamId || undefined,
      sportId: selectedSportId,
      categoryId: selectedCategoryId,
      name: a.name.trim(),
      gender: a.gender,
      birthDate: a.birthDate,
      institution: a.institution.trim(),
    }))

    if (!ENV.USE_MOCK) {
      void syncAthleteBatch(rows).then(() => {
        resetAthleteForms()
      }).catch((error) => {
        alert(error instanceof Error ? error.message : "Gagal menyimpan atlet ke server.")
      })
      return
    }

    if (canUsePaidSlots) {
      for (let i = 0; i < needRoster; i++) {
        const a = athleteForms[i]
        if (!a?.name?.trim()) return alert("Nama atlet " + (i + 1) + " wajib diisi.")
        if (!a?.birthDate) return alert("Tanggal lahir atlet " + (i + 1) + " wajib diisi.")

        addAthlete({
          teamId: selectedTeamId || undefined,
          sportId: selectedSportId,
          categoryId: selectedCategoryId,
          name: a.name.trim(),
          gender: a.gender,
          birthDate: a.birthDate,
          institution: a.institution.trim(),
          registrationState: {
            pricingStatus: "INITIAL_PAID",
            source: "INITIAL_QUOTA",
            isActive: true,
          },
        } as any)
      }

      resetAthleteForms()
      return
    }

    for (let i = 0; i < needRoster; i++) {
      const a = athleteForms[i]
      if (!a?.name?.trim()) return alert("Nama atlet " + (i + 1) + " wajib diisi.")
      if (!a?.birthDate) return alert("Tanggal lahir atlet " + (i + 1) + " wajib diisi.")

      addAthlete({
        teamId: selectedTeamId || undefined,
        sportId: selectedSportId,
        categoryId: selectedCategoryId,
        name: a.name.trim(),
        gender: a.gender,
        birthDate: a.birthDate,
        institution: a.institution.trim(),
        registrationState: {
          pricingStatus: "TOP_UP_PAID",
          source: "EXTRA_ACCESS",
          isActive: true,
        },
      } as any)
    }

    resetAthleteForms()
    alert("Kuota tambahan berhasil diisi tanpa mengubah kuota lama.")
  }

  const handleAddOfficial = () => {
    if (!canEditAthleteStep) return alert("Step 2 terkunci karena pembayaran sudah diajukan.")
    if (!selectedSportId) return alert("Pilih cabor dulu.")
    if (officialQuota <= 0) return alert("Kuota official untuk cabor ini 0. Atur di Step 1.")
    if (officialsForSelectedSport.length >= officialQuota) return alert("Kuota official untuk cabor ini sudah penuh.")
    if (!officialForm.name.trim()) return alert("Nama official wajib diisi.")

    addOfficial({
      sportId: selectedSportId,
      name: officialForm.name.trim(),
      phone: officialForm.phone.trim() || undefined,
      role: officialForm.role,
    } as any)

    setOfficialForm({ name: "", phone: "", role: "OFFICIAL" })
  }

  if (!hydrateReady) {
    return (
      <div className="max-w-6xl">
        <div className="bg-white border rounded-xl p-6 shadow-sm text-sm text-gray-600">Memuat data atlet...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <Modal
        open={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        title={teamForm.id ? "Edit Tim" : "Tambah Tim"}
        className="max-w-xl"
      >
        <div className="space-y-4">
          <Input
            label="Nama Tim"
            value={teamForm.name}
            onChange={(e) => setTeamForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Contoh: Tim Putra A"
          />
          {teamMsg ? (
            <div className={cx(
              "rounded-xl border px-4 py-3 text-sm font-semibold",
              teamMsg.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-rose-200 bg-rose-50 text-rose-800"
            )}>
              {teamMsg.text}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => void submitTeam()}
            disabled={teamSubmitting}
            className={cx(
              "w-full rounded-xl px-4 py-2.5 font-extrabold",
              teamSubmitting ? "bg-gray-200 text-gray-500" : "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white"
            )}
          >
            {teamSubmitting ? "Menyimpan..." : teamForm.id ? "Simpan Perubahan Tim" : "Tambah Tim"}
          </button>
        </div>
      </Modal>

      <Modal
        open={!!editingAthlete}
        onClose={() => setEditingAthlete(null)}
        title="Edit Atlet"
        className="max-w-2xl"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Nama Atlet"
            value={editAthleteForm.name}
            onChange={(e) => setEditAthleteForm((prev) => ({ ...prev, name: e.target.value }))}
          />
          <div className="space-y-1">
            <label className="block text-sm font-extrabold text-gray-900">Jenis Kelamin</label>
            <select
              value={editAthleteForm.gender}
              onChange={(e) => setEditAthleteForm((prev) => ({ ...prev, gender: e.target.value as Gender }))}
              className="w-full rounded-2xl border px-4 py-2.5 text-sm font-medium bg-white"
            >
              <option value="PUTRA">Putra</option>
              <option value="PUTRI">Putri</option>
            </select>
          </div>
          <Input
            label="Tanggal Lahir"
            type="date"
            value={editAthleteForm.birthDate}
            onChange={(e) => setEditAthleteForm((prev) => ({ ...prev, birthDate: e.target.value }))}
          />
          <Input
            label="Asal Instansi"
            value={editAthleteForm.institution}
            onChange={(e) => setEditAthleteForm((prev) => ({ ...prev, institution: e.target.value }))}
          />
        </div>
        <button
          type="button"
          onClick={() => void submitAthleteEdit()}
          disabled={athleteSubmitting}
          className={cx(
            "mt-4 w-full rounded-xl px-4 py-2.5 font-extrabold",
            athleteSubmitting ? "bg-gray-200 text-gray-500" : "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white"
          )}
        >
          {athleteSubmitting ? "Menyimpan..." : "Simpan Perubahan Atlet"}
        </button>
      </Modal>

      {/* Header */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Step 2 - Input Atlet + Kategori</h1>
            <p className="text-gray-600 mt-2">
              Step 2: pilih <b>kategori/kelas/nomor</b>, lalu input atlet sesuai kuota dari Step 1 (per cabor).<br />
              <span className="text-gray-500">
                Catatan: kategori <b>Ganda</b> otomatis input <b>2 atlet</b>, kategori <b>Tim/Beregu</b> otomatis input sesuai roster.
              </span>
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-700 border-gray-200">
                Payment: {state.payment.status}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-blue-50 text-blue-800 border-blue-200">
                Kuota terbayar: {approvedAthleteQuota}
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200">
                Atlet aktif: {activeAthleteCount}
              </span>
              {pendingTopUpCount > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-amber-50 text-amber-800 border-amber-200">
                  Pending top-up: {pendingTopUpCount}
                </span>
              )}

              {athleteStepLocked && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-yellow-50 text-yellow-800 border-yellow-200">
                  Terkunci karena pembayaran sudah diajukan
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border bg-gray-50 p-4 min-w-[300px]">
            <div className="text-xs text-gray-500">Progress Atlet</div>
            <div className="mt-1 text-2xl font-extrabold text-gray-900">
              {totalFilled} / {totalPlan}
            </div>
            <div className="mt-2 flex gap-2">
              <Link href="/dashboard/pembayaran" className="px-3 py-2 rounded-lg border bg-white font-bold hover:bg-gray-50 text-sm">
                Step 3
              </Link>
              <Link
                href="/dashboard/pendaftaran/dokumen"
                className={cx(
                  "px-3 py-2 rounded-lg font-bold text-sm",
                  canOpenDocuments ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105" : "bg-gray-200 text-gray-600 cursor-not-allowed"
                )}
                onClick={(e) => {
                  if (!canOpenDocuments) {
                    e.preventDefault()
                    alert("Step 4 hanya bisa dibuka setelah pembayaran dilakukan.")
                  }
                }}
              >
                Step 4
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Pilih Cabor */}
      <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
        <div className="text-lg font-extrabold text-gray-900">Pilih Cabor</div>
        <select
          value={selectedSportId}
          onChange={(e) => setSelectedSportId(e.target.value)}
          className="w-full border rounded-xl px-3 py-2"
        >
          {sportOptions.length === 0 ? (
            <option value="">Belum ada cabor berkuota dari Step 1</option>
          ) : (
            sportOptions.map((s: any) => {
              const q = getSportAthleteQuota(s)
              const oq = Number(s.officialCount ?? 0)
              return (
                <option key={s.id} value={s.id}>
                  {s.name} (Kuota Atlet: {q} | Kuota Official: {oq})
                </option>
              )
            })
          )}
        </select>

        {/* Info kuota sport */}
        <div className="rounded-xl border bg-gray-50 p-4">
          <div className="font-extrabold text-gray-900">Info Kuota Cabor</div>
          <div className="text-sm text-gray-700 mt-2">
            <div>
              <b>Kuota dipilih:</b> {sportQuota}
            </div>
            <div className="mt-1">
              <b>Sudah diisi:</b> {filledInSport}
            </div>
            <div className="mt-1">
              <b>Sisa:</b> {Math.max(0, remainingInSport)}
            </div>
          </div>
            <div className="mt-1"><b>Sisa slot terbayar:</b> {paidSlotsRemaining}</div>
            <div className="mt-1"><b>Status akses tambahan:</b> {extraAccess.status}</div>
          {sportQuota <= 0 && (
            <div className="mt-3 text-xs font-bold text-red-700">
              Kuota cabor masih 0. Balik ke Step 1 dan isi jumlah atlet (plannedAthletes/athleteQuota).
            </div>
          )}
        </div>
      </div>

      {/* Ringkasan Kategori + pilih kategori */}
      {!!selectedSportId && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-lg font-extrabold text-gray-900">Ringkasan Kategori (Cabor terpilih)</div>
          <div className="text-sm text-gray-600">
            Menampilkan jumlah atlet yang sudah masuk tiap kategori. <b>Roster</b>: 1 (individu) / 2 (ganda) / 12 (voli) / dst.
          </div>

          {categorySummary.length === 0 ? (
            <div className="text-sm text-gray-500">Kategori belum tersedia untuk cabor ini di SPORTS_CATALOG.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categorySummary.map((c) => {
                const picked = c.id === selectedCategoryId
                const canPick = canEditAthleteStep && remainingInSport >= c.rosterSize && sportQuota > 0
                return (
                  <div
                    key={c.id}
                    className={cx(
                      "rounded-xl border p-4 flex items-center justify-between gap-3",
                      picked ? "border-emerald-200 bg-emerald-50/40" : "bg-white"
                    )}
                  >
                    <div>
                      <div className="font-extrabold text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Roster: <b>{c.rosterSize}</b> | Terisi: <b>{c.filled}</b>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId(c.id)}
                      disabled={!canPick}
                      className={cx(
                        "px-4 py-2 rounded-xl font-extrabold border",
                        canPick ? "bg-white hover:bg-gray-50" : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                      title={
                        !canEditAthleteStep
                          ? "Terkunci karena pembayaran sudah diajukan"
                          : sportQuota <= 0
                          ? "Kuota cabor 0"
                          : remainingInSport < c.rosterSize
                          ? "Sisa kuota tidak cukup untuk roster kategori ini"
                          : ""
                      }
                    >
                      {picked ? "Dipilih" : "Pilih"}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Official */}
      {!!selectedSportId && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-lg font-extrabold text-gray-900">Input Official (per cabor)</div>
          <div className="text-sm text-gray-600">
            Isi nama official sesuai kuota official yang kamu isi di Step 1.
          </div>
          <div className="text-xs text-gray-500">
            Setiap official wajib unggah surat tugas, KTP, dan pas foto di Step 4. Khusus <b>Pelatih</b> wajib menambahkan sertifikat keahlian.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-bold mb-1">Jenis Official</div>
              <select
                value={officialForm.role}
                onChange={(e) => setOfficialForm((p) => ({ ...p, role: e.target.value as OfficialRole }))}
                className="w-full border rounded-xl px-3 py-2 bg-white"
                disabled={!canEditAthleteStep}
              >
                <option value="OFFICIAL">Official</option>
                <option value="PELATIH">Pelatih</option>
              </select>
            </div>
            <div>
              <div className="text-sm font-bold mb-1">Nama Official</div>
              <input
                value={officialForm.name}
                onChange={(e) => setOfficialForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2"
                placeholder="Nama lengkap official"
                disabled={!canEditAthleteStep}
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm font-bold mb-1">No HP/WA (opsional)</div>
              <input
                value={officialForm.phone}
                onChange={(e) => setOfficialForm((p) => ({ ...p, phone: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2"
                placeholder="08xxxxxxxxxx"
                disabled={!canEditAthleteStep}
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <button
              onClick={handleAddOfficial}
              disabled={!canAddOfficialHere}
              className={cx(
                "px-5 py-2 rounded-xl font-extrabold",
                canAddOfficialHere ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105" : "bg-gray-200 text-gray-600 cursor-not-allowed"
              )}
            >
              Tambah Official
            </button>
            <div className="text-xs text-gray-600">
              Kuota official: <b>{officialQuota}</b> | Terisi: <b>{officialsForSelectedSport.length}</b>
            </div>
          </div>

          {/* List official */}
          <div className="pt-2">
            <div className="text-sm font-bold text-gray-900">Daftar Official</div>
            {officialsForSelectedSport.length === 0 ? (
              <div className="mt-2 text-sm text-gray-500">Belum ada official.</div>
            ) : (
              <div className="mt-3 space-y-2">
                {officialsForSelectedSport.map((o) => (
                  <div
                    key={o.id}
                    className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                  >
                    <div>
                      <div className="font-extrabold text-gray-900">{o.name}</div>
                      <div className="text-xs text-gray-600 mt-1">Peran: {getOfficialRoleLabel(o.role)}</div>
                      <div className="text-xs text-gray-600 mt-1">{o.phone ? `WA: ${o.phone}` : "WA: -"}</div>
                      <div className="text-[11px] text-gray-400 mt-1">ID: {o.id}</div>
                    </div>
                    <button
                      onClick={() => {
                        if (!confirm("Hapus official ini?")) return
                        removeOfficial(o.id)
                      }}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-extrabold hover:bg-red-100"
                      disabled={!canEditAthleteStep}
                    >
                      Hapus
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tambah Atlet (dynamic roster) */}
      {!!selectedSportId && (
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-lg font-extrabold text-gray-900">Tambah Atlet</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-bold mb-1">Kategori / Kelas / Nomor</div>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 bg-white"
                disabled={!selectedSportId}
              >
                <option value="">-- Pilih kategori --</option>
                {categoriesForSport.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="text-xs text-gray-500 mt-2">
                Roster kategori terpilih: <b>{Math.max(1, rosterSize || 1)}</b> atlet
              </div>

              {!ENV.USE_MOCK && (
                <div className="mt-4">
                  <div className="text-sm font-bold mb-1">Tim (opsional)</div>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="">Tanpa tim</option>
                    {teamsForSelection.map((team) => (
                      <option key={team.id} value={String(team.id)}>
                        {team.name ?? team.title ?? `Tim ${team.id}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-gray-50 p-4">
              <div className="text-sm font-extrabold text-gray-900">Validasi Kuota</div>
              <div className="text-sm text-gray-700 mt-2">
                <div className="mt-1"><b>Sisa slot terbayar:</b> {paidSlotsRemaining}</div>
                <div className="mt-1"><b>Sisa slot akses tambahan:</b> {extraAccess.status === "OPEN" ? extraSlotsRemaining : 0}</div>
                <div>
                  <b>Sisa kuota cabor:</b> {Math.max(0, remainingInSport)}
                </div>
                <div className="mt-1">
                  <b>Butuh untuk kategori ini:</b> {Math.max(1, rosterSize || 1)}
                </div>
              </div>

              {remainingInSport < (rosterSize || 1) && (
                <div className="mt-3 text-xs font-bold text-red-700">
                  Sisa kuota tidak cukup untuk menambah roster kategori ini.
                </div>
              )}
            </div>
          </div>

          {/* Form Data Diri Peserta */}
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/30 p-4 md:p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-base font-extrabold text-gray-900">Form Data Diri Peserta</div>
                <div className="mt-1 text-xs text-gray-600">Lengkapi nama dan tanggal lahir untuk setiap atlet pada roster kategori ini.</div>
              </div>
              <div className="inline-flex items-center rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-bold text-emerald-800">
                Terisi: {athleteForms.filter((item) => item.name.trim() && item.birthDate).length}/{Math.max(1, rosterSize || 1)} atlet
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {athleteForms.map((a, idx) => (
                <div key={idx} className="rounded-xl border border-emerald-100 bg-white p-4">
                  <div className="font-extrabold text-gray-900">Atlet {idx + 1}</div>
                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <div className="mb-1 text-sm font-bold">Nama Atlet <span className="text-red-600">*</span></div>
                      <input
                        value={a.name}
                        onChange={(e) => updateAthleteForm(idx, { name: e.target.value })}
                        className="w-full border rounded-xl px-3 py-2"
                        placeholder="Nama lengkap"
                        disabled={!canEditAthleteStep}
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-bold">Jenis Kelamin</div>
                      <select
                        value={a.gender}
                        onChange={(e) => updateAthleteForm(idx, { gender: e.target.value as Gender })}
                        className="w-full border rounded-xl px-3 py-2"
                        disabled={!canEditAthleteStep}
                      >
                        <option value="PUTRA">Putra</option>
                        <option value="PUTRI">Putri</option>
                      </select>
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-bold">Tanggal Lahir <span className="text-red-600">*</span></div>
                      <input
                        type="date"
                        value={a.birthDate}
                        onChange={(e) => updateAthleteForm(idx, { birthDate: e.target.value })}
                        className="w-full border rounded-xl px-3 py-2"
                        disabled={!canEditAthleteStep}
                      />
                    </div>

                    <div>
                      <div className="mb-1 text-sm font-bold">Asal Instansi Atlet (opsional)</div>
                      <input
                        value={a.institution}
                        onChange={(e) => updateAthleteForm(idx, { institution: e.target.value })}
                        className="w-full border rounded-xl px-3 py-2"
                        placeholder="Contoh: SMP Muhammadiyah 1"
                        disabled={!canEditAthleteStep}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <button
              disabled={!canAddRoster}
              onClick={handleAddRoster}
              className={cx(
                "px-5 py-2 rounded-xl font-extrabold",
                canAddRoster ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105" : "bg-gray-200 text-gray-500 cursor-not-allowed"
              )}
            >
              Tambah Atlet ({Math.max(1, rosterSize || 1)} orang)
            </button>

            <Link
              href="/dashboard/tambah-peserta"
              className="px-5 py-2 rounded-xl font-extrabold border bg-white hover:bg-gray-50"
            >
              Ajukan Tambah Peserta
            </Link>
            {extraAccess.status === "REQUESTED" && <div className="text-sm text-blue-700">Permintaan tambahan dikirim ke admin dan sedang diverifikasi.</div>}
            {extraAccess.status === "OPEN" && topUp.status !== "APPROVED" && <div className="text-sm text-amber-700">Pengajuan disetujui. Lanjutkan pembayaran tambahan di Step 3.</div>}
            {topUp.additionalAthletes > 0 && <div className="text-sm text-amber-700">Top-up tambahan: Rp {topUp.additionalFee.toLocaleString("id-ID")}</div>}
            {athleteStepLocked && <div className="text-sm text-gray-600">Step 2 terkunci karena pembayaran sudah diajukan.</div>}
          </div>
        </div>
      )}

      {/* List Atlet */}
      {!!selectedSportId && (
        <div className="bg-white border rounded-xl p-6 shadow-sm">
          <div className="text-lg font-extrabold text-gray-900">Daftar Atlet (filter sesuai pilihan)</div>
          <div className="text-sm text-gray-600 mt-1">
            Cabor: <b>{selectedSport?.name ?? selectedSportId}</b>
            {selectedCategoryId ? (
              <>
                {" "} | Kategori: <b>{categoryLabel(selectedSportId, selectedCategoryId)}</b>
              </>
            ) : null}
          </div>

          {athletesFiltered.length === 0 ? (
            <div className="mt-4 text-sm text-gray-500">Belum ada atlet untuk filter ini.</div>
          ) : (
            <div className="mt-4 space-y-3">
              {athletesFiltered.map((a) => (
                <div
                  key={a.id}
                  className="rounded-xl border p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <div className="font-extrabold text-gray-900">{a.name}</div>
                    <div className="mt-1 text-xs font-bold text-gray-600">
                      {(a as any)?.registrationState?.source === "EXTRA_ACCESS" ? "Masuk kuota tambahan" : "Masuk kuota terbayar"}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      <b>Kategori:</b> {categoryLabel(a.sportId, a.categoryId)}
                    </div>
                    {a.teamId ? (
                      <div className="text-xs text-gray-600 mt-1">
                        <b>Tim:</b> {teams.find((team) => String(team.id) === String(a.teamId))?.name ?? a.teamId}
                      </div>
                    ) : null}

                    {/* Progres dokumen per atlet */}
                    {(() => {
                      const doc = documentsByAthleteId.get(a.id)
                      const profileOk = isAthleteProfileComplete(a)
                      const docsOk = isAthleteDocsComplete(doc as any)
                      return (
                        <div className="text-xs text-gray-600 mt-1">
                          <b>Status:</b>{" "}
                          {profileOk && docsOk ? (
                            <span className="text-green-700 font-bold">Lengkap (mengurangi kuota)</span>
                          ) : (
                            <span className="text-yellow-700 font-bold">
                              Belum lengkap {profileOk ? "" : "data diri"} {docsOk ? "" : "dokumen"}
                            </span>
                          )}
                        </div>
                      )
                    })()}

                    <div className="text-xs text-gray-600 mt-1">
                      {a.gender} | Lahir: {a.birthDate || "-"}
                      {a.institution ? ` | ${a.institution}` : ""}
                    </div>
                    <div className="text-[11px] text-gray-400 mt-1">ID: {a.id}</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEditAthlete(a as RegistrationAthlete)}
                      className="px-4 py-2 rounded-xl border bg-white font-extrabold hover:bg-gray-50"
                      disabled={!canEditAthleteStep}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (!confirm("Hapus atlet ini?")) return
                        if (!ENV.USE_MOCK && activeRegistrationId) {
                          void deleteAthleteRemote(a.id).catch((error) => {
                            alert(error instanceof Error ? error.message : "Gagal menghapus atlet.")
                          })
                          return
                        }
                        removeAthlete(a.id)
                      }}
                      className="px-4 py-2 rounded-xl bg-red-50 text-red-700 font-extrabold hover:bg-red-100"
                      disabled={!canEditAthleteStep}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-col md:flex-row gap-3">
            <Link
              href="/dashboard/pendaftaran/dokumen"
              className={cx(
                "px-5 py-2 rounded-xl font-extrabold text-center",
                canOpenDocuments ? "bg-gradient-to-r from-emerald-500 via-lime-500 to-teal-500 text-white shadow-[0_10px_28px_rgba(16,185,129,0.28)] hover:brightness-105" : "bg-gray-200 text-gray-600 cursor-not-allowed"
              )}
              onClick={(e) => {
                if (!canOpenDocuments) {
                  e.preventDefault()
                  alert("Step 4 hanya bisa dibuka setelah pembayaran dilakukan.")
                }
              }}
            >
              Lanjut Step 4 (Upload Dokumen)
            </Link>

            <Link
              href="/dashboard/pembayaran"
              className="px-5 py-2 rounded-xl font-extrabold border bg-white hover:bg-gray-50 text-center"
            >
              Kembali Step 3
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
