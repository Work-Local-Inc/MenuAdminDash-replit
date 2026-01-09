'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'
import { setGtagReady, setAnalyticsDisabled, isAnalyticsActive, trackPageView } from '@/lib/analytics'

interface AnalyticsProviderProps {
  measurementId: string | null | undefined
  children: React.ReactNode
}

export function AnalyticsProvider({ measurementId, children }: AnalyticsProviderProps) {
  const pathname = usePathname()
  const previousPathname = useRef<string | null>(null)
  const previousMeasurementId = useRef<string | null>(null)
  const [scriptKey, setScriptKey] = useState(0)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (previousMeasurementId.current !== measurementId) {
      setGtagReady(false)
      setIsReady(false)
      if (measurementId) {
        setScriptKey(prev => prev + 1)
      } else {
        setAnalyticsDisabled()
      }
      previousMeasurementId.current = measurementId ?? null
    }
  }, [measurementId])

  useEffect(() => {
    if (!measurementId || !isReady) return
    
    if (previousPathname.current !== null && previousPathname.current !== pathname) {
      trackPageView(pathname)
    }
    previousPathname.current = pathname
  }, [pathname, measurementId, isReady])

  if (!measurementId) {
    return <>{children}</>
  }

  return (
    <>
      <Script
        key={scriptKey}
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        onLoad={() => {
          window.dataLayer = window.dataLayer || []
          window.gtag = function gtag(...args: any[]) {
            window.dataLayer.push(args)
          }
          window.gtag('js', new Date())
          window.gtag('config', measurementId, {
            page_path: pathname,
            send_page_view: false,
          })
          setGtagReady(true)
          setIsReady(true)
          trackPageView(pathname)
        }}
      />
      {children}
    </>
  )
}
