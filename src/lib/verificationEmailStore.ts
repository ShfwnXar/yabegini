import {
  buildVerificationNotification,
  type VerificationNotificationPayload,
  type VerificationRoleType,
} from "@/lib/documentVerificationNotification"

const LS_VERIFICATION_EMAILS_KEY = "mg26_verification_email_drafts"

export type VerificationEmailDraft = {
  id: string
  userId: string
  recipientEmail: string
  recipientName: string
  roleType: VerificationRoleType
  documentName: string
  verificationStatus: VerificationNotificationPayload["verificationStatus"]
  note?: string | null
  subject: string
  body: string
  nextStep: string
  sentAt: string
}

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function uid() {
  return "mail_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16)
}

function readAllDrafts() {
  if (typeof window === "undefined") return [] as VerificationEmailDraft[]
  return safeParse<VerificationEmailDraft[]>(localStorage.getItem(LS_VERIFICATION_EMAILS_KEY), [])
}

function writeAllDrafts(items: VerificationEmailDraft[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(LS_VERIFICATION_EMAILS_KEY, JSON.stringify(items))
}

export function queueVerificationEmailDraft(input: {
  userId: string
  recipientEmail: string
  recipientName: string
  roleType: VerificationRoleType
  documentName: string
  verificationStatus: VerificationNotificationPayload["verificationStatus"]
  note?: string | null
}) {
  const template = buildVerificationNotification(input)

  const draft: VerificationEmailDraft = {
    id: uid(),
    userId: input.userId,
    recipientEmail: input.recipientEmail,
    recipientName: input.recipientName,
    roleType: input.roleType,
    documentName: input.documentName,
    verificationStatus: input.verificationStatus,
    note: input.note?.trim() || null,
    subject: template.subject,
    body: template.body,
    nextStep: template.nextStep,
    sentAt: new Date().toISOString(),
  }

  const current = readAllDrafts()
  writeAllDrafts([draft, ...current].slice(0, 100))

  return draft
}

export function listVerificationEmailDrafts(userId: string) {
  return readAllDrafts().filter((item) => item.userId === userId)
}
