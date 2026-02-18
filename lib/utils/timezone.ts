const EASTERN_TZ = 'America/Toronto'

function getEasternOffset(date: Date): string {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: EASTERN_TZ,
    timeZoneName: 'shortOffset',
  })
  const parts = fmt.formatToParts(date)
  const tzPart = parts.find(p => p.type === 'timeZoneName')
  if (tzPart?.value) {
    const match = tzPart.value.match(/GMT([+-]\d+)/)
    if (match) {
      const hours = parseInt(match[1])
      const sign = hours >= 0 ? '+' : '-'
      return `${sign}${String(Math.abs(hours)).padStart(2, '0')}:00`
    }
  }
  return '-05:00'
}

export function toEasternDayStart(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`)
  const offset = getEasternOffset(date)
  return `${dateStr}T00:00:00${offset}`
}

export function toEasternDayEnd(dateStr: string): string {
  const date = new Date(`${dateStr}T12:00:00Z`)
  const offset = getEasternOffset(date)
  return `${dateStr}T23:59:59${offset}`
}
