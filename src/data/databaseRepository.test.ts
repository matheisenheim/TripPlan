import { describe, expect, it } from 'vitest'
import { ParseError, SchemaTooNewError, parseDatabaseContent } from './databaseRepository'

describe('parseDatabaseContent (validation + migrations, commun Drive et local)', () => {
  it('accepte un contenu vide comme base vide', () => {
    expect(parseDatabaseContent('   ')).toEqual({ database: { trips: [] }, migrated: false })
  })

  it('rejette un JSON invalide', () => {
    expect(() => parseDatabaseContent('{oops')).toThrow(ParseError)
  })

  it('rejette une structure qui n’est pas une base de voyages', () => {
    expect(() => parseDatabaseContent('{"trips": 42}')).toThrow(ParseError)
  })

  it('bloque un schéma plus récent que ce build', () => {
    expect(() => parseDatabaseContent(JSON.stringify({ schemaVersion: 99, trips: [] }))).toThrow(SchemaTooNewError)
  })

  it('migre une base v1 (category unique → categories) vers v2', () => {
    const v1 = {
      trips: [
        {
          id: 't1',
          name: 'Japon',
          stages: [],
          activities: [{ id: 'a1', name: 'Ramen', stageGroup: 'Tokyo', category: 'restaurant', mapsUrl: '' }],
        },
      ],
    }
    const { database, migrated } = parseDatabaseContent(JSON.stringify(v1))
    expect(migrated).toBe(true)
    expect(database.schemaVersion).toBe(2)
    expect(database.trips[0]?.activities?.[0]?.categories).toEqual(['restaurant'])
  })

  it('ne migre pas une base déjà à jour (idempotent)', () => {
    const v2 = { schemaVersion: 2, trips: [] }
    expect(parseDatabaseContent(JSON.stringify(v2)).migrated).toBe(false)
  })
})
