import { beforeEach, describe, expect, it } from 'vitest'
import { FALLBACK_MAP_CAMERA, getDefaultMapCamera, saveDefaultMapCamera } from './mapViewPreferences'

beforeEach(() => {
  localStorage.clear()
})

describe('mapViewPreferences (vue par défaut de la carte)', () => {
  it('retombe sur la vue de repli (Japon) quand rien n’est enregistré', async () => {
    expect(await getDefaultMapCamera()).toEqual(FALLBACK_MAP_CAMERA)
    expect(FALLBACK_MAP_CAMERA).toEqual({ lng: 136.5, lat: 36.5, zoom: 5 })
  })

  it('enregistre et relit une vue personnalisée', async () => {
    await saveDefaultMapCamera({ lng: 2.3522, lat: 48.8566, zoom: 11 })
    expect(await getDefaultMapCamera()).toEqual({ lng: 2.3522, lat: 48.8566, zoom: 11 })
  })

  it('ignore une valeur corrompue et retombe sur le repli', async () => {
    localStorage.setItem('mapDefaultView', 'pas-du-json{{{')
    expect(await getDefaultMapCamera()).toEqual(FALLBACK_MAP_CAMERA)
  })
})
