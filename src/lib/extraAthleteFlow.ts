import type { RegistrationState } from "@/context/RegistrationContext"

export type ExtraAccessStatus = "NONE" | "REQUESTED" | "OPEN" | "CLOSED"
export type TopUpStatus = "NONE" | "REQUIRED" | "PENDING" | "APPROVED" | "REJECTED"

const FEE_ATHLETE = 150_000

export function getApprovedAthleteQuota(state: RegistrationState & Record<string, any>) {
  const explicitQuota = Number(state.approvedAthleteQuota ?? 0)
  if (Number.isFinite(explicitQuota) && explicitQuota > 0) return Math.max(0, explicitQuota)

  if (state.payment?.status === "APPROVED") {
    const fallbackQuota = (state.sports || []).reduce((total: number, sport: any) => {
      if (sport?.id === "voli_indoor") {
        const men = Math.max(0, Number(sport?.voliMenTeams ?? 0))
        const women = Math.max(0, Number(sport?.voliWomenTeams ?? 0))
        return total + (men + women) * 12
      }
      return total + Math.max(0, Number(sport?.athleteQuota ?? sport?.plannedAthletes ?? 0))
    }, 0)
    if (fallbackQuota > 0) return fallbackQuota
  }

  return Math.max(0, Number(state.athletes?.length ?? 0))
}

export function getActiveAthleteCount(state: RegistrationState) {
  return (state.athletes || []).filter((athlete: any) => athlete?.registrationState?.isActive !== false).length
}

export function getPendingTopUpCount(state: RegistrationState) {
  return (state.athletes || []).filter((athlete: any) => athlete?.registrationState?.pricingStatus === "PENDING_TOP_UP").length
}

export function getExtraAccess(state: RegistrationState & Record<string, any>) {
  const rawItems = Array.isArray(state.extraAthleteAccess?.requestItems) ? state.extraAthleteAccess.requestItems : []
  const normalizedItems = rawItems.map((item: any) => ({
    sportId: String(item?.sportId ?? ""),
    sportName: String(item?.sportName ?? ""),
    requestedSlots: Math.max(0, Number(item?.requestedSlots ?? 0)),
    approvedSlots: Math.max(0, Number(item?.approvedSlots ?? 0)),
  })).filter((item: any) => item.sportId && item.requestedSlots > 0)
  const fallbackRequestedSlots = Math.max(0, Number(state.extraAthleteAccess?.requestedSlots ?? 0))
  const fallbackApprovedSlots = Math.max(0, Number(state.extraAthleteAccess?.approvedSlots ?? 0))
  const legacyItem = state.extraAthleteAccess?.requestedSportId ? [{
    sportId: String(state.extraAthleteAccess.requestedSportId),
    sportName: String(state.extraAthleteAccess?.requestedSportName ?? "Cabor tambahan"),
    requestedSlots: fallbackRequestedSlots,
    approvedSlots: fallbackApprovedSlots,
  }] : []
  const requestItems = normalizedItems.length > 0 ? normalizedItems : legacyItem
  const requestedSlots = requestItems.reduce((total: number, item: any) => total + Math.max(0, Number(item.requestedSlots ?? 0)), 0)
  const approvedSlots = requestItems.reduce((total: number, item: any) => total + Math.max(0, Number(item.approvedSlots ?? 0)), 0)
  return {
    status: (state.extraAthleteAccess?.status ?? "NONE") as ExtraAccessStatus,
    requestedSlots,
    approvedSlots,
    requestedSportId: state.extraAthleteAccess?.requestedSportId as string | undefined,
    requestedSportName: state.extraAthleteAccess?.requestedSportName as string | undefined,
    requestItems,
    requestedReason: state.extraAthleteAccess?.requestedReason as string | undefined,
    adminNote: state.extraAthleteAccess?.adminNote as string | undefined,
    requestedAt: state.extraAthleteAccess?.requestedAt as string | undefined,
    approvedAt: state.extraAthleteAccess?.approvedAt as string | undefined,
  }
}

export function getApprovedExtraSlotsForSport(state: RegistrationState & Record<string, any>, sportId: string) {
  if (!sportId) return 0
  return getExtraAccess(state).requestItems.filter((item: any) => item.sportId === sportId).reduce((total: number, item: any) => total + Math.max(0, Number(item.approvedSlots ?? 0)), 0)
}

export function getUsedExtraSlotsForSport(state: RegistrationState, sportId: string) {
  if (!sportId) return 0
  return (state.athletes || []).filter((athlete: any) => athlete?.sportId === sportId && athlete?.registrationState?.source === "EXTRA_ACCESS" && athlete?.registrationState?.isActive !== false).length
}
export function getTopUp(state: RegistrationState & Record<string, any>) {
  const topUp = state.topUpPayment ?? {}
  const additionalAthletes = Math.max(0, Number(topUp.additionalAthletes ?? getExtraAccess(state).approvedSlots))

  return {
    status: (topUp.status ?? "NONE") as TopUpStatus,
    additionalAthletes,
    additionalFee: Math.max(0, Number(topUp.additionalFee ?? additionalAthletes * FEE_ATHLETE)),
    proofFileId: topUp.proofFileId as string | undefined,
    proofFileName: topUp.proofFileName as string | undefined,
    proofMimeType: topUp.proofMimeType as string | undefined,
    uploadedAt: topUp.uploadedAt as string | undefined,
    approvedAt: topUp.approvedAt as string | undefined,
    approvedBy: topUp.approvedBy as string | undefined,
    note: topUp.note as string | undefined,
  }
}

export function withExtraFlow(state: RegistrationState & Record<string, any>) {
  const activeAthleteCount = getActiveAthleteCount(state)
  const extraAccess = getExtraAccess(state)
  const requestedSlots = extraAccess.requestedSlots
  const approvedSlots = extraAccess.approvedSlots
  const topUpSlots = Math.max(0, Number(state.topUpPayment?.additionalAthletes ?? approvedSlots))
  const topUpStatus = (state.topUpPayment?.status ?? "NONE") as TopUpStatus

  return {
    ...state,
    approvedAthleteQuota: getApprovedAthleteQuota(state),
    activeAthleteCount,
    extraAthleteAccess: {
      status: state.extraAthleteAccess?.status ?? "NONE",
      requestedSlots,
      approvedSlots,
      requestedSportId: state.extraAthleteAccess?.requestedSportId,
      requestedSportName: state.extraAthleteAccess?.requestedSportName,
      requestItems: extraAccess.requestItems,
      requestedReason: state.extraAthleteAccess?.requestedReason,
      adminNote: state.extraAthleteAccess?.adminNote,
      requestedAt: state.extraAthleteAccess?.requestedAt,
      approvedAt: state.extraAthleteAccess?.approvedAt,
      approvedBy: state.extraAthleteAccess?.approvedBy,
      expiresAt: state.extraAthleteAccess?.expiresAt,
    },
    topUpPayment: {
      status: topUpStatus,
      additionalAthletes: topUpSlots,
      additionalFee: Math.max(0, Number(state.topUpPayment?.additionalFee ?? topUpSlots * FEE_ATHLETE)),
      proofFileId: state.topUpPayment?.proofFileId,
      proofFileName: state.topUpPayment?.proofFileName,
      proofMimeType: state.topUpPayment?.proofMimeType,
      uploadedAt: state.topUpPayment?.uploadedAt,
      approvedAt: state.topUpPayment?.approvedAt,
      approvedBy: state.topUpPayment?.approvedBy,
      note: state.topUpPayment?.note,
    },
    updatedAt: new Date().toISOString(),
  }
}

