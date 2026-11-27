import { Preferences } from '@capacitor/preferences'

// Vue (centre + zoom) affichée par défaut à l'ouverture de l'onglet Carte.
// Persistée via Preferences (localStorage sur le web) et définissable depuis
// la carte elle-même via le bouton "Vue par défaut" (voir MapView.tsx).
export interface MapCamera {
  lng: number
  lat: number
  zoom: number
}

const VIEW_KEY = 'mapDefaultView'

export const FALLBACK_MAP_CAMERA: MapCamera = { lng: 136.5, lat: 36.5, zoom: 5 }

export async function getDefaultMapCamera(): Promise<MapCamera> {
  const { value } = await Preferences.get({ key: VIEW_KEY })
  if (!value) return FALLBACK_MAP_CAMERA
  try {
    const v = JSON.parse(value) as Partial<MapCamera>
    if (typeof v.lng === 'number' && typeof v.lat === 'number' && typeof v.zoom === 'number') {
      return { lng: v.lng, lat: v.lat, zoom: v.zoom }
    }
  } catch {
    // JSON invalide : on retombe sur la vue par défaut.
  }
  return FALLBACK_MAP_CAMERA
}

export async function saveDefaultMapCamera(camera: MapCamera): Promise<void> {
  await Preferences.set({ key: VIEW_KEY, value: JSON.stringify(camera) })
}
