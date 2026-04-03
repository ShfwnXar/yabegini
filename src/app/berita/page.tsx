"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { eventConfig } from "@/lib/eventConfig"

type Post = {
  id: string
  type: "NEWS" | "ANNOUNCEMENT"
  title: string
  excerpt: string
  content: string
  createdAt: string
}

const LS_POSTS_KEY = "mg26_posts"

function safeParse<T>(value: string | null, fallback: T): T {
  try {
    if (!value) return fallback
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function BeritaPage() {
  const [posts, setPosts] = useState<Post[]>([])

  useEffect(() => {
    setPosts(safeParse<Post[]>(localStorage.getItem(LS_POSTS_KEY), []))
  }, [])

  const news = useMemo(() => {
    return posts
      .filter((p) => p.type === "NEWS")
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
  }, [posts])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/40 to-slate-100">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-10">
        <section className="overflow-hidden rounded-3xl border border-emerald-100 bg-white/90 p-6 shadow-[0_20px_40px_rgba(15,139,76,0.12)] md:p-8">
          <div className="grid items-center gap-6 md:grid-cols-[1.3fr_0.7fr]">
            <div>
              <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                Media Update
              </div>
              <h1 className="mt-3 text-3xl font-extrabold text-gray-900 md:text-4xl">Berita</h1>
              <p className="mt-2 max-w-2xl text-sm text-gray-600 md:text-base">
                Informasi terbaru Muhammadiyah Games 2026 dengan tampilan yang lebih futuristik dan mudah dibaca.
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/" className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-emerald-50">
                  Kembali ke Landing
                </Link>
                <Link href="/pengumuman" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                  Lihat Pengumuman
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Official Mascot</div>
              <div className="relative mt-2 h-36 w-full md:h-44">
                <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-100 bg-white/90 p-5 shadow-sm">
          {news.length === 0 ? (
            <div className="text-sm text-gray-600">Belum ada berita. Admin dapat menambahkan berita dari panel admin.</div>
          ) : (
            <div className="space-y-4">
              {news.map((p) => (
                <article key={p.id} className="rounded-xl border border-emerald-100 bg-gradient-to-r from-white to-emerald-50/50 p-5">
                  <div className="text-xs font-medium text-gray-500">{formatDate(p.createdAt)}</div>
                  <h2 className="mt-1 text-lg font-bold text-gray-900">{p.title}</h2>
                  <p className="mt-2 text-sm text-gray-600">{p.excerpt}</p>
                  <div className="mt-4">
                    <Link href={`/berita/${p.id}`} className="text-sm font-semibold text-emerald-700 hover:underline">
                      Baca selengkapnya
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
