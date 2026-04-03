import type { DocumentStatus } from "@/data/documentCatalog"

export type VerificationRoleType = "peserta" | "official"

export type VerificationNotificationStatus = Extract<
  DocumentStatus,
  "Disetujui" | "Perlu revisi" | "Ditolak"
>

export type VerificationNotificationPayload = {
  recipientName: string
  roleType: VerificationRoleType
  documentName: string
  verificationStatus: VerificationNotificationStatus
  note?: string | null
}

export function isVerificationNotificationStatus(status?: string): status is VerificationNotificationStatus {
  return status === "Disetujui" || status === "Perlu revisi" || status === "Ditolak"
}

function normalizeNote(note?: string | null) {
  const cleaned = note?.trim()
  return cleaned ? cleaned : null
}

function resolveRoleLabel(roleType: VerificationRoleType) {
  return roleType === "official" ? "Official" : "Peserta"
}

export function buildVerificationNotification(payload: VerificationNotificationPayload) {
  const recipientName = payload.recipientName.trim() || "Peserta"
  const note = normalizeNote(payload.note)
  const roleLabel = resolveRoleLabel(payload.roleType)

  if (payload.verificationStatus === "Disetujui") {
    return {
      subject: `Konfirmasi Verifikasi Berkas: ${payload.documentName} Disetujui`,
      heading: "Berkas berhasil diverifikasi",
      summary: `Berkas ${payload.documentName} untuk ${roleLabel.toLowerCase()} telah disetujui.`,
      body: `Halo ${recipientName}, berkas ${payload.documentName} pada akun ${roleLabel} Anda telah diverifikasi dan dinyatakan sesuai.`,
      nextStep: "Silakan lanjutkan ke tahapan berikutnya sesuai alur pendaftaran yang berlaku.",
      note: null,
      roleLabel,
      statusLabel: "Disetujui",
      tone: "success" as const,
    }
  }

  if (payload.verificationStatus === "Ditolak") {
    return {
      subject: `Pemberitahuan Verifikasi Berkas: ${payload.documentName} Ditolak`,
      heading: "Berkas belum dapat diterima",
      summary: `Berkas ${payload.documentName} untuk ${roleLabel.toLowerCase()} ditolak pada proses verifikasi.`,
      body: `Halo ${recipientName}, berkas ${payload.documentName} pada akun ${roleLabel} Anda belum dapat kami terima berdasarkan hasil pemeriksaan admin.`,
      nextStep: "Mohon periksa kembali dokumen yang diminta sebelum melakukan pengunggahan ulang.",
      note: note ?? "Tidak ada catatan tambahan dari validator.",
      roleLabel,
      statusLabel: "Ditolak",
      tone: "danger" as const,
    }
  }

  return {
    subject: `Pemberitahuan Verifikasi Berkas: ${payload.documentName} Perlu Revisi`,
    heading: "Berkas perlu diperbarui",
    summary: `Berkas ${payload.documentName} untuk ${roleLabel.toLowerCase()} memerlukan revisi.`,
    body: `Halo ${recipientName}, berkas ${payload.documentName} pada akun ${roleLabel} Anda masih perlu diperbaiki agar dapat dilanjutkan ke tahap verifikasi berikutnya.`,
    nextStep: "Silakan perbarui dokumen sesuai catatan validator lalu unggah kembali versi terbaru.",
    note: note ?? "Tidak ada catatan tambahan dari validator.",
    roleLabel,
    statusLabel: "Perlu revisi",
    tone: "warning" as const,
  }
}
