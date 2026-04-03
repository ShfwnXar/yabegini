"use client"

import React from "react"

type TopbarProps = {
  eyebrow?: string
  title: string
  right?: React.ReactNode
}

export function Topbar({ eyebrow, title, right }: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-emerald-100 bg-white/90 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="min-w-0">
          {eyebrow ? <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">{eyebrow}</div> : null}
          <h1 className="truncate bg-gradient-to-r from-gray-900 to-emerald-700 bg-clip-text text-lg font-extrabold text-transparent md:text-xl">{title}</h1>
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
    </header>
  )
}
