import { useEffect, useMemo, useState } from 'react'
import type { Trip } from '../types/trip'
import { eventMatchesCity, listEventsForDay, type CalendarEvent } from '../services/googleCalendar'
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import Field from './ui/Field'
import Icon from './ui/Icon'

interface CalendarEventsModalProps {
  trip: Trip
  onAddEvent: (ev: CalendarEvent, city: string, day: string) => void
  onClose: () => void
}

export default function CalendarEventsModal({ trip, onAddEvent, onClose }: CalendarEventsModalProps) {
  const today = new Date().toISOString().slice(0, 10)
  const [day, setDay] = useState(today)
  const [city, setCity] = useState('')
  const [events, setEvents] = useState<CalendarEvent[]>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()

  const cities = useMemo(() => [...new Set(trip.stages.map((s) => s.city))], [trip.stages])

  async function load(d: string) {
    setLoading(true)
    setError(undefined)
    try {
      setEvents(await listEventsForDay(d))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load(today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const visible = (events ?? []).filter((ev) => eventMatchesCity(ev.location, city))

  return (
    <Sheet
      title="Événements (Google Calendar)"
      onClose={onClose}
      tall
      footer={
        <Button variant="secondary" block onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <div className="calendar-events__controls">
        <Field label="Date">
          <input
            type="date"
            value={day}
            onChange={(e) => {
              setDay(e.target.value)
              void load(e.target.value)
            }}
          />
        </Field>
        <Field label="Ville">
          <select value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="">Toutes les villes</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {loading && <p className="settings-hint">Chargement…</p>}
      {error && (
        <p className="sheet__error" role="alert">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
      {!loading && !error && events !== undefined && (
        visible.length === 0 ? (
          <p className="settings-hint">Aucun événement ce jour-là{city ? ` à ${city}` : ''}.</p>
        ) : (
          <ul className="calendar-events__list">
            {visible.map((ev) => (
              <li key={ev.id} className="calendar-events__item">
                <div className="calendar-events__text">
                  <strong>{ev.title}</strong>
                  <span className="calendar-events__meta">
                    {ev.time}
                    {ev.location ? ` · ${ev.location}` : ''}
                  </span>
                </div>
                <Button
                  iconOnly
                  variant="ghost"
                  size="sm"
                  icon="plus"
                  aria-label={`Ajouter « ${ev.title} » à mes activités`}
                  onClick={() => onAddEvent(ev, city, day)}
                />
              </li>
            ))}
          </ul>
        )
      )}

      <p className="settings-hint">
        Lit ton calendrier Google principal (calendrier « primary »). Nécessite le mode Google Drive connecté —
        hors ligne, indisponible.
      </p>
    </Sheet>
  )
}
