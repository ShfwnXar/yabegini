import { Sport } from "@/types/registration"

export const FEES = {
  ATHLETE_PER_PERSON: 150_000,
  OFFICIAL_PER_PERSON: 0,
  VOLI_PER_TEAM: 1_500_000,
} as const

export function countIndividuAthletes(sports: Sport[]) {
  // Menghitung jumlah atlet individu yang pasti berbasis orang:
  // individu = quota
  // ganda = quota * 2
  // tim = 0 (karena roster size tidak didefinisikan untuk semua cabang)
  let total = 0

  for (const sport of sports) {
    for (const cat of sport.categories) {
      if (cat.type === "individu") total += cat.quota
      if (cat.type === "ganda") total += cat.quota * 2
    }
  }

  return total
}

export function countVoliTeams(sports: Sport[]) {
  const voli = sports.find((s) => s.id === "voli")
  if (!voli) return 0

  let teams = 0
  for (const cat of voli.categories) {
    // quota = jumlah tim (0/1/2 dst)
    teams += cat.quota
  }
  return teams
}

export function calculateFeeBreakdown(sports: Sport[], officials: number) {
  const individuAthletes = countIndividuAthletes(sports)
  const voliTeams = countVoliTeams(sports)

  const athleteFee = individuAthletes * FEES.ATHLETE_PER_PERSON
  const officialFee = officials * FEES.OFFICIAL_PER_PERSON
  const voliFee = voliTeams * FEES.VOLI_PER_TEAM

  const total = athleteFee + officialFee + voliFee

  return {
    individuAthletes,
    voliTeams,
    athleteFee,
    officialFee,
    voliFee,
    total,
  }
}


