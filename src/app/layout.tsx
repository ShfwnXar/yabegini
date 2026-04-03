import Image from "next/image"
import "./globals.css"
import { Providers } from "@/components/Providers"
import { eventConfig } from "@/lib/eventConfig"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <Providers>{children}</Providers>

        <div className="fixed bottom-4 right-4 z-20 hidden rounded-2xl border border-emerald-200 bg-white/90 p-2 shadow-[0_10px_26px_rgba(15,139,76,0.2)] backdrop-blur lg:block">
          <div className="relative h-14 w-14">
            <Image src={eventConfig.mascot.src} alt={eventConfig.mascot.label} fill className="object-contain" priority />
          </div>
        </div>
      </body>
    </html>
  )
}
