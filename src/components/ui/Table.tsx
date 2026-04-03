"use client"

import React from "react"

type TableProps = React.TableHTMLAttributes<HTMLTableElement> & {
  compact?: boolean
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function Table({ compact = false, className, ...props }: TableProps) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table
        {...props}
        className={cx("w-full min-w-[720px]", compact && "text-sm", className)}
      />
    </div>
  )
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cx("bg-emerald-50/70", className)} {...props} />
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cx("divide-y divide-gray-100", className)} {...props} />
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cx("hover:bg-emerald-50/40 transition-colors", className)} {...props} />
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cx(
        "px-4 py-3 text-left text-xs font-extrabold uppercase tracking-wide text-emerald-900",
        className
      )}
      {...props}
    />
  )
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cx("px-4 py-3 text-sm text-gray-700", className)} {...props} />
}
