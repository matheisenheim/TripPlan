import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Preferences } from '@capacitor/preferences'
import App from './App'
import { saveLocalDatabase } from './data/localDatabaseRepository'

// MapLibre a besoin de WebGL/canvas, absent de jsdom : on le remplace par un
// stub. Le smoke test vérifie que l'app démarre et rend (anti page blanche).
vi.mock('./components/MapView', () => ({ default: () => <div data-testid="map-stub" /> }))

beforeEach(() => {
  localStorage.clear()
})

describe('App — smoke (anti page blanche)', () => {
  it('démarre sans erreur et affiche l’écran « aucun voyage » en mode local', async () => {
    render(<App />)
    await waitFor(() => expect(screen.getByText(/Crée ton premier voyage depuis le header/i)).toBeInTheDocument(), {
      timeout: 5000,
    })
    expect(screen.getByRole('button', { name: /en créer un/i })).toBeInTheDocument()
  })

  it('affiche le voyage sélectionné depuis la base locale et monte la carte', async () => {
    await saveLocalDatabase({ schemaVersion: 2, trips: [{ id: 't1', name: 'Japon 2027', stages: [] }] })
    await Preferences.set({ key: 'selectedTripId', value: 't1' })
    render(<App />)
    await waitFor(() => expect(screen.getByText('Japon 2027')).toBeInTheDocument(), { timeout: 5000 })
    expect(screen.getByTestId('map-stub')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Planning' })).toBeInTheDocument()
  })
})
