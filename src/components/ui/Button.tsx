"use client"

import React from "react"

type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  isLoading?: boolean
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function Button({
  variant = "primary",
  size = "md",
  leftIcon,
  rightIcon,
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || isLoading

  const sizeClass =
    size === "sm"
      ? "h-9 px-3 text-sm rounded-xl"
      : size === "lg"
      ? "h-12 px-5 text-base rounded-2xl"
      : "h-10 px-4 text-sm rounded-2xl"

  const base =
    "inline-flex items-center justify-center gap-2 font-extrabold tracking-tight transition-all " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 " +
    "disabled:opacity-60 disabled:cursor-not-allowed"

  // Sport-event dynamic styles (soft gradient + glow)
  const primary =
    "text-white " +
    "bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 " +
    "shadow-[0_10px_30px_rgba(16,185,129,0.25)] " +
    "hover:brightness-[1.05] hover:shadow-[0_12px_38px_rgba(16,185,129,0.35)] " +
    "active:scale-[0.99] " +
    "focus-visible:ring-emerald-500"

  const secondary =
    "text-gray-900 bg-white border border-gray-200 " +
    "shadow-sm hover:bg-gray-50 active:scale-[0.99] " +
    "focus-visible:ring-gray-300"

  const ghost =
    "text-gray-800 bg-transparent " +
    "hover:bg-gray-100 active:scale-[0.99] " +
    "focus-visible:ring-gray-300"

  const danger =
    "text-white " +
    "bg-gradient-to-r from-rose-600 via-red-600 to-orange-600 " +
    "shadow-[0_10px_30px_rgba(244,63,94,0.22)] " +
    "hover:brightness-[1.05] hover:shadow-[0_12px_38px_rgba(244,63,94,0.32)] " +
    "active:scale-[0.99] " +
    "focus-visible:ring-rose-500"

  const variantClass =
    variant === "primary"
      ? primary
      : variant === "secondary"
      ? secondary
      : variant === "danger"
      ? danger
      : ghost

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={cx(base, sizeClass, variantClass, className)}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border-2 border-white/60 border-t-white animate-spin" />
          <span>Memproses...</span>
        </span>
      ) : (
        <>
          {leftIcon ? <span className="inline-flex">{leftIcon}</span> : null}
          <span>{children}</span>
          {rightIcon ? <span className="inline-flex">{rightIcon}</span> : null}
        </>
      )}
    </button>
  )
}