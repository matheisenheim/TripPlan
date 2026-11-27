import { Preferences } from '@capacitor/preferences'

// Carte hors ligne côté navigateur : le fichier .pmtiles choisi est stocké en
// IndexedDB (persiste entre les sessions) et servi en mémoire via une pseudo-URI
// `webmap://<id>` — lue par OfflinePmtilesSource. Aucune lecture Drive ni réseau :
// la carte fonctionne hors connexion. (Sur Android, on passe à la place par
// DriveFile.readRange sur le fichier SAF — voir offlineMapRepository.ts.)
const NAME_KEY = 'offlineMapNameWeb'
const IDB_DB = 'tripplan'
const IDB_STORE = 'files'
const IDB_KEY = 'offlineMap'

const blobs = new Map<string, Blob>()
let nextId = 0

export function registerWebMapBlob(blob: Blob): string {
  const uri = `webmap://${++nextId}`
  blobs.set(uri, blob)
  return uri
}

export function getWebMapBlob(uri: string): Blob | undefined {
  return blobs.get(uri)
}

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function idbPut(key: string, value: ArrayBuffer): Promise<void> {
  const idb = await openIdb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    idb.close()
  }
}

async function idbGet(key: string): Promise<ArrayBuffer | undefined> {
  const idb = await openIdb()
  try {
    return await new Promise<ArrayBuffer | undefined>((resolve, reject) => {
      const tx = idb.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(key)
      req.onsuccess = () => resolve(req.result as ArrayBuffer | undefined)
      req.onerror = () => reject(req.error)
    })
  } finally {
    idb.close()
  }
}

// Ouvre le sélecteur de fichier natif du navigateur et stocke le .pmtiles choisi.
export async function pickWebMapFile(): Promise<{ uri: string; name: string }> {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.pmtiles,application/octet-stream'
  const file = await new Promise<File | null>((resolve) => {
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
  if (!file) throw new Error('Aucun fichier sélectionné.')
  const buf = await file.arrayBuffer()
  await idbPut(IDB_KEY, buf)
  await Preferences.set({ key: NAME_KEY, value: file.name })
  return { uri: registerWebMapBlob(new Blob([buf])), name: file.name }
}

// Recharge le .pmtiles précédemment choisi depuis IndexedDB (nouvelle session :
// la pseudo-URI webmap:// est recréée à chaque chargement).
export async function loadWebMapFile(): Promise<{ uri: string; name: string } | null> {
  const { value: name } = await Preferences.get({ key: NAME_KEY })
  const buf = await idbGet(IDB_KEY)
  if (!buf) return null
  return { uri: registerWebMapBlob(new Blob([buf])), name: name ?? 'carte.pmtiles' }
}
