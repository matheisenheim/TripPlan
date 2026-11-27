import { useMemo, useState } from 'react'
import type { Trip } from '../types/trip'
import { ACTIVITY_SUGGESTIONS, type ActivitySuggestion } from '../data/activitySuggestions'
import { categoryLabels } from '../theme/categories'
import { haversineKm } from '../utils/geo'

// Rayon autour de la ville choisie pour les propositions.
export const SUGGESTIONS_RADIUS_KM = 20
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import Chip from './ui/Chip'
import Field from './ui/Field'

interface SuggestionsModalProps {
  trip: Trip
  onAddSuggestion: (s: ActivitySuggestion) => void
  onClose: () => void
}

// Catalogue d'activités proposées (src/data/activitySuggestions.ts), filtrable
// par ville (étapes du voyage). Un clic sur + ajoute l'activité au voyage.
export default function SuggestionsModal({ trip, onAddSuggestion, onClose }: SuggestionsModalProps) {
  const [city, setCity] = useState('')
  const cities = useMemo(() => [...new Set(trip.stages.map((s) => s.city))], [trip.stages])
  const stageByCity = useMemo(() => new Map(trip.stages.map((s) => [s.city, s])), [trip.stages])

  // Filtre par ville : suggestions à moins de SUGGESTIONS_RADIUS_KM de l'étape
  // (quand les deux ont des coordonnées) ; les suggestions sans coordonnées ne
  // passent que si leur ville correspond exactement. Sans ville choisie : tout.
  const visible = useMemo(() => {
    const stage = city ? stageByCity.get(city) : undefined
    return ACTIVITY_SUGGESTIONS.filter((s) => {
      if (!city) return true
      if (!stage?.coordinates || !s.coordinates) return s.city === city
      return haversineKm(stage.coordinates, s.coordinates) <= SUGGESTIONS_RADIUS_KM
    }).map((s) => ({
      s,
      km: stage?.coordinates && s.coordinates ? haversineKm(stage.coordinates, s.coordinates) : undefined,
    }))
  }, [city, stageByCity])

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

      {visible.length === 0 ? (
        <p className="settings-hint">
          Aucune proposition{city ? ` à ${city}` : ''}. Le catalogue se modifie dans
          {' '}<code>src/data/activitySuggestions.ts</code>.
        </p>
      ) : (
        <ul className="calendar-events__list">
          {visible.map(({ s, km }, i) => (
            <li key={`${s.city}-${s.name}-${i}`} className="calendar-events__item">
              <div className="calendar-events__text">
                <strong>{s.name}</strong>
                <span className="calendar-events__meta">
                  {s.city}
                  {km !== undefined ? ` · à ${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}` : ''}
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
