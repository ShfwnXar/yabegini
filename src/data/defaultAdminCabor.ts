export type DefaultAdminCaborAccount = {
  sportId: string
  sportName: string
  picName: string
  email: string
  password: string
}

export const DEFAULT_ADMIN_CABOR_ACCOUNTS: DefaultAdminCaborAccount[] = [
  { sportId: "pencak_silat", sportName: "Pencak Silat", picName: "Admin Cabor Pencak Silat", email: "admin.pencaksilat@mg.local", password: "adminpencaksilat123" },
  { sportId: "atletik", sportName: "Atletik", picName: "Admin Cabor Atletik", email: "admin.atletik@mg.local", password: "adminatletik123" },
  { sportId: "panahan", sportName: "Panahan", picName: "Admin Cabor Panahan", email: "admin.panahan@mg.local", password: "adminpanahan123" },
  { sportId: "bulu_tangkis", sportName: "Bulu Tangkis", picName: "Admin Cabor Bulu Tangkis", email: "admin.bulutangkis@mg.local", password: "adminbulutangkis123" },
  { sportId: "tenis_meja", sportName: "Tenis Meja", picName: "Admin Cabor Tenis Meja", email: "admin.tenismeja@mg.local", password: "admintenismeja123" },
  { sportId: "voli_indoor", sportName: "Bola Voli Indoor", picName: "Admin Cabor Bola Voli Indoor", email: "admin.voli@mg.local", password: "adminvoli123" },
]
