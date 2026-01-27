'use client'

import { useLanguage, SupportedLanguage } from '@/lib/contexts/language-context'
import { cn } from '@/lib/utils'

interface LanguageToggleProps {
  className?: string
  primaryColor?: string
}

export function LanguageToggle({ className, primaryColor }: LanguageToggleProps) {
  const { language, setLanguage, isLoading } = useLanguage()

  if (isLoading) {
    return (
      <div className={cn("flex items-center h-9 bg-muted rounded-full px-1", className)}>
        <div className="w-12 h-7 rounded-full bg-muted animate-pulse" />
        <div className="w-12 h-7 rounded-full bg-muted animate-pulse" />
      </div>
    )
  }

  const handleToggle = (lang: SupportedLanguage) => {
    if (lang !== language) {
      setLanguage(lang)
    }
  }

  const activeStyle = primaryColor
    ? { backgroundColor: primaryColor, color: 'white' }
    : {}

  return (
    <div 
      className={cn(
        "inline-flex items-center h-9 bg-muted rounded-full p-1 gap-0.5",
        className
      )}
      role="radiogroup"
      aria-label="Select language"
      data-testid="language-toggle"
    >
      <button
        type="button"
        role="radio"
        aria-checked={language === 'en'}
        onClick={() => handleToggle('en')}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
          language === 'en'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        style={language === 'en' ? activeStyle : {}}
        data-testid="button-language-en"
      >
        EN
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={language === 'fr'}
        onClick={() => handleToggle('fr')}
        className={cn(
          "px-3 py-1.5 text-sm font-medium rounded-full transition-all duration-200",
          language === 'fr'
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        style={language === 'fr' ? activeStyle : {}}
        data-testid="button-language-fr"
      >
        FR
      </button>
    </div>
  )
}
