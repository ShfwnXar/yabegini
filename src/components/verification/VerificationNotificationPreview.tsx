"use client"

import {
  buildVerificationNotification,
  type VerificationNotificationPayload,
} from "@/lib/documentVerificationNotification"

type VerificationNotificationPreviewProps = {
  payload: VerificationNotificationPayload
  className?: string
}

function toneClass(tone: "success" | "warning" | "danger") {
  if (tone === "success") return "border-green-200 bg-green-50/80 text-green-900"
  if (tone === "danger") return "border-red-200 bg-red-50/80 text-red-900"
  return "border-amber-200 bg-amber-50/80 text-amber-900"
}

export function VerificationNotificationPreview({
  payload,
  className = "",
}: VerificationNotificationPreviewProps) {
  const notification = buildVerificationNotification(payload)

  return (
    <div className={`rounded-2xl border p-4 ${toneClass(notification.tone)} ${className}`.trim()}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-current/15 bg-white/70 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]">
          Preview Notifikasi
        </span>
        <span className="text-xs font-semibold opacity-80">{notification.statusLabel}</span>
      </div>

      <div className="mt-3 text-sm font-black">{notification.subject}</div>
      <div className="mt-2 text-sm font-semibold">{notification.heading}</div>
      <div className="mt-2 text-sm leading-6 opacity-90">{notification.body}</div>
      <div className="mt-2 text-sm leading-6 opacity-90">{notification.nextStep}</div>

      {notification.note ? (
        <div className="mt-3 rounded-xl border border-current/10 bg-white/75 p-3 text-sm leading-6">
          <div className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">Catatan Validator</div>
          <div className="mt-1">{notification.note}</div>
        </div>
      ) : null}
    </div>
  )
}

export default VerificationNotificationPreview
