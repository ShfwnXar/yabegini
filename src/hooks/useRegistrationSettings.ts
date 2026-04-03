"use client"

import { useEffect, useState } from "react"
import {
  DEFAULT_REGISTRATION_SETTINGS,
  readRegistrationSettings,
  REGISTRATION_SETTINGS_KEY,
  REGISTRATION_SETTINGS_UPDATED_EVENT,
  type RegistrationSettings,
} from "@/lib/registrationSettings"
import { Repos } from "@/repositories"

export function useRegistrationSettings() {
  const [settings, setSettings] = useState<RegistrationSettings>(() =>
    typeof window === "undefined" ? DEFAULT_REGISTRATION_SETTINGS : readRegistrationSettings()
  )
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const syncSettings = async () => {
      try {
        const next = await Repos.registrationSettings.getSettings()
        setSettings(next)
      } catch {
        setSettings(readRegistrationSettings())
      } finally {
        setIsReady(true)
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== REGISTRATION_SETTINGS_KEY) return
      void syncSettings()
    }

    void syncSettings()
    window.addEventListener("storage", handleStorage)
    window.addEventListener(REGISTRATION_SETTINGS_UPDATED_EVENT, syncSettings)

    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(REGISTRATION_SETTINGS_UPDATED_EVENT, syncSettings)
    }
  }, [])

  const saveSettings = async (nextSettings: RegistrationSettings) => {
    const saved = await Repos.registrationSettings.saveSettings(nextSettings)
    setSettings(saved)
    setIsReady(true)
    return saved
  }

  return { settings, isReady, saveSettings }
}
