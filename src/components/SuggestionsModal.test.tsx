import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SuggestionsModal from './SuggestionsModal'
import type { Trip } from '../types/trip'

const trip: Trip = {
  id: 't1',
  name: 'Paris 2026',
  stages: [
    {
      id: 's1',
      city: 'Paris',
      order: 1,
      coordinates: { lat: 48.8566, lng: 2.3522 },
      accommodations: [],
      excursions: [],
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('SuggestionsModal — sources de propositions', () => {
  it('catalogue embarqué par défaut, filtrable par ville (20 km)', async () => {
    render(<SuggestionsModal trip={trip} onAddSuggestion={() => {}} onClose={() => {}} />)
    // sans ville choisie : tout le catalogue est listé
    expect(screen.getByText('Fushimi Inari (torii rouges)')).toBeInTheDocument()
    await userEvent.selectOptions(screen.getByLabelText(/^Ville/), 'Paris')
    await waitFor(() => expect(screen.queryByText('Fushimi Inari (torii rouges)')).not.toBeInTheDocument())
    expect(screen.getByText('Tour Eiffel (esplanade du Trocadéro)')).toBeInTheDocument()
  })

  it('source OpenStreetMap : recherche autour de la ville puis ajout au voyage', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          elements: [
            { type: 'node', lat: 48.8584, lon: 2.2945, tags: { name: 'Tour Eiffel', tourism: 'attraction' } },
          ],
        }),
      })),
    )
    const onAddSuggestion = vi.fn()
    render(<SuggestionsModal trip={trip} onAddSuggestion={onAddSuggestion} onClose={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^Source/), 'osm')
    // la 1re ville du voyage est pré-sélectionnée automatiquement
    const addBtn = await screen.findByRole('button', { name: /Tour Eiffel/ })
    await userEvent.click(addBtn)
    expect(onAddSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Tour Eiffel',
        city: 'Paris',
        category: 'point_of_interest',
        coordinates: { lat: 48.8584, lng: 2.2945 },
        source: 'OpenStreetMap',
      }),
    )
  })

  it('source en ligne hors connexion : message d’erreur explicite', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('hors connexion')
      }),
    )
    render(<SuggestionsModal trip={trip} onAddSuggestion={() => {}} onClose={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^Source/), 'wikidata')
    const err = await screen.findByText(/Recherche impossible/)
    expect(err).toHaveTextContent(/hors connexion/)
  })

  it('source événements Paris : champ date affiché et date transmise', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          records: [
            {
              title: 'Concert au Louvre',
              lat_lon: { lat: 48.8606, lon: 2.3376 },
              occurrences: [{ start: '2026-12-01T20:00:00+01:00' }],
              price_type: 'Gratuit',
            },
          ],
        }),
      })),
    )
    const onAddSuggestion = vi.fn()
    render(<SuggestionsModal trip={trip} onAddSuggestion={onAddSuggestion} onClose={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^Source/), 'paris')
    const dateInput = screen.getByLabelText(/^Date/) as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-12-01' } })
    const addBtn = await screen.findByRole('button', { name: /Concert au Louvre/ })
    await userEvent.click(addBtn)
    expect(onAddSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Concert au Louvre', date: '2026-12-01', time: '20:00' }),
    )
  })
})
