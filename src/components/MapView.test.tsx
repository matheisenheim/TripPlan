import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Preferences } from '@capacitor/preferences'
import App from '../App'
import { saveLocalDatabase } from '../data/localDatabaseRepository'

// Simule un mobile où MapLibre plante à la création de la carte (ex. WebGL
// indisponible) : le constructeur lève une erreur dans un useEffect.
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: () => {},
  addProtocol: () => {},
  removeProtocol: () => {},
  Map: class {
    constructor() {
      throw new Error('WebGL indisponible (simulé)')
    }
  },
  Marker: class {},
  Popup: class {},
  NavigationControl: class {},
}))

beforeEach(() => {
  localStorage.clear()
})

describe('MapView — plantage de la carte (anti page blanche)', () => {
  it('affiche un fallback « Carte indisponible » au lieu de faire démontager toute l’app', async () => {
    await saveLocalDatabase({ schemaVersion: 2, trips: [{ id: 't1', name: 'Japon 2027', stages: [] }] })
    await Preferences.set({ key: 'selectedTripId', value: 't1' })

    render(<App />)

    await waitFor(() => expect(screen.getByText(/Carte indisponible sur cet appareil/i)).toBeInTheDocument(), {
      timeout: 5000,
    })
    expect(screen.getByText(/WebGL indisponible \(simulé\)/)).toBeInTheDocument()
    // L'app n'est pas démontée : les autres onglets restent là.
    expect(screen.getByRole('button', { name: 'Planning' })).toBeInTheDocument()
  })
})
