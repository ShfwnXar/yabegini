"use client"

import React from "react"

type ModalProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
      <div className={cx("w-full max-w-2xl rounded-2xl border bg-white shadow-2xl", className)}>
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="text-base font-extrabold text-gray-900">{title ?? "Detail"}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
