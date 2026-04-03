"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"

type PostType = "NEWS" | "ANNOUNCEMENT"

type Post = {
  id: string
  type: PostType
  title: string
  excerpt: string
  content: string
  createdAt: string // ISO
  updatedAt?: string
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

function uid() {
  return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16)
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function AdminBeritaPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [message, setMessage] = useState<string | null>(null)

  const [mode, setMode] = useState<"CREATE" | "EDIT">("CREATE")
  const [editingId, setEditingId] = useState<string | null>(null)

  const [form, setForm] = useState({
    type: "NEWS" as PostType,
    title: "",
    excerpt: "",
    content: "",
  })

  useEffect(() => {
    const all = safeParse<Post[]>(localStorage.getItem(LS_POSTS_KEY), [])
    setPosts(all)
  }, [])

  const save = (next: Post[]) => {
    setPosts(next)
    localStorage.setItem(LS_POSTS_KEY, JSON.stringify(next))
  }

  const resetForm = () => {
    setMode("CREATE")
    setEditingId(null)
    setForm({
      type: "NEWS",
      title: "",
      excerpt: "",
      content: "",
    })
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!form.title.trim()) return setMessage("Judul wajib diisi.")
    if (!form.excerpt.trim()) return setMessage("Ringkasan wajib diisi.")
    if (!form.content.trim()) return setMessage("Konten wajib diisi.")

    const now = new Date().toISOString()

    if (mode === "CREATE") {
      const newPost: Post = {
        id: uid(),
        type: form.type,
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
        createdAt: now,
      }

      save([newPost, ...posts])
      setMessage("Post berhasil dibuat.")
      resetForm()
      return
    }

    if (mode === "EDIT" && editingId) {
      const next = posts.map((p) => {
        if (p.id !== editingId) return p
        return {
          ...p,
          type: form.type,
          title: form.title.trim(),
          excerpt: form.excerpt.trim(),
          content: form.content.trim(),
          updatedAt: now,
        }
      })

      save(next)
      setMessage("Post berhasil diupdate.")
      resetForm()
    }
  }

  const onEdit = (p: Post) => {
    setMode("EDIT")
    setEditingId(p.id)
    setForm({
      type: p.type,
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const onDelete = (id: string) => {
    if (!confirm("Hapus post ini?")) return
    const next = posts.filter((p) => p.id !== id)
    save(next)
    setMessage("Post dihapus.")
  }

  const sorted = useMemo(() => {
    return [...posts].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))
  }, [posts])

  return (
    <div className="max-w-6xl space-y-6">
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Menu Berita & Pengumuman</h1>

        <div className="mt-4 flex gap-3 flex-wrap">
          <Link
            href="/berita"
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
          >
            Buka Berita (Publik)
          </Link>
          <Link
            href="/pengumuman"
            className="px-4 py-2 rounded-lg border bg-white font-semibold hover:bg-gray-50"
          >
            Buka Pengumuman (Publik)
          </Link>
        </div>

        {message && (
          <div className="mt-4 p-3 rounded bg-gray-50 border text-sm text-gray-700">
            {message}
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold">
          {mode === "CREATE" ? "Tambah Post" : "Edit Post"}
        </h2>

        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Tipe</label>
            <select
              value={form.type}
              onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value as PostType }))}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="NEWS">Berita</option>
              <option value="ANNOUNCEMENT">Pengumuman</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Judul</label>
            <input
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Judul post"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Ringkasan</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm((prev) => ({ ...prev, excerpt: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 min-h-[80px]"
              placeholder="Ringkasan singkat yang tampil di list"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Konten</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 min-h-[160px]"
              placeholder="Konten lengkap"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700"
            >
              {mode === "CREATE" ? "Publish" : "Simpan Perubahan"}
            </button>

            {mode === "EDIT" && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 rounded-lg border font-semibold hover:bg-gray-50"
              >
                Batal Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-bold mb-3">Daftar Post</h2>

        {sorted.length === 0 ? (
          <div className="text-sm text-gray-500">Belum ada post.</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((p) => (
              <div key={p.id} className="border rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="text-xs text-gray-500">
                      {p.type === "NEWS" ? "Berita" : "Pengumuman"} • {formatDate(p.createdAt)}
                      {p.updatedAt ? ` • updated ${formatDate(p.updatedAt)}` : ""}
                    </div>
                    <div className="mt-1 font-bold text-gray-900">{p.title}</div>
                    <div className="mt-2 text-sm text-gray-600">{p.excerpt}</div>
                    <div className="mt-2 text-xs text-gray-400">{p.id}</div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(p)}
                      className="px-3 py-1 rounded-lg bg-green-50 text-green-700 font-semibold hover:bg-green-100 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(p.id)}
                      className="px-3 py-1 rounded-lg bg-red-50 text-red-700 font-semibold hover:bg-red-100 text-sm"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
