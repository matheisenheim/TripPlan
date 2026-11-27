import { useState } from 'react'
import { DEFAULT_WISHLIST_STAMP_LABEL, type Trip } from '../types/trip'
import { saveDefaultMapCamera, type MapCamera } from '../data/mapViewPreferences'
import Sheet from './ui/Sheet'
import Field from './ui/Field'
import Button from './ui/Button'
import CoordinatesField from './CoordinatesField'

// Zoom appliqué quand un lieu par défaut est choisi à la création d'un voyage :
// niveau "ville".
const TRIP_DEFAULT_ZOOM = 11

interface TripFormModalProps {
  mode: 'create' | 'edit'
  trip?: Trip
  onSubmit: (input: { name: string; wishlistStampLabel?: string }) => Promise<void>
  onDelete?: () => Promise<void>
  onClose: () => void
}

function countActivities(trip: Trip): number {
  return trip.activities?.length ?? 0
}

export default function TripFormModal({ mode, trip, onSubmit, onDelete, onClose }: TripFormModalProps) {
  const [name, setName] = useState(trip?.name ?? '')
  const [wishlistStampLabel, setWishlistStampLabel] = useState(trip?.wishlistStampLabel ?? '')
  const [mapLat, setMapLat] = useState('')
  const [mapLng, setMapLng] = useState('')
  const [error, setError] = useState<string>()
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(undefined)
    if (!name.trim()) return setError('Le nom est obligatoire.')

    // Lieu affiché par défaut sur la carte (création uniquement) : optionnel,
    // mais lat + lng doivent être renseignées toutes les deux et valides.
    let camera: MapCamera | undefined
    if (mode === 'create' && (mapLat.trim() || mapLng.trim())) {
      const lat = Number(mapLat)
      const lng = Number(mapLng)
      if (!mapLat.trim() || !mapLng.trim() || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return setError('Latitude et longitude du lieu par défaut de la carte invalides.')
      }
      camera = { lat, lng, zoom: TRIP_DEFAULT_ZOOM }
    }

    setSubmitting(true)
    try {
      await onSubmit({ name: name.trim(), wishlistStampLabel: wishlistStampLabel.trim() || undefined })
      if (camera) await saveDefaultMapCamera(camera)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!trip || !onDelete) return
    const activityCount = countActivities(trip)
    const detail = `${trip.stages.length} étape${trip.stages.length !== 1 ? 's' : ''} et ${activityCount} activité${activityCount !== 1 ? 's' : ''}`
    if (!window.confirm(`Supprimer le voyage « ${trip.name} » ? Cela supprime aussi ${detail}. Cette action est irréversible.`)) {
      return
    }
    setSubmitting(true)
    try {
      await onDelete()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setSubmitting(false)
    }
  }

  return (
    <Sheet
      as="form"
      title={mode === 'create' ? 'Nouveau voyage' : 'Modifier le voyage'}
      onSubmit={handleSubmit}
      onClose={onClose}
      error={error}
      footer={
        <>
          <Button variant="secondary" block onClick={onClose} disabled={submitting}>
            Annuler
          </Button>
          <Button variant="primary" block type="submit" loading={submitting} loadingLabel="Enregistrement…">
            {mode === 'create' ? 'Créer' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <Field label="Nom">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>

      <Field label="Texte du tampon « envie de faire »">
        <input
          type="text"
          value={wishlistStampLabel}
          onChange={(e) => setWishlistStampLabel(e.target.value)}
          placeholder={DEFAULT_WISHLIST_STAMP_LABEL}
        />
      </Field>

      {mode === 'create' && (
        <>
          <CoordinatesField
            legend="Lieu affiché par défaut sur la carte"
            lat={mapLat}
            lng={mapLng}
            onChange={(lat, lng) => {
              setMapLat(lat)
              setMapLng(lng)
            }}
          />
          <p className="settings-hint">Optionnel — la carte s'ouvrira centrée sur ce lieu. Sans choix, elle garde la dernière vue enregistrée (bouton « Vue par défaut » sur la carte).</p>
        </>
      )}

      {mode === 'edit' && onDelete && (
        <Button variant="danger" icon="trash" block onClick={handleDelete} disabled={submitting}>
          Supprimer ce voyage
        </Button>
      )}
    </Sheet>
  )
}
