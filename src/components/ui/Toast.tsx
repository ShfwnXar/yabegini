"use client"

import React from "react"

type ToastProps = {
  tone?: "success" | "error" | "info"
  message: string
  className?: string
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function Toast({ tone = "info", message, className }: ToastProps) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-sky-200 bg-sky-50 text-sky-800"

  return (
    <div className={cx("rounded-xl border px-4 py-3 text-sm font-semibold", toneClass, className)}>
      {message}
    </div>
  )
}
