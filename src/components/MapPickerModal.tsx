import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import { PMTiles } from 'pmtiles'
import { useOfflineMap } from '../hooks/useOfflineMap'
import { useTheme } from '../hooks/useTheme'
import { OfflinePmtilesSource } from '../utils/offlinePmtilesSource'
import { reverseGeocode } from '../utils/nominatimSearch'
import { getDefaultMapCamera, type MapCamera } from '../data/mapViewPreferences'
import { MAP_STYLES, buildOfflineStyle, pmtilesProtocol } from '../utils/mapStyle'
import Button from './ui/Button'
import type { Coordinates } from '../types/trip'

// Style minimal sans aucune source réseau : simple fond uni. Permet de poser
// un pin totalement hors ligne, même sans carte PMTiles connectée (les
// coordonnées viennent du tap sur la carte, pas du réseau).
const MINIMAL_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#E8E4DA' } }],
}

interface MapPickerModalProps {
  onPick: (coords: Coordinates, label?: string) => void
  onClose: () => void
}

export default function MapPickerModal({ onPick, onClose }: MapPickerModalProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const fellBackToMinimalRef = useRef(false)
  const [camera, setCamera] = useState<MapCamera | null>(null)
  const [picked, setPicked] = useState<Coordinates | null>(null)
  const [label, setLabel] = useState<string>()
  const { resolvedTheme } = useTheme()
  const { status: mapStatus, fileUri: offlineMapUri, mode: mapMode } = useOfflineMap()
  const offlineActive = mapMode === 'offline' && mapStatus === 'ready' && !!offlineMapUri

  useEffect(() => {
    getDefaultMapCamera().then(setCamera)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current || !camera) return

    let style: maplibregl.StyleSpecification | string
    if (offlineActive && offlineMapUri) {
      pmtilesProtocol.add(new PMTiles(new OfflinePmtilesSource(offlineMapUri)))
      style = buildOfflineStyle(resolvedTheme)
    } else if (navigator.onLine) {
      style = MAP_STYLES[resolvedTheme]
    } else {
      style = MINIMAL_STYLE
    }

    const map = new maplibregl.Map({
      container,
      style,
      center: [camera.lng, camera.lat],
      zoom: camera.zoom,
      attributionControl: { compact: true },
    })
    mapRef.current = map

    map.on('click', (e: maplibregl.MapMouseEvent) => {
      markerRef.current?.remove()
      markerRef.current = new maplibregl.Marker({ color: '#C8442E' }).setLngLat(e.lngLat).addTo(map)
      const coords = { lat: e.lngLat.lat, lng: e.lngLat.lng }
      setPicked(coords)
      setLabel(undefined)
      // Nom du lieu best-effort (réseau) — hors connexion on garde juste les coordonnées.
      reverseGeocode(coords.lat, coords.lng)
        .then((name) => setLabel(name ?? undefined))
        .catch(() => {})
    })

    // Si le style en ligne ne charge pas (hors connexion malgré navigator.onLine),
    // retombe sur le fond neutre : le pin au tap reste possible.
    map.on('error', () => {
      if (!fellBackToMinimalRef.current && !offlineActive) {
        fellBackToMinimalRef.current = true
        map.setStyle(MINIMAL_STYLE)
      }
    })

    return () => {
      markerRef.current?.remove()
      markerRef.current = null
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, offlineActive, offlineMapUri, resolvedTheme])

  return (
    <div className="map-picker">
      <div className="map-picker__header">
        <strong>Choisir un lieu sur la carte</strong>
        <Button variant="ghost" iconOnly icon="close" aria-label="Fermer" onClick={onClose} />
      </div>
      <div ref={containerRef} className="map-picker__map" />
      <p className="map-picker__hint">
        {picked
          ? `Pin posé : ${picked.lat.toFixed(5)}, ${picked.lng.toFixed(5)}${label ? ` — ${label}` : ''}`
          : 'Touche la carte pour poser un pin.'}
        {!navigator.onLine && ' Hors connexion : le pin fonctionne quand même.'}
      </p>
      <div className="map-picker__footer">
        <Button variant="secondary" block onClick={onClose}>
          Annuler
        </Button>
        <Button variant="primary" block disabled={!picked} onClick={() => picked && onPick(picked, label)}>
          Valider ce lieu
        </Button>
      </div>
    </div>
  )
}
