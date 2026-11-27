import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'
import { DriveFile } from '../plugins/DriveFile'
import { loadWebMapFile, pickWebMapFile } from './webMapFile'

const URI_KEY = 'offlineMapUri'
const NAME_KEY = 'offlineMapName'
const MODE_KEY = 'mapMode'

export class NoFileSelectedError extends Error {}
export class AccessRevokedError extends Error {}

export interface ConnectedMapFile {
  uri: string
  name: string
}

export type MapMode = 'online' | 'offline'

export async function getStoredMapFile(): Promise<ConnectedMapFile | null> {
  const [{ value: uri }, { value: name }] = await Promise.all([
    Preferences.get({ key: URI_KEY }),
    Preferences.get({ key: NAME_KEY }),
  ])
  if (!uri) return null
  return { uri, name: name ?? 'japan.pmtiles' }
}

export async function loadMapFile(): Promise<ConnectedMapFile> {
  // Sur navigateur, la carte hors ligne est un .pmtiles stocké localement en
  // IndexedDB (pseudo-URI webmap://) — voir webMapFile.ts.
  if (!Capacitor.isNativePlatform()) {
    const file = await loadWebMapFile()
    if (!file) throw new NoFileSelectedError()
    return file
  }

  const file = await getStoredMapFile()
  if (!file) throw new NoFileSelectedError()

  const { granted } = await DriveFile.hasPersistedAccess({ uri: file.uri })
  if (!granted) throw new AccessRevokedError()

  return file
}

export async function connectMapFile(): Promise<ConnectedMapFile> {
  // Sur navigateur : sélecteur de fichier local, le .pmtiles est copié en IndexedDB
  // et lu en mémoire (aucun readRange Drive, qui n'existe pas côté web).
  if (!Capacitor.isNativePlatform()) {
    return pickWebMapFile()
  }
  const { uri, name } = await DriveFile.pickFile()
  await Promise.all([Preferences.set({ key: URI_KEY, value: uri }), Preferences.set({ key: NAME_KEY, value: name })])
  return { uri, name }
}

export async function getStoredMode(): Promise<MapMode> {
  const { value } = await Preferences.get({ key: MODE_KEY })
  return value === 'offline' ? 'offline' : 'online'
}

export async function setStoredMode(mode: MapMode): Promise<void> {
  await Preferences.set({ key: MODE_KEY, value: mode })
}
