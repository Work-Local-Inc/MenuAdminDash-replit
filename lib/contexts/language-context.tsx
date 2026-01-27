'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type SupportedLanguage = 'en' | 'fr'

interface LanguageContextType {
  language: SupportedLanguage
  setLanguage: (lang: SupportedLanguage) => void
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = 'menu_ca_language'

function detectBrowserLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') return 'en'
  
  const browserLang = navigator.language || (navigator as any).userLanguage || ''
  const langCode = browserLang.toLowerCase().split('-')[0]
  
  if (langCode === 'fr') {
    return 'fr'
  }
  return 'en'
}

function getStoredLanguage(): SupportedLanguage | null {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'fr') {
      return stored
    }
  } catch (e) {
    console.warn('[Language] Could not read from localStorage:', e)
  }
  return null
}

function storeLanguage(lang: SupportedLanguage): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch (e) {
    console.warn('[Language] Could not write to localStorage:', e)
  }
}

interface LanguageProviderProps {
  children: ReactNode
  defaultLanguage?: SupportedLanguage
}

export function LanguageProvider({ children, defaultLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<SupportedLanguage>(defaultLanguage || 'en')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = getStoredLanguage()
    if (stored) {
      setLanguageState(stored)
    } else {
      const detected = detectBrowserLanguage()
      setLanguageState(detected)
      storeLanguage(detected)
    }
    setIsLoading(false)
  }, [])

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang)
    storeLanguage(lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export { LanguageContext }
