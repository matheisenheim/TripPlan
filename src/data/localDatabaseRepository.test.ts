import { beforeEach, describe, expect, it } from 'vitest'
import { loadLocalDatabase, saveLocalDatabase } from './localDatabaseRepository'
import type { Database } from '../types/trip'

beforeEach(() => {
  localStorage.clear()
})

describe('localDatabaseRepository (mode hors connexion)', () => {
  it('retourne une base vide quand rien n’est stocké', async () => {
    expect(await loadLocalDatabase()).toEqual({ trips: [] })
  })

  it('persiste et recharge une base (round-trip)', async () => {
    const db: Database = { schemaVersion: 2, trips: [{ id: 't1', name: 'Japon', stages: [] }] }
    await saveLocalDatabase(db)
    expect(await loadLocalDatabase()).toEqual(db)
  })

  it('applique les migrations en lecture (v1 → v2)', async () => {
    await saveLocalDatabase({
      trips: [
        {
          id: 't1',
          name: 'Japon',
          stages: [],
          // Base v1 : pas de champ `categories`, seulement `category`.
          activities: [{ id: 'a1', name: 'Ramen', stageGroup: 'Tokyo', mapsUrl: '', category: 'restaurant' } as never],
        },
      ],
    })
    const db = await loadLocalDatabase()
    expect(db.schemaVersion).toBe(2)
    expect(db.trips[0]?.activities?.[0]?.categories).toEqual(['restaurant'])
  })
})
