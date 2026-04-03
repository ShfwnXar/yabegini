// src/lib/fileStore.ts
"use client"

const DB_NAME = "mg26_files_db"
const STORE_NAME = "files"
const DB_VERSION = 1

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)

    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function putFileBlob(fileId: string, blob: Blob): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    store.put(blob, fileId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function getFileBlob(fileId: string): Promise<Blob | null> {
  const db = await openDB()
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly")
    const store = tx.objectStore(STORE_NAME)
    const req = store.get(fileId)
    req.onsuccess = () => resolve((req.result as Blob) ?? null)
    req.onerror = () => reject(req.error)
  })
  db.close()
  return blob
}

export async function deleteFileBlob(fileId: string): Promise<void> {
  const db = await openDB()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite")
    const store = tx.objectStore(STORE_NAME)
    store.delete(fileId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function openFileInNewTab(fileId: string, fallbackName?: string) {
  const blob = await getFileBlob(fileId)
  if (!blob) {
    alert("File tidak ditemukan (mungkin belum diupload / storage dibersihkan).")
    return
  }
  const url = URL.createObjectURL(blob)
  window.open(url, "_blank", "noopener,noreferrer")

  // optional: revoke belakangan
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export async function downloadFileBlob(fileId: string, fallbackName = "dokumen") {
  const blob = await getFileBlob(fileId)
  if (!blob) {
    alert("File tidak ditemukan (mungkin belum diupload / storage dibersihkan).")
    return
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fallbackName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
