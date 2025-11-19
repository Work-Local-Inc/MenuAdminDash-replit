import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatter
export function formatCurrency(amount: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(amount)
}

// Date formatter
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
  const d = new Date(date)
  if (format === 'long') {
    return d.toLocaleDateString('en-CA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
  return d.toLocaleDateString('en-CA')
}

// Time formatter  
export function formatTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString('en-CA', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Status badge color helper
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'bg-green-500',
    pending: 'bg-yellow-500',
    suspended: 'bg-red-500',
    inactive: 'bg-gray-500',
    closed: 'bg-gray-700',
  }
  return colors[status.toLowerCase()] || 'bg-gray-500'
}
