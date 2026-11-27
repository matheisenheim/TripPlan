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

export interface NewCalendarEvent {
  title: string
  date: string // YYYY-MM-DD
  time?: string // HH:mm — sans heure, l'événement est en "toute la journée"
  endTime?: string
  location?: string
  description?: string
  link?: string
}

function addHour(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(2000, 0, 1, h, m)
  d.setHours(d.getHours() + 1)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

// Construit le body de l'API Calendar (fonction pure, testée).
export function buildEventBody(input: NewCalendarEvent): Record<string, unknown> {
  const body: Record<string, unknown> = { summary: input.title }
  if (input.time) {
    body.start = { dateTime: `${input.date}T${input.time}:00` }
    body.end = { dateTime: `${input.date}T${input.endTime ?? addHour(input.time)}:00` }
  } else {
    body.start = { date: input.date }
    body.end = { date: nextDay(input.date) }
  }
  if (input.location) body.location = input.location
  const desc = [input.description, input.link].filter(Boolean).join('\n')
  if (desc) body.description = desc
  return body
}

// Crée un événement dans le calendrier principal ; retourne son ID.
export async function createCalendarEvent(input: NewCalendarEvent): Promise<string> {
  const token = await getAccessToken({ interactive: true })
  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildEventBody(input)),
  })
  if (!res.ok) throw new Error(`Création de l'événement échouée (${res.status}).`)
  const json = (await res.json()) as { id?: string }
  if (!json.id) throw new Error('Réponse Calendar sans id.')
  return json.id
}

// Supprime un événement du calendrier principal (404 = déjà supprimé, OK).
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = await getAccessToken({ interactive: true })
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok && res.status !== 404) throw new Error(`Suppression de l'événement échouée (${res.status}).`)
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
