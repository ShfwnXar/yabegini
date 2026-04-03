"use client"

export type DownloadCategory =
  | "Panduan"
  | "Formulir"
  | "Template"
  | "Pengumuman"
  | "Lainnya"

export type DownloadItemMeta = {
  id: string
  title: string
  category: DownloadCategory
  fileName: string
  mimeType: string
  size: number
  createdAt: string
}

const DB_NAME = "mg26_downloads_db"
const STORE = "files"
const META_KEY = "mg26_downloads_meta_v1"

function uid(prefix = "dl") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(key: string, value: Blob) {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

async function idbGet(key: string): Promise<Blob | null> {
  const db = await openDB()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly")
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve((req.result as Blob) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return blob
}

async function idbDel(key: string) {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite")
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

function safeParse<T>(v: string | null, fallback: T): T {
  try {
    if (!v) return fallback
    return JSON.parse(v) as T
  } catch {
    return fallback
  }
}

export function listDownloads(): DownloadItemMeta[] {
  if (typeof window === "undefined") return []
  return safeParse<DownloadItemMeta[]>(localStorage.getItem(META_KEY), [])
}

function saveMeta(items: DownloadItemMeta[]) {
  localStorage.setItem(META_KEY, JSON.stringify(items))
}

export async function addDownload(input: {
  title: string
  category: DownloadCategory
  file: File
}): Promise<DownloadItemMeta> {
  const id = uid()
  const meta: DownloadItemMeta = {
    id,
    title: input.title.trim(),
    category: input.category,
    fileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    size: input.file.size,
    createdAt: new Date().toISOString(),
  }

  await idbPut(id, input.file)

  const items = listDownloads()
  saveMeta([meta, ...items])

  return meta
}

export async function removeDownload(id: string) {
  await idbDel(id)
  const items = listDownloads().filter((x) => x.id !== id)
  saveMeta(items)
}

export async function getDownloadBlobUrl(id: string): Promise<string | null> {
  const blob = await idbGet(id)
  if (!blob) return null
  return URL.createObjectURL(blob)
}