import { getOfficialSelectionMeta } from "@/data/officialSports"
import { SPORTS_CATALOG } from "@/data/sportsCatalog"

export type WinnerPlacement = {
  institutionId: string
  institutionName: string
}

export type WinnerResult = {
  id: string
  date: string
  sportId: string
  sportName: string
  categoryId: string
  categoryName: string
  participantCategoryName?: string
  nomorLombaName?: string
  nomorLombaDisplayName?: string
  gold?: WinnerPlacement
  silver?: WinnerPlacement
  bronze?: WinnerPlacement
  createdAt: string
  updatedAt: string
}

export type MedalRow = {
  id: string
  name: string
  gold: number
  silver: number
  bronze: number
}

export const LS_WINNER_RESULTS = "mg26_winner_results"

export function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function getWinnerResults(): WinnerResult[] {
  return safeParse<WinnerResult[]>(localStorage.getItem(LS_WINNER_RESULTS), []).map((result) => {
    const meta = getOfficialSelectionMeta(result.sportId, result.categoryId)
    if (!meta) return result

    return {
      ...result,
      sportId: meta.sportId,
      sportName: meta.sportName,
      categoryId: meta.nomorLombaId,
      categoryName: meta.nomorLombaDisplayName,
      participantCategoryName: meta.categoryName,
      nomorLombaName: meta.nomorLombaName,
      nomorLombaDisplayName: meta.nomorLombaDisplayName,
    }
  })
}

export function saveWinnerResults(rows: WinnerResult[]) {
  localStorage.setItem(LS_WINNER_RESULTS, JSON.stringify(rows))
}

export function buildMedalTable(results: WinnerResult[]): MedalRow[] {
  const acc = new Map<string, MedalRow>()

  const upsert = (placement: WinnerPlacement | undefined, medal: "gold" | "silver" | "bronze") => {
    if (!placement?.institutionId || !placement.institutionName) return
    const row = acc.get(placement.institutionId) ?? {
      id: placement.institutionId,
      name: placement.institutionName,
      gold: 0,
      silver: 0,
      bronze: 0,
    }
    row[medal] += 1
    acc.set(placement.institutionId, row)
  }

  for (const result of results) {
    upsert(result.gold, "gold")
    upsert(result.silver, "silver")
    upsert(result.bronze, "bronze")
  }

  return [...acc.values()]
}

export function getSportMeta(sportId: string) {
  return SPORTS_CATALOG.find((sport) => sport.id === sportId) ?? null
}
