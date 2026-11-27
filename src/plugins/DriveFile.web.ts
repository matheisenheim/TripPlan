import { WebPlugin } from '@capacitor/core'
import type { DriveFilePickResult, DriveFilePlugin } from './DriveFile'
import { getAccessToken } from '../services/googleAuth'
import { openPicker } from '../services/googlePicker'

// La lecture par plages d'octets (readRange) n'a pas lieu d'être côté web : la
// carte hors ligne y passe par un blob en mémoire (webMapFile.ts), pas par Drive.
const OFFLINE_MAP_UNAVAILABLE = "readRange n'est pas supporté sur le web (voir webMapFile.ts)."

export class DriveFileWeb extends WebPlugin implements DriveFilePlugin {
  async pickFile(): Promise<DriveFilePickResult> {
    const token = await getAccessToken({ interactive: true })
    const { fileId, name } = await openPicker(token)
    return { uri: fileId, name }
  }

  async hasPersistedAccess(): Promise<{ granted: boolean }> {
    try {
      await getAccessToken({ interactive: false })
      return { granted: true }
    } catch {
      return { granted: false }
    }
  }

  async readText(options: { uri: string }): Promise<{ content: string }> {
    const token = await getAccessToken({ interactive: false })
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${options.uri}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Lecture Drive échouée (${res.status}).`)
    return { content: await res.text() }
  }

  async writeText(options: { uri: string; content: string }): Promise<void> {
    const token = await getAccessToken({ interactive: false })
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${options.uri}?uploadType=media`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: options.content,
    })
    if (!res.ok) throw new Error(`Écriture Drive échouée (${res.status}).`)
  }

  async getMetadata(options: { uri: string }): Promise<{ modifiedTime: string }> {
    const token = await getAccessToken({ interactive: false })
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${options.uri}?fields=modifiedTime`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error(`Lecture des métadonnées Drive échouée (${res.status}).`)
    const data = (await res.json()) as { modifiedTime: string }
    return { modifiedTime: data.modifiedTime }
  }

  readRange(): Promise<{ dataBase64: string }> {
    return Promise.reject(new Error(OFFLINE_MAP_UNAVAILABLE))
  }

  closeRangeRead(): Promise<void> {
    // No-op côté web : aucun descripteur de fichier à fermer (le blob PMTiles est
    // géré par webMapFile.ts). MapView appelle closeRangeRead() au démontage.
    return Promise.resolve()
  }
}
