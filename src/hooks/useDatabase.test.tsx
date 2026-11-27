import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDatabase } from './useDatabase'
import { loadLocalDatabase } from '../data/localDatabaseRepository'

beforeEach(() => {
  localStorage.clear()
})

describe('useDatabase — mode local (hors connexion)', () => {
  it('passe en mode local quand aucun fichier Drive n’est connecté', async () => {
    const { result } = renderHook(() => useDatabase())
    await waitFor(() => expect(result.current.status).toBe('ready'), { timeout: 5000 })
    expect(result.current.localMode).toBe(true)
    expect(result.current.trips).toEqual([])
  })

  it('addTrip persiste la base dans le stockage local', async () => {
    const { result } = renderHook(() => useDatabase())
    await waitFor(() => expect(result.current.status).toBe('ready'), { timeout: 5000 })

    await act(async () => {
      await result.current.addTrip({ name: 'Japon 2027' })
    })

    expect(result.current.trips).toHaveLength(1)
    expect(result.current.trips[0]?.name).toBe('Japon 2027')
    expect(result.current.selectedTripId).toBe(result.current.trips[0]?.id)
    expect((await loadLocalDatabase()).trips).toHaveLength(1)
  })

  it('importDatabase remplace toute la base et la persiste en local', async () => {
    const { result } = renderHook(() => useDatabase())
    await waitFor(() => expect(result.current.status).toBe('ready'), { timeout: 5000 })
    await act(async () => {
      await result.current.addTrip({ name: 'Vieux voyage' })
    })
    expect(result.current.trips).toHaveLength(1)

    await act(async () => {
      await result.current.importDatabase({ trips: [{ id: 't9', name: 'Base importée', stages: [] }] })
    })

    expect(result.current.trips).toHaveLength(1)
    expect(result.current.trips[0]?.name).toBe('Base importée')
    expect((await loadLocalDatabase()).trips[0]?.name).toBe('Base importée')
  })

  it('deleteTrip supprime le voyage et resélectionne le premier restant', async () => {
    const { result } = renderHook(() => useDatabase())
    await waitFor(() => expect(result.current.status).toBe('ready'), { timeout: 5000 })

    let firstId = ''
    await act(async () => {
      const t = await result.current.addTrip({ name: 'Voyage A' })
      firstId = t.id
      await result.current.addTrip({ name: 'Voyage B' })
    })
    expect(result.current.trips).toHaveLength(2)

    await act(async () => {
      await result.current.deleteTrip(firstId)
    })

    expect(result.current.trips).toHaveLength(1)
    expect(result.current.trips[0]?.name).toBe('Voyage B')
    expect((await loadLocalDatabase()).trips).toHaveLength(1)
  })
})
