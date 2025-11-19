"use client"

import { ThemeProvider } from "./theme-provider"
import { QueryProvider } from "./query-provider"
import { Toaster } from "@/components/ui/toaster"
import NextTopLoader from "nextjs-toploader"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      <QueryProvider>
        <NextTopLoader
          color="#dc2626"
          height={3}
          showSpinner={false}
          shadow="0 0 10px #dc2626,0 0 5px #dc2626"
        />
        {children}
        <Toaster />
      </QueryProvider>
    </ThemeProvider>
  )
}
