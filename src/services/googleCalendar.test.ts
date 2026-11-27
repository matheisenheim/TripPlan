import { describe, expect, it } from 'vitest'
import { buildEventBody, eventMatchesCity, toCalendarEvents } from './googleCalendar'

describe('toCalendarEvents', () => {
  it('convertit un événement avec dateTime en heure locale HH:mm', () => {
    const [ev] = toCalendarEvents([
      { id: '1', summary: 'Concert', start: { dateTime: '2026-11-27T20:30:00+01:00' }, location: 'Tokyo', htmlLink: 'https://…' },
    ])
    expect(ev.title).toBe('Concert')
    expect(ev.time).toMatch(/^\d{2}:\d{2}$/)
    expect(ev.location).toBe('Tokyo')
    expect(ev.link).toBe('https://…')
  })

  it('gère les événements toute la journée (date seule) et sans titre', () => {
    const [ev] = toCalendarEvents([{ id: '2', start: { date: '2026-11-27' } }])
    expect(ev.time).toBe('Journée')
    expect(ev.title).toBe('(sans titre)')
  })
})

describe('buildEventBody (création d’événement agenda)', () => {
  it('avec heure : dateTime + fin à +1 h par défaut', () => {
    const body = buildEventBody({ title: 'Dîner', date: '2026-11-28', time: '20:00' }) as {
      start: { dateTime: string }
      end: { dateTime: string }
    }
    expect(body.start.dateTime).toBe('2026-11-28T20:00:00')
    expect(body.end.dateTime).toBe('2026-11-28T21:00:00')
  })

  it('respecte endTime, et met location + description (notes + lien)', () => {
    const body = buildEventBody({
      title: 'Musée',
      date: '2026-11-29',
      time: '10:00',
      endTime: '12:30',
      location: 'Kyoto',
      description: 'Réserver',
      link: 'https://maps.google.com/?q=x',
    }) as { end: { dateTime: string }; location: string; description: string }
    expect(body.end.dateTime).toBe('2026-11-29T12:30:00')
    expect(body.location).toBe('Kyoto')
    expect(body.description).toContain('Réserver')
    expect(body.description).toContain('https://maps.google.com/?q=x')
  })

  it('sans heure : événement toute la journée (date + lendemain)', () => {
    const body = buildEventBody({ title: 'Vol', date: '2026-12-01' }) as {
      start: { date: string }
      end: { date: string }
    }
    expect(body.start.date).toBe('2026-12-01')
    expect(body.end.date).toBe('2026-12-02')
  })
})

describe('eventMatchesCity', () => {
  it('filtre par ville, insensible à la casse et aux accents', () => {
    expect(eventMatchesCity('Shibuya, Tokyo', 'tokyo')).toBe(true)
    expect(eventMatchesCity('Gare de Kyôto', 'kyoto')).toBe(true)
    expect(eventMatchesCity('Osaka', 'tokyo')).toBe(false)
    expect(eventMatchesCity(undefined, 'tokyo')).toBe(false)
  })

  it('sans ville, tout passe', () => {
    expect(eventMatchesCity('Osaka', '')).toBe(true)
    expect(eventMatchesCity(undefined, '')).toBe(true)
  })
})
