import { describe, expect, it } from 'vitest'
import { eventMatchesCity, toCalendarEvents } from './googleCalendar'

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
