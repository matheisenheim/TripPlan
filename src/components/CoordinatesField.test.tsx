import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CoordinatesField from './CoordinatesField'

// La recherche Nominatim part sur le réseau : on la mocke. Le sélecteur sur
// carte (MapLibre/WebGL) est remplacé par un stub.
vi.mock('../utils/nominatimSearch', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../utils/nominatimSearch')>()
  return {
    ...mod,
    searchPlaces: vi.fn(async () => [{ displayName: 'Kyoto, Préfecture de Kyoto, Japon', lat: 35.0116, lng: 135.7681 }]),
  }
})
vi.mock('./MapPickerModal', () => ({ default: () => null }))

describe('CoordinatesField', () => {
  it('choisir un lieu dans les résultats renseigne onChange et masque les champs lat/lng', async () => {
    const onChange = vi.fn()
    render(<CoordinatesField legend="Lieu" lat="" lng="" onChange={onChange} />)

    await userEvent.type(screen.getByPlaceholderText(/Nom du lieu/i), 'Kyoto')
    const result = await screen.findByText('Kyoto, Préfecture de Kyoto, Japon', undefined, { timeout: 3000 })
    await userEvent.click(result)

    expect(onChange).toHaveBeenCalledWith('35.0116', '135.7681')
    expect(screen.queryByLabelText('Latitude')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Longitude')).not.toBeInTheDocument()
    expect(screen.getByText(/Lieu choisi : Kyoto/)).toBeInTheDocument()
  })

  it('le bouton « Effacer » vide le lieu et réaffiche lat/lng', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<CoordinatesField legend="Lieu" lat="" lng="" onChange={onChange} />)
    await userEvent.type(screen.getByPlaceholderText(/Nom du lieu/i), 'Kyoto')
    await userEvent.click(await screen.findByText('Kyoto, Préfecture de Kyoto, Japon', undefined, { timeout: 3000 }))

    // Simule le parent qui remonte les coordonnées choisies.
    rerender(<CoordinatesField legend="Lieu" lat="35.0116" lng="135.7681" onChange={onChange} />)
    expect(screen.queryByLabelText('Latitude')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Effacer/i }))
    expect(onChange).toHaveBeenLastCalledWith('', '')

    rerender(<CoordinatesField legend="Lieu" lat="" lng="" onChange={onChange} />)
    expect(screen.getByLabelText('Latitude')).toBeInTheDocument()
  })
})
