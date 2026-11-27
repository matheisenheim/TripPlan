import { Preferences } from '@capacitor/preferences'
import { parseDatabaseContent } from './databaseRepository'
import type { Database } from '../types/trip'

// Mode hors connexion : la base vit dans le localStorage du navigateur (via
// Preferences, qui se replie sur localStorage sur le web) au lieu d'un fichier
// Google Drive. Ce mode est sélectionné automatiquement quand aucun fichier
// Drive n'est connecté — voir useDatabase.ts.
const LOCAL_DB_KEY = 'tripplan.database.local'

export async function loadLocalDatabase(): Promise<Database> {
  const { value } = await Preferences.get({ key: LOCAL_DB_KEY })
  if (!value) return { trips: [] }
  return parseDatabaseContent(value).database
}

export async function saveLocalDatabase(database: Database): Promise<void> {
  await Preferences.set({ key: LOCAL_DB_KEY, value: JSON.stringify(database, null, 2) })
}
