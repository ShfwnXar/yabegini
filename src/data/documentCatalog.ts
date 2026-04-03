import type { InstitutionType } from "@/context/AuthContext"

export type ParticipantDocumentCategory = "Pelajar" | "Mahasiswa"

export type DocumentStatus =
  | "Belum upload"
  | "Sudah upload"
  | "Perlu revisi"
  | "Disetujui"
  | "Ditolak"

export type DocumentKey =
  | "buktiTerdaftar"
  | "suratRekomendasi"
  | "suratAktif"
  | "biodataAtlet"
  | "suratPernyataanAtlet"
  | "suratIzinOrangTua"
  | "ktpKia"
  | "aktaKelahiran"
  | "kartuPelajarKtm"
  | "raportKhs"
  | "suratSehatBpjs"
  | "pasFoto"

export type OfficialDocumentKey =
  | "suratTugas"
  | "ktp"
  | "pasFoto"
  | "sertifikatKeahlian"

export type OfficialRole = "OFFICIAL" | "PELATIH"

export type DocumentCatalogItem = {
  key: DocumentKey | OfficialDocumentKey
  label: string
  hint: string
}

export const DOCUMENT_STATUS_OPTIONS: DocumentStatus[] = [
  "Belum upload",
  "Sudah upload",
  "Perlu revisi",
  "Disetujui",
  "Ditolak",
]

export const DOCUMENT_CATALOG: Record<ParticipantDocumentCategory, DocumentCatalogItem[]> = {
  Pelajar: [
    {
      key: "buktiTerdaftar",
      label: "Bukti terdaftar di DAPODIK",
      hint: "Upload bukti resmi terdaftar di DAPODIK dalam format PDF/JPG/PNG.",
    },
    {
      key: "suratRekomendasi",
      label: "Surat rekomendasi PWM/PDM/Pimpinan Sekolah Muhammadiyah",
      hint: "Upload surat rekomendasi resmi dari PWM/PDM/Pimpinan Sekolah Muhammadiyah.",
    },
    {
      key: "suratAktif",
      label: "Surat keterangan aktif dari sekolah",
      hint: "Upload surat keterangan aktif dari sekolah yang masih berlaku.",
    },
    {
      key: "biodataAtlet",
      label: "Biodata atlet",
      hint: "Upload biodata atlet sesuai format yang berlaku.",
    },
    {
      key: "suratPernyataanAtlet",
      label: "Surat pernyataan atlet",
      hint: "Upload surat pernyataan atlet yang sudah ditandatangani.",
    },
    {
      key: "suratIzinOrangTua",
      label: "Surat pernyataan izin orang tua",
      hint: "Upload surat izin orang tua/wali yang telah ditandatangani.",
    },
    {
      key: "ktpKia",
      label: "KTP / KIA",
      hint: "Upload KTP atau KIA yang masih berlaku.",
    },
    {
      key: "aktaKelahiran",
      label: "Scan akta kelahiran",
      hint: "Upload scan akta kelahiran yang terbaca jelas.",
    },
    {
      key: "kartuPelajarKtm",
      label: "Kartu pelajar Muhammadiyah",
      hint: "Upload kartu pelajar Muhammadiyah yang masih berlaku.",
    },
    {
      key: "raportKhs",
      label: "Raport terakhir",
      hint: "Upload raport terakhir yang terbaca jelas.",
    },
    {
      key: "suratSehatBpjs",
      label: "Surat keterangan sehat / BPJS Ketenagakerjaan",
      hint: "Upload salah satu dokumen: surat keterangan sehat atau BPJS Ketenagakerjaan.",
    },
    {
      key: "pasFoto",
      label: "Pas foto 3x4 terbaru (background biru)",
      hint: "Upload pas foto 3x4 terbaru dengan background biru.",
    },
  ],
  Mahasiswa: [
    {
      key: "buktiTerdaftar",
      label: "Bukti terdaftar di PD-DIKTI",
      hint: "Upload bukti resmi terdaftar di PD-DIKTI dalam format PDF/JPG/PNG.",
    },
    {
      key: "suratRekomendasi",
      label: "Surat rekomendasi PWM/PDM/Perguruan Tinggi Muhammadiyah",
      hint: "Upload surat rekomendasi resmi dari PWM/PDM/Perguruan Tinggi Muhammadiyah.",
    },
    {
      key: "suratAktif",
      label: "Surat keterangan aktif kuliah",
      hint: "Upload surat keterangan aktif kuliah yang masih berlaku.",
    },
    {
      key: "biodataAtlet",
      label: "Biodata atlet",
      hint: "Upload biodata atlet sesuai format yang berlaku.",
    },
    {
      key: "suratPernyataanAtlet",
      label: "Surat pernyataan atlet",
      hint: "Upload surat pernyataan atlet yang sudah ditandatangani.",
    },
    {
      key: "suratIzinOrangTua",
      label: "Surat pernyataan izin orang tua",
      hint: "Upload surat izin orang tua/wali yang telah ditandatangani.",
    },
    {
      key: "ktpKia",
      label: "KTP",
      hint: "Upload KTP yang masih berlaku.",
    },
    {
      key: "aktaKelahiran",
      label: "Scan akta kelahiran",
      hint: "Upload scan akta kelahiran yang terbaca jelas.",
    },
    {
      key: "kartuPelajarKtm",
      label: "Kartu Tanda Mahasiswa (KTM)",
      hint: "Upload KTM yang masih berlaku.",
    },
    {
      key: "raportKhs",
      label: "Kartu Hasil Studi (KHS) terakhir",
      hint: "Upload KHS terakhir yang terbaca jelas.",
    },
    {
      key: "suratSehatBpjs",
      label: "Surat keterangan sehat / BPJS Ketenagakerjaan",
      hint: "Upload salah satu dokumen: surat keterangan sehat atau BPJS Ketenagakerjaan.",
    },
    {
      key: "pasFoto",
      label: "Pas foto 3x4 terbaru (background biru)",
      hint: "Upload pas foto 3x4 terbaru dengan background biru.",
    },
  ],
}

export const DOCUMENT_FIELD_KEYS: DocumentKey[] = [
  "buktiTerdaftar",
  "suratRekomendasi",
  "suratAktif",
  "biodataAtlet",
  "suratPernyataanAtlet",
  "suratIzinOrangTua",
  "ktpKia",
  "aktaKelahiran",
  "kartuPelajarKtm",
  "raportKhs",
  "suratSehatBpjs",
  "pasFoto",
]

export const OFFICIAL_DOCUMENT_FIELD_KEYS: OfficialDocumentKey[] = [
  "suratTugas",
  "ktp",
  "pasFoto",
  "sertifikatKeahlian",
]

export const OFFICIAL_DOCUMENT_CATALOG: Record<OfficialRole, DocumentCatalogItem[]> = {
  OFFICIAL: [
    {
      key: "suratTugas",
      label: "Surat mandat / surat tugas dari pimpinan sekolah atau perguruan tinggi",
      hint: "Upload surat mandat atau surat tugas resmi yang masih berlaku dan terbaca jelas.",
    },
    {
      key: "ktp",
      label: "Identitas diri (KTP)",
      hint: "Upload scan/foto KTP yang masih berlaku dan terbaca jelas.",
    },
    {
      key: "pasFoto",
      label: "Pas foto terbaru dengan background biru",
      hint: "Upload pas foto terbaru dengan background biru dalam format PDF/JPG/PNG.",
    },
  ],
  PELATIH: [
    {
      key: "suratTugas",
      label: "Surat mandat / surat tugas dari pimpinan sekolah atau perguruan tinggi",
      hint: "Upload surat mandat atau surat tugas resmi yang masih berlaku dan terbaca jelas.",
    },
    {
      key: "ktp",
      label: "Identitas diri (KTP)",
      hint: "Upload scan/foto KTP yang masih berlaku dan terbaca jelas.",
    },
    {
      key: "pasFoto",
      label: "Pas foto terbaru dengan background biru",
      hint: "Upload pas foto terbaru dengan background biru dalam format PDF/JPG/PNG.",
    },
    {
      key: "sertifikatKeahlian",
      label: "Sertifikat Keahlian",
      hint: "Khusus pelatih. Upload sertifikat keahlian atau lisensi kepelatihan yang masih berlaku.",
    },
  ],
}

export function getOfficialRoleLabel(role?: OfficialRole | string) {
  return role === "PELATIH" ? "Pelatih" : "Official"
}

export function getParticipantDocumentCategory(institutionType?: InstitutionType | string): ParticipantDocumentCategory {
  return institutionType === "UNIVERSITAS_PTMA" ? "Mahasiswa" : "Pelajar"
}

export function getDocumentCatalogForParticipant(institutionType?: InstitutionType | string) {
  return DOCUMENT_CATALOG[getParticipantDocumentCategory(institutionType)]
}

export function getOfficialDocumentCatalog(role?: OfficialRole | string) {
  return OFFICIAL_DOCUMENT_CATALOG[role === "PELATIH" ? "PELATIH" : "OFFICIAL"]
}

export function isFinalDocumentStatus(status?: string) {
  return status === "Disetujui" || status === "Ditolak"
}

export function isUploadedDocumentStatus(status?: string) {
  return status === "Sudah upload" || status === "Perlu revisi" || status === "Disetujui" || status === "Ditolak"
}
