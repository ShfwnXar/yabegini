"use client"

import React from "react"

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  hint?: string
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function Select({
  label,
  error,
  hint,
  className,
  children,
  ...props
}: SelectProps) {
  return (
    <div className="w-full space-y-1">
      {label && (
        <label className="block text-sm font-extrabold text-gray-900">
          {label}
        </label>
      )}

      <select
        {...props}
        className={cx(
          "w-full rounded-2xl border px-4 py-2.5 text-sm font-medium transition-all outline-none",
          "bg-white",
          "focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500",
          error
            ? "border-rose-400 focus:ring-rose-500 focus:border-rose-500"
            : "border-gray-200",
          className
        )}
      >
        {children}
      </select>

      {error ? (
        <div className="text-xs text-rose-600 font-semibold">{error}</div>
      ) : hint ? (
        <div className="text-xs text-gray-500">{hint}</div>
      ) : null}
    </div>
  )
}