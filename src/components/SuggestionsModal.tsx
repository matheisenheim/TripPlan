import { useEffect, useMemo, useRef, useState } from 'react'
import type { Trip } from '../types/trip'
import { ACTIVITY_SUGGESTIONS, type ActivitySuggestion } from '../data/activitySuggestions'
import { categoryLabels } from '../theme/categories'
import { haversineKm } from '../utils/geo'
import { formatDayLabel } from '../utils/formatDate'
import {
  fetchOverpassSuggestions,
  fetchParisEventSuggestions,
  fetchWikidataSuggestions,
} from '../services/publicSuggestions'
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import Chip from './ui/Chip'
import Field from './ui/Field'

// Rayon autour de la ville choisie pour les propositions.
export const SUGGESTIONS_RADIUS_KM = 20

type SourceId = 'catalog' | 'osm' | 'wikidata' | 'paris'

const SOURCES: { id: SourceId; label: string; online: boolean; needsDate?: boolean }[] = [
  { id: 'catalog', label: 'Catalogue embarqué (hors connexion)', online: false },
  { id: 'osm', label: 'Lieux à proximité — OpenStreetMap', online: true },
  { id: 'wikidata', label: 'Incontournables — Wikidata', online: true },
  { id: 'paris', label: 'Événements à une date — Paris (Que faire à Paris ?)', online: true, needsDate: true },
]

interface SuggestionsModalProps {
  trip: Trip
  onAddSuggestion: (s: ActivitySuggestion) => void
  onClose: () => void
}

interface OnlineState {
  status: 'idle' | 'loading' | 'done' | 'error'
  items: ActivitySuggestion[]
  error?: string
}

// Propositions d'activités : catalogue embarqué (hors connexion) ou sources en
// ligne sans clé (OpenStreetMap / Wikidata / agenda « Que faire à Paris ?"),
// filtrées par ville (étape du voyage, rayon de SUGGESTIONS_RADIUS_KM).
// Un clic sur + ajoute l'activité au voyage.
export default function SuggestionsModal({ trip, onAddSuggestion, onClose }: SuggestionsModalProps) {
  const [city, setCity] = useState('')
  const [source, setSource] = useState<SourceId>('catalog')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [online, setOnline] = useState<OnlineState>({ status: 'idle', items: [] })
  const cacheRef = useRef(new Map<string, ActivitySuggestion[]>())
  const reqRef = useRef(0)

  const cities = useMemo(() => [...new Set(trip.stages.map((s) => s.city))], [trip.stages])
  const stageByCity = useMemo(() => new Map(trip.stages.map((s) => [s.city, s])), [trip.stages])
  const stage = city ? stageByCity.get(city) : undefined
  const sourceDef = SOURCES.find((s) => s.id === source)!

  // Filtre du catalogue embarqué : suggestions à moins de SUGGESTIONS_RADIUS_KM de
  // l'étape (quand les deux ont des coordonnées) ; sans coordonnées, correspondance
  // exacte sur la ville. Sans ville choisie : tout.
  const catalogVisible = useMemo(() => {
    return ACTIVITY_SUGGESTIONS.filter((s) => {
      if (!city) return true
      if (!stage?.coordinates || !s.coordinates) return s.city === city
      return haversineKm(stage.coordinates, s.coordinates) <= SUGGESTIONS_RADIUS_KM
    }).map((s) => ({
      s,
      km: stage?.coordinates && s.coordinates ? haversineKm(stage.coordinates, s.coordinates) : undefined,
    }))
  }, [city, stage])

  // Sources en ligne : recherche quand une ville (étape avec coordonnées) est
  // choisie. reqRef protège contre les réponses arrivant hors ordre ; le cache
  // évite de recharger la même source+ville+date.
  const stageCoords = stage?.coordinates
  const stageId = stage?.id
  const stageCity = stage?.city
  useEffect(() => {
    if (!sourceDef.online || !stageCoords || !stageId) return
    const key = `${source}|${stageId}|${date}`
    const cached = cacheRef.current.get(key)
    if (cached) {
      setOnline({ status: 'done', items: cached })
      return
    }
    const reqId = ++reqRef.current
    setOnline({ status: 'loading', items: [] })
    const fetcher =
      source === 'osm'
        ? () => fetchOverpassSuggestions(stageCoords, SUGGESTIONS_RADIUS_KM, stageCity ?? '')
        : source === 'wikidata'
          ? () => fetchWikidataSuggestions(stageCoords, SUGGESTIONS_RADIUS_KM, stageCity ?? '')
          : () => fetchParisEventSuggestions(stageCoords, SUGGESTIONS_RADIUS_KM, stageCity ?? '', date)
    fetcher()
      .then((items) => {
        if (reqId !== reqRef.current) return
        cacheRef.current.set(key, items)
        setOnline({ status: 'done', items })
      })
      .catch((e) => {
        if (reqId !== reqRef.current) return
        setOnline({ status: 'error', items: [], error: e instanceof Error ? e.message : String(e) })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, stageId, stageCoords?.lat, stageCoords?.lng, date])

  function handleSourceChange(next: SourceId) {
    setSource(next)
    // Les sources en ligne ont besoin d'un centre : pré-sélectionne la 1re ville
    // du voyage si aucune n'est choisie.
    if (SOURCES.find((s) => s.id === next)?.online && !city && cities.length > 0) setCity(cities[0])
    if (!SOURCES.find((s) => s.id === next)?.online) setOnline({ status: 'idle', items: [] })
  }

  const onlineVisible = useMemo(
    () =>
      online.items.map((s) => ({
        s,
        km: s.coordinates && stage?.coordinates ? haversineKm(stage.coordinates, s.coordinates) : undefined,
      })),
    [online.items, stage],
  )

  const visible = source === 'catalog' ? catalogVisible : onlineVisible

  return (
    <Sheet
      title="Propositions d'activités"
      onClose={onClose}
      tall
      footer={
        <Button variant="secondary" block onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <Field label="Source">
        <select value={source} onChange={(e) => handleSourceChange(e.target.value as SourceId)}>
          {SOURCES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={`Ville (rayon de ${SUGGESTIONS_RADIUS_KM} km autour de l'étape)`}>
        <select value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">Toutes les villes du catalogue</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      {sourceDef.needsDate && (
        <Field label="Date">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      )}

      {sourceDef.online && !stage && (
        <p className="settings-hint">
          Choisis une ville du voyage : les sources en ligne recherchent autour de l'étape. Hors connexion, reviens au
          catalogue embarqué.
        </p>
      )}

      {sourceDef.online && online.status === 'loading' && <p className="settings-hint">Recherche en cours…</p>}

      {sourceDef.online && online.status === 'error' && (
        <p className="settings-hint">Recherche impossible (hors connexion ?){online.error ? ` — ${online.error}` : ''}</p>
      )}

      {!sourceDef.online && visible.length === 0 && (
        <p className="settings-hint">
          Aucune proposition{city ? ` à ${city}` : ''}. Le catalogue se modifie dans{' '}
          <code>src/data/activitySuggestions.ts</code>.
        </p>
      )}

      {sourceDef.online && online.status === 'done' && visible.length === 0 && (
        <p className="settings-hint">Aucun résultat à {city || 'cette position'} pour cette source.</p>
      )}

      {visible.length > 0 && (
        <ul className="calendar-events__list">
          {visible.map(({ s, km }, i) => (
            <li key={`${s.source ?? 'catalog'}-${s.city}-${s.name}-${i}`} className="calendar-events__item">
              <div className="calendar-events__text">
                <strong>{s.name}</strong>
                <span className="calendar-events__meta">
                  {s.city}
                  {s.date ? ` · ${formatDayLabel(s.date)}${s.time ? ` ${s.time}` : ''}` : ''}
                  {km !== undefined ? ` · à ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}` : ''}
                  {s.source ? ` · ${s.source}` : ''}
                  {s.notes ? ` · ${s.notes}` : ''}
                </span>
              </div>
              <Chip as="span" tone="category" category={s.category}>
                {categoryLabels[s.category]}
              </Chip>
              <Button
                iconOnly
                variant="ghost"
                size="sm"
                icon="plus"
                aria-label={`Ajouter « ${s.name} » au voyage`}
                onClick={() => onAddSuggestion(s)}
              />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  )
}
