"use client"

import React from "react"

type EmptyStateProps = {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cx("rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center", className)}>
      <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-emerald-100" />
      <h3 className="text-lg font-extrabold text-gray-900">{title}</h3>
      {description ? <p className="mt-2 text-sm text-gray-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
