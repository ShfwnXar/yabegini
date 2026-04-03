"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useEffect, useState } from "react"

type Post = {
  id: string
  type: "NEWS" | "ANNOUNCEMENT"
  title: string
  excerpt: string
  content: string
  createdAt: string
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

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function DetailPengumumanPage() {
  const params = useParams()
  const id = params?.id as string

  const [post, setPost] = useState<Post | null>(null)

  useEffect(() => {
    const all = safeParse<Post[]>(localStorage.getItem(LS_POSTS_KEY), [])
    const found = all.find(
      (p) => p.id === id && p.type === "ANNOUNCEMENT"
    )
    setPost(found ?? null)
  }, [id])

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border rounded-xl p-6 text-center">
          <div className="font-bold text-lg">Pengumuman tidak ditemukan</div>
          <Link
            href="/pengumuman"
            className="mt-4 inline-block text-green-700 font-semibold hover:underline"
          >
            Kembali ke Pengumuman
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="text-xs text-gray-500">
            {formatDate(post.createdAt)}
            {post.updatedAt ? ` • updated ${formatDate(post.updatedAt)}` : ""}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold text-gray-900">
            {post.title}
          </h1>
        </div>

        <div className="bg-white border rounded-2xl p-6 shadow-sm">
          <div className="text-gray-700 whitespace-pre-line leading-relaxed">
            {post.content}
          </div>
        </div>

        <Link
          href="/pengumuman"
          className="text-green-700 font-semibold hover:underline"
        >
          ← Kembali ke Pengumuman
        </Link>
      </div>
    </div>
  )
}
