import { getAccessToken } from './googleAuth'

export interface CalendarEvent {
  id: string
  title: string
  /** « HH:mm » en heure locale, ou « Journée » pour un événement toute la journée. */
  time: string
  location?: string
  link?: string
}

type ApiItem = {
  id?: string
  summary?: string
  start?: { dateTime?: string; date?: string }
  location?: string
  htmlLink?: string
}

// Transforme les items de l'API Calendar en CalendarEvent (fonction pure, testée).
export function toCalendarEvents(items: unknown[]): CalendarEvent[] {
  return (items as ApiItem[]).map((it) => {
    let time = 'Journée'
    if (it.start?.dateTime) {
      time = new Date(it.start.dateTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    }
    return {
      id: String(it.id ?? ''),
      title: String(it.summary ?? '(sans titre)'),
      time,
      location: it.location ? String(it.location) : undefined,
      link: it.htmlLink ? String(it.htmlLink) : undefined,
    }
  })
}

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Filtre « dans la ville » : insensible à la casse et aux accents, sur le champ
// location de l'événement. Ville vide = pas de filtre.
export function eventMatchesCity(location: string | undefined, city: string): boolean {
  if (!city) return true
  return norm(location ?? '').includes(norm(city))
}

// Événements du calendrier principal pour un jour donné (UTC).
export async function listEventsForDay(dayISO: string): Promise<CalendarEvent[]> {
  const token = await getAccessToken({ interactive: true })
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
    timeMin: `${dayISO}T00:00:00Z`,
    timeMax: `${dayISO}T23:59:59Z`,
  })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Google Calendar indisponible (${res.status}).`)
  const json = (await res.json()) as { items?: unknown[] }
  return toCalendarEvents(json.items ?? [])
}
