"use client"

import React from "react"

type Step = {
  key: string
  label: string
  active?: boolean
  done?: boolean
}

type StepperProps = {
  steps: Step[]
  className?: string
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

export function Stepper({ steps, className }: StepperProps) {
  return (
    <div className={cx("grid gap-2 sm:grid-cols-2 xl:grid-cols-4", className)}>
      {steps.map((step, idx) => (
        <div
          key={step.key}
          className={cx(
            "rounded-xl border px-3 py-3 text-sm",
            step.active && "border-emerald-300 bg-emerald-50",
            step.done && "border-emerald-200 bg-emerald-50/50",
            !step.active && !step.done && "bg-white"
          )}
        >
          <div className="text-xs font-bold text-gray-500">Step {idx + 1}</div>
          <div className="mt-1 font-extrabold text-gray-900">{step.label}</div>
        </div>
      ))}
    </div>
  )
}
