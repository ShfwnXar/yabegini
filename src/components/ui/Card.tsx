"use client"

import React from "react"

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "glass" | "soft"
}

export function Card({ variant = "default", className, ...props }: CardProps) {
  const base =
    "rounded-2xl border shadow-sm transition-all " +
    "bg-white/95 backdrop-blur " +
    "hover:shadow-[0_16px_50px_rgba(0,0,0,0.08)]"

  const v =
    variant === "glass"
      ? "border-white/40 bg-white/60 shadow-[0_10px_35px_rgba(0,0,0,0.06)]"
      : variant === "soft"
      ? "border-emerald-100 bg-gradient-to-b from-white to-emerald-50/40"
      : "border-gray-200"

  return <div className={cx(base, v, className)} {...props} />
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx("p-6 pb-3 flex flex-col gap-2", className)}
      {...props}
    />
  )
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cx("text-xl md:text-2xl font-extrabold text-gray-900 tracking-tight", className)}
      {...props}
    />
  )
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cx("text-sm text-gray-600", className)} {...props} />
  )
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("p-6 pt-3", className)} {...props} />
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("p-6 pt-3 border-t border-gray-100", className)} {...props} />
  )
}