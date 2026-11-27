import * as maplibregl from 'maplibre-gl'
import { Protocol } from 'pmtiles'
import { layers as protomapsLayers, namedFlavor } from '@protomaps/basemaps'
import { OFFLINE_PMTILES_KEY } from './offlinePmtilesSource'
import type { ResolvedTheme } from '../theme/categories'

// Registered once globally, like setWorkerUrl in MapView.tsx — the PMTiles
// instance tied to whichever map file is connected is (re)added to this
// protocol at mount time by each map (MapView, MapPickerModal).
export const pmtilesProtocol = new Protocol()
maplibregl.addProtocol('pmtiles', pmtilesProtocol.tile)

// OpenFreeMap ne propose pas de style sombre (catalogue : bright, positron,
// liberty) — positron (gris désaturé) est le moins agressif à côté du chrome
// sumi. Hors ligne, @protomaps/basemaps a un vrai flavor "dark" (voir
// buildOfflineStyle) : l'asymétrie clair/sombre en ligne vs hors ligne est
// une limite connue de OpenFreeMap, pas un oubli.
export const MAP_STYLES: Record<ResolvedTheme, string> = {
  light: 'https://tiles.openfreemap.org/styles/bright',
  dark: 'https://tiles.openfreemap.org/styles/positron',
}

// Construit depuis le schéma Protomaps, pas l'OpenMapTiles utilisé en ligne
// par OpenFreeMap/Bright — l'archive PMTiles hors ligne est extraite du
// basemap Protomaps, dont les noms de couches vecteur ne correspondent pas
// à OpenMapTiles.
export const OFFLINE_SOURCE_NAME = 'protomaps'

export function buildOfflineStyle(theme: ResolvedTheme): maplibregl.StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf',
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${theme}`,
    sources: {
      [OFFLINE_SOURCE_NAME]: {
        type: 'vector',
        url: `pmtiles://${OFFLINE_PMTILES_KEY}`,
      },
    },
    layers: protomapsLayers(OFFLINE_SOURCE_NAME, namedFlavor(theme)),
  }
}
