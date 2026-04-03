"use client"

import Link from "next/link"
import React from "react"

type SlidebarItem = {
  href: string
  label: string
}

type SlidebarProps = {
  title: string
  subtitle?: string
  items: SlidebarItem[]
  pathname: string
  footer?: React.ReactNode
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function Slidebar({ title, subtitle, items, pathname, footer }: SlidebarProps) {
  return (
    <aside className="hidden w-72 shrink-0 md:flex md:flex-col md:gap-4 md:p-4">
      <div className="surface-card overflow-hidden p-5">
        <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">Workspace</div>
          <div className="mt-1 text-lg font-extrabold text-gray-900">{title}</div>
          {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
        </div>

        <nav className="mt-5 space-y-1.5">
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link key={item.href} href={item.href} className={cx("menu-link", active && "menu-link-active")}>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {footer ? <div className="mt-5 border-t border-emerald-100 pt-4">{footer}</div> : null}
      </div>
    </aside>
  )
}
