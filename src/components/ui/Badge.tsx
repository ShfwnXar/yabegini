"use client"

import React from "react"

type Tone = "neutral" | "info" | "warning" | "success" | "danger" | "brand"

export type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: Tone
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  const base =
    "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border " +
    "tracking-tight select-none"

  const toneClass =
    tone === "brand"
      ? "bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white border-transparent shadow-[0_10px_22px_rgba(16,185,129,0.25)]"
      : tone === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "warning"
      ? "bg-amber-50 text-amber-900 border-amber-200"
      : tone === "danger"
      ? "bg-rose-50 text-rose-800 border-rose-200"
      : tone === "info"
      ? "bg-sky-50 text-sky-800 border-sky-200"
      : "bg-gray-50 text-gray-700 border-gray-200"

  return <span className={cx(base, toneClass, className)} {...props} />
}