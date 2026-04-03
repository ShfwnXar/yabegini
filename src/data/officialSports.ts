export type OfficialDetailItem = {
  id: string
  name: string
  rosterSize: number
}

export type OfficialGroupedNomorLomba = {
  jenis: string
  detail: OfficialDetailItem[]
}

export type OfficialSimpleNomorLomba = OfficialDetailItem

export type OfficialCategoryReference = {
  name: string
  nomor_lomba: Array<OfficialGroupedNomorLomba | OfficialSimpleNomorLomba>
}

export type OfficialSportReference = {
  id: string
  name: string
  kategori: OfficialCategoryReference[]
}

export type FlattenedSportCategory = {
  id: string
  name: string
  rosterSize: number
  categoryName: string
  nomorLombaName: string
  detailName?: string
}

export type FlattenedSportCatalog = {
  id: string
  name: string
  categories: FlattenedSportCategory[]
}

export type OfficialNomorLombaOption = {
  id: string
  name: string
  displayName: string
  groupName?: string
  rosterSize: number
}

export type OfficialCategoryOption = {
  name: string
  nomorLomba: OfficialNomorLombaOption[]
}

const legacySlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")

export const OFFICIAL_SPORTS_REFERENCE: OfficialSportReference[] = [
  {
    id: "pencak_silat",
    name: "Pencak Silat",
    kategori: [
      {
        name: "SMP/MTs",
        nomor_lomba: [
          {
            jenis: "Tanding",
            detail: [
              { id: "ps_smp_tanding_kelas_d", name: "Kelas D (36\u201339 kg)", rosterSize: 1 },
              { id: "ps_smp_tanding_kelas_e", name: "Kelas E (39\u201342 kg)", rosterSize: 1 },
              { id: "ps_smp_tanding_kelas_f", name: "Kelas F (42\u201345 kg)", rosterSize: 1 },
              { id: "ps_smp_tanding_kelas_g", name: "Kelas G (45\u201348 kg)", rosterSize: 1 },
              { id: "ps_smp_tanding_kelas_h", name: "Kelas H (48\u201351 kg)", rosterSize: 1 },
              { id: "ps_smp_tanding_kelas_i", name: "Kelas I (51\u201354 kg)", rosterSize: 1 },
              { id: "ps_smp_tanding_kelas_j", name: "Kelas J (54\u201357 kg)", rosterSize: 1 },
            ],
          },
          {
            jenis: "Seni",
            detail: [
              { id: "ps_smp_seni_tunggal_tapak_suci", name: "Tunggal Tangan Kosong (Tapak Suci)", rosterSize: 1 },
              { id: "ps_smp_seni_ganda_ipsi", name: "Ganda (IPSI)", rosterSize: 2 },
            ],
          },
        ],
      },
      {
        name: "SMA/MA",
        nomor_lomba: [
          {
            jenis: "Tanding",
            detail: [
              { id: "ps_sma_tanding_kelas_b", name: "Kelas B (43\u201347 kg)", rosterSize: 1 },
              { id: "ps_sma_tanding_kelas_c", name: "Kelas C (47\u201351 kg)", rosterSize: 1 },
              { id: "ps_sma_tanding_kelas_d", name: "Kelas D (51\u201355 kg)", rosterSize: 1 },
              { id: "ps_sma_tanding_kelas_e", name: "Kelas E (55\u201359 kg)", rosterSize: 1 },
              { id: "ps_sma_tanding_kelas_f", name: "Kelas F (59\u201363 kg)", rosterSize: 1 },
              { id: "ps_sma_tanding_kelas_g", name: "Kelas G (63\u201367 kg)", rosterSize: 1 },
            ],
          },
          {
            jenis: "Seni",
            detail: [
              { id: "ps_sma_seni_tunggal", name: "Tunggal Tangan Kosong", rosterSize: 1 },
              { id: "ps_sma_seni_ganda_ipsi", name: "Ganda IPSI", rosterSize: 2 },
            ],
          },
        ],
      },
      {
        name: "Mahasiswa",
        nomor_lomba: [
          {
            jenis: "Tanding",
            detail: [
              { id: "ps_mhs_tanding_kelas_a", name: "Kelas A (45\u201350 kg)", rosterSize: 1 },
              { id: "ps_mhs_tanding_kelas_b", name: "Kelas B (50\u201355 kg)", rosterSize: 1 },
              { id: "ps_mhs_tanding_kelas_c", name: "Kelas C (55\u201360 kg)", rosterSize: 1 },
              { id: "ps_mhs_tanding_kelas_d", name: "Kelas D (60\u201365 kg)", rosterSize: 1 },
              { id: "ps_mhs_tanding_kelas_e", name: "Kelas E (65\u201370 kg)", rosterSize: 1 },
              { id: "ps_mhs_tanding_kelas_f", name: "Kelas F (70\u201375 kg)", rosterSize: 1 },
              { id: "ps_mhs_tanding_kelas_g", name: "Kelas G (75\u201380 kg)", rosterSize: 1 },
              { id: "ps_mhs_tanding_kelas_h", name: "Kelas H (80\u201385 kg)", rosterSize: 1 },
              { id: "ps_mhs_tanding_kelas_i", name: "Kelas I (85\u201390 kg)", rosterSize: 1 },
              {
                id: "ps_mhs_tanding_kelas_bebas_beregu",
                name: "Kelas Bebas Beregu (>65 kg putra / >55 kg putri)",
                rosterSize: 5,
              },
            ],
          },
          {
            jenis: "Seni",
            detail: [
              { id: "ps_mhs_seni_tunggal", name: "Tunggal Tangan Kosong", rosterSize: 1 },
              { id: "ps_mhs_seni_ganda_ipsi", name: "Ganda IPSI", rosterSize: 2 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "atletik",
    name: "Atletik",
    kategori: [
      {
        name: "SMP/MTs",
        nomor_lomba: [
          { id: "atl_smp_100m", name: "100 meter (Putra/Putri)", rosterSize: 1 },
          { id: "atl_smp_400m", name: "400 meter", rosterSize: 1 },
          { id: "atl_smp_800m", name: "800 meter", rosterSize: 1 },
          { id: "atl_smp_estafet_4x400", name: "Estafet 4x400 meter", rosterSize: 4 },
          { id: "atl_smp_lompat_jauh", name: "Lompat jauh", rosterSize: 1 },
          { id: "atl_smp_tolak_peluru", name: "Tolak peluru", rosterSize: 1 },
        ],
      },
      {
        name: "SMA/MA",
        nomor_lomba: [
          { id: "atl_sma_100m", name: "100 meter", rosterSize: 1 },
          { id: "atl_sma_400m", name: "400 meter", rosterSize: 1 },
          { id: "atl_sma_800m", name: "800 meter", rosterSize: 1 },
          { id: "atl_sma_estafet_4x400", name: "Estafet 4x400 meter", rosterSize: 4 },
          { id: "atl_sma_lompat_jauh", name: "Lompat jauh", rosterSize: 1 },
          { id: "atl_sma_tolak_peluru", name: "Tolak peluru", rosterSize: 1 },
        ],
      },
      {
        name: "Mahasiswa",
        nomor_lomba: [
          { id: "atl_mhs_100m", name: "100 meter (Putra & Putri)", rosterSize: 1 },
          { id: "atl_mhs_400m", name: "400 meter (Putra & Putri)", rosterSize: 1 },
        ],
      },
    ],
  },
  {
    id: "panahan",
    name: "Panahan",
    kategori: [
      {
        name: "SD/MI",
        nomor_lomba: [
          { id: "pan_sd_standar_nasional_20m", name: "Standar Nasional 20 m (Putra/Putri)", rosterSize: 1 },
          { id: "pan_sd_barebow_10m", name: "Barebow 10 m", rosterSize: 1 },
          { id: "pan_sd_horsebow_10m", name: "Horsebow 10 m", rosterSize: 1 },
        ],
      },
      {
        name: "SMP/MTs",
        nomor_lomba: [
          { id: "pan_smp_standar_nasional_30m", name: "Standar Nasional 30 m", rosterSize: 1 },
          { id: "pan_smp_barebow_15m", name: "Barebow 15 m", rosterSize: 1 },
          { id: "pan_smp_horsebow_15m", name: "Horsebow 15 m", rosterSize: 1 },
        ],
      },
      {
        name: "SMA/MA",
        nomor_lomba: [
          { id: "pan_sma_standar_nasional_40m", name: "Standar Nasional 40 m", rosterSize: 1 },
          { id: "pan_sma_barebow_20m", name: "Barebow 20 m", rosterSize: 1 },
          { id: "pan_sma_horsebow_20m", name: "Horsebow 20 m", rosterSize: 1 },
        ],
      },
      {
        name: "Mahasiswa",
        nomor_lomba: [
          { id: "pan_mhs_barebow_30m", name: "Barebow 30 m (Putra/Putri)", rosterSize: 1 },
          { id: "pan_mhs_horsebow_30m", name: "Horsebow 30 m (Putra/Putri)", rosterSize: 1 },
        ],
      },
    ],
  },
  {
    id: "bulu_tangkis",
    name: "Bulu Tangkis",
    kategori: [
      {
        name: "SMP/MTs",
        nomor_lomba: [
          { id: "bt_smp_single_putra", name: "Single Putra", rosterSize: 1 },
          { id: "bt_smp_double_putra", name: "Double Putra", rosterSize: 2 },
          { id: "bt_smp_single_putri", name: "Single Putri", rosterSize: 1 },
          { id: "bt_smp_double_putri", name: "Double Putri", rosterSize: 2 },
        ],
      },
      {
        name: "SMA/MA",
        nomor_lomba: [
          { id: "bt_sma_single_putra", name: "Single Putra", rosterSize: 1 },
          { id: "bt_sma_double_putra", name: "Double Putra", rosterSize: 2 },
          { id: "bt_sma_single_putri", name: "Single Putri", rosterSize: 1 },
          { id: "bt_sma_double_putri", name: "Double Putri", rosterSize: 2 },
        ],
      },
    ],
  },
  {
    id: "voli_indoor",
    name: "Bola Voli Indoor",
    kategori: [
      {
        name: "SMA/MA",
        nomor_lomba: [
          { id: "voli_sma_beregu_putra", name: "Beregu Putra", rosterSize: 12 },
          { id: "voli_sma_beregu_putri", name: "Beregu Putri", rosterSize: 12 },
        ],
      },
      {
        name: "Mahasiswa",
        nomor_lomba: [
          { id: "voli_mhs_beregu_putra", name: "Beregu Putra", rosterSize: 12 },
          { id: "voli_mhs_beregu_putri", name: "Beregu Putri", rosterSize: 12 },
        ],
      },
    ],
  },
  {
    id: "tenis_meja",
    name: "Tenis Meja",
    kategori: [
      {
        name: "SMA/MA",
        nomor_lomba: [
          { id: "tm_sma_tunggal_putra", name: "Tunggal Putra", rosterSize: 1 },
          { id: "tm_sma_ganda_putra", name: "Ganda Putra", rosterSize: 2 },
          { id: "tm_sma_tunggal_putri", name: "Tunggal Putri", rosterSize: 1 },
          { id: "tm_sma_ganda_putri", name: "Ganda Putri", rosterSize: 2 },
          { id: "tm_sma_ganda_campuran", name: "Ganda Campuran", rosterSize: 2 },
        ],
      },
    ],
  },
]

export function isGroupedNomorLomba(
  item: OfficialGroupedNomorLomba | OfficialSimpleNomorLomba
): item is OfficialGroupedNomorLomba {
  return "jenis" in item
}

export const SPORTS_CATALOG: FlattenedSportCatalog[] = OFFICIAL_SPORTS_REFERENCE.map((sport) => ({
  id: sport.id,
  name: sport.name,
  categories: sport.kategori.flatMap((kategori) =>
    kategori.nomor_lomba.flatMap((nomor) => {
      if (isGroupedNomorLomba(nomor)) {
        return nomor.detail.map((detail) => ({
          id: detail.id,
          name: `${kategori.name} - ${nomor.jenis} - ${detail.name}`,
          rosterSize: detail.rosterSize,
          categoryName: kategori.name,
          nomorLombaName: nomor.jenis,
          detailName: detail.name,
        }))
      }

      return [
        {
          id: nomor.id,
          name: `${kategori.name} - ${nomor.name}`,
          rosterSize: nomor.rosterSize,
          categoryName: kategori.name,
          nomorLombaName: nomor.name,
        },
      ]
    })
  ),
}))

const SPORT_ID_ALIASES: Record<string, string> = {
  silat: "pencak_silat",
  badminton: "bulu_tangkis",
  tenismeja: "tenis_meja",
  voli: "voli_indoor",
}

const CATEGORY_ID_ALIASES: Record<string, Record<string, string>> = {
  pencak_silat: {
    [legacySlug("SMP Tanding 36-39 Putra/Putri")]: "ps_smp_tanding_kelas_d",
    [legacySlug("SMP Tanding 39-42 Putra/Putri")]: "ps_smp_tanding_kelas_e",
    [legacySlug("SMP Tanding 42-45 Putra/Putri")]: "ps_smp_tanding_kelas_f",
    [legacySlug("SMP Tanding 45-48 Putra/Putri")]: "ps_smp_tanding_kelas_g",
    [legacySlug("SMP Tanding 48-51 Putra/Putri")]: "ps_smp_tanding_kelas_h",
    [legacySlug("SMP Tanding 51-54 Putra/Putri")]: "ps_smp_tanding_kelas_i",
    [legacySlug("SMP Tanding 54-57 Putra/Putri")]: "ps_smp_tanding_kelas_j",
    [legacySlug("SMP Seni Tunggal Tangan Kosong")]: "ps_smp_seni_tunggal_tapak_suci",
    [legacySlug("SMP Seni Ganda IPSI")]: "ps_smp_seni_ganda_ipsi",
    [legacySlug("SMA Tanding 43-47 Putra/Putri")]: "ps_sma_tanding_kelas_b",
    [legacySlug("SMA Tanding 47-51 Putra/Putri")]: "ps_sma_tanding_kelas_c",
    [legacySlug("SMA Tanding 51-55 Putra/Putri")]: "ps_sma_tanding_kelas_d",
    [legacySlug("SMA Tanding 55-59 Putra/Putri")]: "ps_sma_tanding_kelas_e",
    [legacySlug("SMA Tanding 59-63 Putra/Putri")]: "ps_sma_tanding_kelas_f",
    [legacySlug("SMA Tanding 63-67 Putra/Putri")]: "ps_sma_tanding_kelas_g",
    [legacySlug("SMA Seni Tunggal Tangan Kosong")]: "ps_sma_seni_tunggal",
    [legacySlug("SMA Seni Ganda IPSI")]: "ps_sma_seni_ganda_ipsi",
    [legacySlug("Mhs Seni Tunggal")]: "ps_mhs_seni_tunggal",
    [legacySlug("Mhs Seni Ganda IPSI")]: "ps_mhs_seni_ganda_ipsi",
    [legacySlug("Mhs Putra 45-50")]: "ps_mhs_tanding_kelas_a",
    [legacySlug("Mhs Putra 50-55")]: "ps_mhs_tanding_kelas_b",
    [legacySlug("Mhs Putra 55-60")]: "ps_mhs_tanding_kelas_c",
    [legacySlug("Mhs Putra 60-65")]: "ps_mhs_tanding_kelas_d",
    [legacySlug("Mhs Putra 65-70")]: "ps_mhs_tanding_kelas_e",
    [legacySlug("Mhs Putra 70-75")]: "ps_mhs_tanding_kelas_f",
    [legacySlug("Mhs Putra 75-80")]: "ps_mhs_tanding_kelas_g",
    [legacySlug("Mhs Putra 80-85")]: "ps_mhs_tanding_kelas_h",
    [legacySlug("Mhs Putra 85-90")]: "ps_mhs_tanding_kelas_i",
    [legacySlug("Mhs Putri 45-50")]: "ps_mhs_tanding_kelas_a",
    [legacySlug("Mhs Putri 50-55")]: "ps_mhs_tanding_kelas_b",
    [legacySlug("Mhs Putri 55-60")]: "ps_mhs_tanding_kelas_c",
    [legacySlug("Mhs Putri 60-65")]: "ps_mhs_tanding_kelas_d",
    [legacySlug("Mhs Putri 65-70")]: "ps_mhs_tanding_kelas_e",
    [legacySlug("Mhs Putri 70-75")]: "ps_mhs_tanding_kelas_f",
    [legacySlug("Mhs Beregu Putra >=65")]: "ps_mhs_tanding_kelas_bebas_beregu",
    [legacySlug("Mhs Beregu Putri >=55")]: "ps_mhs_tanding_kelas_bebas_beregu",
    silat_smp_tanding_putra_36_39: "ps_smp_tanding_kelas_d",
    silat_smp_tanding_putra_39_42: "ps_smp_tanding_kelas_e",
    silat_smp_tanding_putra_42_45: "ps_smp_tanding_kelas_f",
    silat_smp_tanding_putra_45_48: "ps_smp_tanding_kelas_g",
    silat_smp_tanding_putra_48_51: "ps_smp_tanding_kelas_h",
    silat_smp_tanding_putra_51_54: "ps_smp_tanding_kelas_i",
    silat_smp_tanding_putra_54_57: "ps_smp_tanding_kelas_j",
    silat_smp_tanding_putri_36_39: "ps_smp_tanding_kelas_d",
    silat_smp_tanding_putri_39_42: "ps_smp_tanding_kelas_e",
    silat_smp_tanding_putri_42_45: "ps_smp_tanding_kelas_f",
    silat_smp_tanding_putri_45_48: "ps_smp_tanding_kelas_g",
    silat_smp_tanding_putri_48_51: "ps_smp_tanding_kelas_h",
    silat_smp_tanding_putri_51_54: "ps_smp_tanding_kelas_i",
    silat_smp_tanding_putri_54_57: "ps_smp_tanding_kelas_j",
    silat_smp_seni_tunggal: "ps_smp_seni_tunggal_tapak_suci",
    silat_smp_seni_ganda: "ps_smp_seni_ganda_ipsi",
    silat_sma_tanding_putra_43_47: "ps_sma_tanding_kelas_b",
    silat_sma_tanding_putra_47_51: "ps_sma_tanding_kelas_c",
    silat_sma_tanding_putra_51_55: "ps_sma_tanding_kelas_d",
    silat_sma_tanding_putra_55_59: "ps_sma_tanding_kelas_e",
    silat_sma_tanding_putra_59_63: "ps_sma_tanding_kelas_f",
    silat_sma_tanding_putra_63_67: "ps_sma_tanding_kelas_g",
    silat_sma_tanding_putri_43_47: "ps_sma_tanding_kelas_b",
    silat_sma_tanding_putri_47_51: "ps_sma_tanding_kelas_c",
    silat_sma_tanding_putri_51_55: "ps_sma_tanding_kelas_d",
    silat_sma_tanding_putri_55_59: "ps_sma_tanding_kelas_e",
    silat_sma_tanding_putri_59_63: "ps_sma_tanding_kelas_f",
    silat_sma_tanding_putri_63_67: "ps_sma_tanding_kelas_g",
    silat_sma_seni_tunggal: "ps_sma_seni_tunggal",
    silat_sma_seni_ganda: "ps_sma_seni_ganda_ipsi",
    silat_mhs_tanding_putra_45_50: "ps_mhs_tanding_kelas_a",
    silat_mhs_tanding_putra_50_55: "ps_mhs_tanding_kelas_b",
    silat_mhs_tanding_putra_55_60: "ps_mhs_tanding_kelas_c",
    silat_mhs_tanding_putra_60_65: "ps_mhs_tanding_kelas_d",
    silat_mhs_tanding_putra_65_70: "ps_mhs_tanding_kelas_e",
    silat_mhs_tanding_putra_70_75: "ps_mhs_tanding_kelas_f",
    silat_mhs_tanding_putra_75_80: "ps_mhs_tanding_kelas_g",
    silat_mhs_tanding_putra_80_85: "ps_mhs_tanding_kelas_h",
    silat_mhs_tanding_putra_85_90: "ps_mhs_tanding_kelas_i",
    silat_mhs_tanding_putri_45_50: "ps_mhs_tanding_kelas_a",
    silat_mhs_tanding_putri_50_55: "ps_mhs_tanding_kelas_b",
    silat_mhs_tanding_putri_55_60: "ps_mhs_tanding_kelas_c",
    silat_mhs_tanding_putri_60_65: "ps_mhs_tanding_kelas_d",
    silat_mhs_tanding_putri_65_70: "ps_mhs_tanding_kelas_e",
    silat_mhs_tanding_putri_70_75: "ps_mhs_tanding_kelas_f",
    silat_mhs_bebas_beregu_putra: "ps_mhs_tanding_kelas_bebas_beregu",
    silat_mhs_bebas_beregu_putri: "ps_mhs_tanding_kelas_bebas_beregu",
    silat_mhs_seni_tunggal: "ps_mhs_seni_tunggal",
    silat_mhs_seni_ganda: "ps_mhs_seni_ganda_ipsi",
  },
  atletik: {
    [legacySlug("SMP 100m")]: "atl_smp_100m",
    [legacySlug("SMP 400m")]: "atl_smp_400m",
    [legacySlug("SMP 800m")]: "atl_smp_800m",
    [legacySlug("SMP Estafet 4x400")]: "atl_smp_estafet_4x400",
    [legacySlug("SMP Lompat Jauh")]: "atl_smp_lompat_jauh",
    [legacySlug("SMP Tolak Peluru")]: "atl_smp_tolak_peluru",
    [legacySlug("SMA 100m")]: "atl_sma_100m",
    [legacySlug("SMA 400m")]: "atl_sma_400m",
    [legacySlug("SMA 800m")]: "atl_sma_800m",
    [legacySlug("SMA Estafet 4x400")]: "atl_sma_estafet_4x400",
    [legacySlug("SMA Lompat Jauh")]: "atl_sma_lompat_jauh",
    [legacySlug("SMA Tolak Peluru")]: "atl_sma_tolak_peluru",
    [legacySlug("Mahasiswa 100m")]: "atl_mhs_100m",
    [legacySlug("Mahasiswa 400m")]: "atl_mhs_400m",
    atletik_smp_100m_putra: "atl_smp_100m",
    atletik_smp_100m_putri: "atl_smp_100m",
    atletik_smp_400m_putra: "atl_smp_400m",
    atletik_smp_400m_putri: "atl_smp_400m",
    atletik_smp_800m_putra: "atl_smp_800m",
    atletik_smp_800m_putri: "atl_smp_800m",
    atletik_smp_estafet_4x400_putra: "atl_smp_estafet_4x400",
    atletik_smp_estafet_4x400_putri: "atl_smp_estafet_4x400",
    atletik_smp_lompat_jauh_putra: "atl_smp_lompat_jauh",
    atletik_smp_lompat_jauh_putri: "atl_smp_lompat_jauh",
    atletik_smp_tolak_peluru_putra: "atl_smp_tolak_peluru",
    atletik_smp_tolak_peluru_putri: "atl_smp_tolak_peluru",
    atletik_sma_100m_putra: "atl_sma_100m",
    atletik_sma_100m_putri: "atl_sma_100m",
    atletik_sma_400m_putra: "atl_sma_400m",
    atletik_sma_400m_putri: "atl_sma_400m",
    atletik_sma_800m_putra: "atl_sma_800m",
    atletik_sma_800m_putri: "atl_sma_800m",
    atletik_sma_estafet_4x400_putra: "atl_sma_estafet_4x400",
    atletik_sma_estafet_4x400_putri: "atl_sma_estafet_4x400",
    atletik_sma_lompat_jauh_putra: "atl_sma_lompat_jauh",
    atletik_sma_lompat_jauh_putri: "atl_sma_lompat_jauh",
    atletik_sma_tolak_peluru_putra: "atl_sma_tolak_peluru",
    atletik_sma_tolak_peluru_putri: "atl_sma_tolak_peluru",
    atletik_mhs_100m_putra: "atl_mhs_100m",
    atletik_mhs_100m_putri: "atl_mhs_100m",
    atletik_mhs_400m_putra: "atl_mhs_400m",
    atletik_mhs_400m_putri: "atl_mhs_400m",
  },
  panahan: {
    [legacySlug("Standar Nasional SD 20m")]: "pan_sd_standar_nasional_20m",
    [legacySlug("Standar Nasional SMP 30m")]: "pan_smp_standar_nasional_30m",
    [legacySlug("Barebow SD 10m")]: "pan_sd_barebow_10m",
    [legacySlug("Horsebow SD 10m")]: "pan_sd_horsebow_10m",
    [legacySlug("Horsebow Mahasiswa 30m")]: "pan_mhs_horsebow_30m",
    panahan_standar_sd_20m: "pan_sd_standar_nasional_20m",
    panahan_standar_smp_30m: "pan_smp_standar_nasional_30m",
    panahan_barebow_sd_10m: "pan_sd_barebow_10m",
    panahan_horsebow_sd_10m: "pan_sd_horsebow_10m",
    panahan_horsebow_mhs_30m: "pan_mhs_horsebow_30m",
  },
  bulu_tangkis: {
    [legacySlug("SMP Tunggal Putra")]: "bt_smp_single_putra",
    [legacySlug("SMP Ganda Putra")]: "bt_smp_double_putra",
    [legacySlug("SMP Tunggal Putri")]: "bt_smp_single_putri",
    [legacySlug("SMP Ganda Putri")]: "bt_smp_double_putri",
    [legacySlug("SMA Tunggal Putra")]: "bt_sma_single_putra",
    [legacySlug("SMA Ganda Putra")]: "bt_sma_double_putra",
    [legacySlug("SMA Tunggal Putri")]: "bt_sma_single_putri",
    [legacySlug("SMA Ganda Putri")]: "bt_sma_double_putri",
    bt_smp_tunggal_putra: "bt_smp_single_putra",
    bt_smp_ganda_putra: "bt_smp_double_putra",
    bt_smp_tunggal_putri: "bt_smp_single_putri",
    bt_smp_ganda_putri: "bt_smp_double_putri",
    bt_sma_tunggal_putra: "bt_sma_single_putra",
    bt_sma_ganda_putra: "bt_sma_double_putra",
    bt_sma_tunggal_putri: "bt_sma_single_putri",
    bt_sma_ganda_putri: "bt_sma_double_putri",
  },
  voli_indoor: {
  },
  tenis_meja: {
    [legacySlug("Tunggal Putra")]: "tm_sma_tunggal_putra",
    [legacySlug("Ganda Putra")]: "tm_sma_ganda_putra",
    [legacySlug("Tunggal Putri")]: "tm_sma_tunggal_putri",
    [legacySlug("Ganda Putri")]: "tm_sma_ganda_putri",
    [legacySlug("Ganda Campuran")]: "tm_sma_ganda_campuran",
    tm_tunggal_putra: "tm_sma_tunggal_putra",
    tm_ganda_putra: "tm_sma_ganda_putra",
    tm_tunggal_putri: "tm_sma_tunggal_putri",
    tm_ganda_putri: "tm_sma_ganda_putri",
    tm_ganda_campuran: "tm_sma_ganda_campuran",
  },
}

const SPORT_BY_ID = new Map(SPORTS_CATALOG.map((sport) => [sport.id, sport]))

export function getCanonicalSportId(rawSportId: string) {
  const value = String(rawSportId || "").trim()
  if (!value) return null
  return SPORT_BY_ID.has(value) ? value : (SPORT_ID_ALIASES[value] ?? null)
}

export function getSportCatalogById(sportId: string) {
  const canonicalSportId = getCanonicalSportId(sportId)
  return canonicalSportId ? SPORT_BY_ID.get(canonicalSportId) ?? null : null
}

export function getOfficialSportReferenceById(sportId: string) {
  const canonicalSportId = getCanonicalSportId(sportId)
  if (!canonicalSportId) return null
  return OFFICIAL_SPORTS_REFERENCE.find((sport) => sport.id === canonicalSportId) ?? null
}

export function getOfficialCategoryOptions(sportId: string): OfficialCategoryOption[] {
  const sport = getOfficialSportReferenceById(sportId)
  if (!sport) return []

  return sport.kategori.map((kategori) => ({
    name: kategori.name,
    nomorLomba: kategori.nomor_lomba.flatMap((nomor) => {
      if (isGroupedNomorLomba(nomor)) {
        return nomor.detail.map((detail) => ({
          id: detail.id,
          name: detail.name,
          displayName: `${nomor.jenis} - ${detail.name}`,
          groupName: nomor.jenis,
          rosterSize: detail.rosterSize,
        }))
      }

      return [
        {
          id: nomor.id,
          name: nomor.name,
          displayName: nomor.name,
          rosterSize: nomor.rosterSize,
        },
      ]
    }),
  }))
}

export function getOfficialSelectionMeta(rawSportId: string, rawCategoryId: string) {
  const sport = getOfficialSportReferenceById(rawSportId)
  const canonicalCategoryId = getCanonicalCategoryId(rawSportId, rawCategoryId)
  if (!sport || !canonicalCategoryId) return null

  for (const kategori of sport.kategori) {
    for (const nomor of kategori.nomor_lomba) {
      if (isGroupedNomorLomba(nomor)) {
        const detail = nomor.detail.find((item) => item.id === canonicalCategoryId)
        if (detail) {
          return {
            sportId: sport.id,
            sportName: sport.name,
            categoryName: kategori.name,
            nomorLombaId: detail.id,
            nomorLombaName: detail.name,
            nomorLombaDisplayName: `${nomor.jenis} - ${detail.name}`,
            nomorLombaGroupName: nomor.jenis,
            rosterSize: detail.rosterSize,
          }
        }
        continue
      }

      if (nomor.id === canonicalCategoryId) {
        return {
          sportId: sport.id,
          sportName: sport.name,
          categoryName: kategori.name,
          nomorLombaId: nomor.id,
          nomorLombaName: nomor.name,
          nomorLombaDisplayName: nomor.name,
          nomorLombaGroupName: undefined,
          rosterSize: nomor.rosterSize,
        }
      }
    }
  }

  return null
}

export function getCanonicalCategoryId(rawSportId: string, rawCategoryId: string) {
  const sport = getSportCatalogById(rawSportId)
  const value = String(rawCategoryId || "").trim()
  if (!sport || !value) return null
  if (sport.categories.some((category) => category.id === value)) return value
  return CATEGORY_ID_ALIASES[sport.id]?.[value] ?? null
}
