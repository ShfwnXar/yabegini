export const eventConfig = {
  // UBAH tanggal ini sesuai jadwal resmi pertandingan
  // Format ISO: "YYYY-MM-DDTHH:mm:ss+07:00" (WIB)
  tournamentStart: "2026-05-12T08:00:00+07:00",

  nav: {
    download: "/download",
    berita: "/berita",
    pengumuman: "/pengumuman",
    peringkat: "/peringkat",
    statistik: "/statistik",
    login: "/login",
    daftar: "/daftar",
  },

  headerLogos: [
    {
      id: "event",
      label: "Logo Muhammadiyah Games 2026",
      src: "/assets/branding/logos/logo-mg2026.svg",
    },
    // Kalau nanti kamu punya 2 logo lain, taruh juga di folder yang sama
    // lalu tambahkan di sini dengan path "/assets/branding/logos/namafile.png"
  ],

  mascot: {
    label: "Maskot Muhammadiyah Games 2026",
    src: "/assets/branding/maskot/mascot.png",
  },

  sponsors: [
    { id: "s1", label: "Sponsor 1", src: "/assets/branding/sponsors/s1.png" },
    { id: "s2", label: "Sponsor 2", src: "/assets/branding/sponsors/s2.png" },
    { id: "s3", label: "Sponsor 3", src: "/assets/branding/sponsors/s3.png" },
    { id: "s4", label: "Sponsor 4", src: "/assets/branding/sponsors/s4.png" },
    { id: "s5", label: "Sponsor 5", src: "/assets/branding/sponsors/s5.png" },
    { id: "s6", label: "Sponsor 6", src: "/assets/branding/sponsors/s6.png" },
    { id: "s7", label: "Sponsor 7", src: "/assets/branding/sponsors/s7.png" },
  ],

  footer: {
    orgLine1: "LPO PP Muhammadiyah",
    orgLine2: "Muhammadiyah Games 2026",
    contactNote: "Untuk informasi resmi, pantau menu Berita & Pengumuman.",
  },
}
