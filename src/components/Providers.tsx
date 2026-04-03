"use client"

import { AuthProvider, useAuth } from "@/context/AuthContext"
import { useEffect } from "react"

function AuthBootstrap({ children }: { children: React.ReactNode }) {
  const { seedDefaultAdminsIfEmpty } = useAuth()

  useEffect(() => {
    seedDefaultAdminsIfEmpty()
  }, [seedDefaultAdminsIfEmpty])

  return <>{children}</>
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthBootstrap>{children}</AuthBootstrap>
    </AuthProvider>
  )
}
