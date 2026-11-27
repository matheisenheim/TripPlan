import { useMemo, useState } from 'react'
import type { Trip } from '../types/trip'
import { ACTIVITY_SUGGESTIONS, type ActivitySuggestion } from '../data/activitySuggestions'
import { categoryLabels } from '../theme/categories'
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

  const visible = ACTIVITY_SUGGESTIONS.filter((s) => !city || s.city === city)

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
      <Field label="Ville">
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
          {visible.map((s, i) => (
            <li key={`${s.city}-${s.name}-${i}`} className="calendar-events__item">
              <div className="calendar-events__text">
                <strong>{s.name}</strong>
                <span className="calendar-events__meta">
                  {s.city}
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
