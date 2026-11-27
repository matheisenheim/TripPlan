import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CoordinatesField from './CoordinatesField'

// La recherche Nominatim part sur le réseau : on la mocke. Le sélecteur sur
// carte (MapLibre/WebGL) est remplacé par un stub.
const searchPlacesMock = vi.fn(async () => [
  { displayName: 'Kyoto, Préfecture de Kyoto, Japon', lat: 35.0116, lng: 135.7681 },
])
vi.mock('../utils/nominatimSearch', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../utils/nominatimSearch')>()
  return { ...mod, searchPlaces: (...args: unknown[]) => searchPlacesMock(...(args as [string, AbortSignal?])) }
})
vi.mock('./MapPickerModal', () => ({ default: () => null }))

async function pickKyoto() {
  await userEvent.type(screen.getByPlaceholderText(/Nom du lieu/i), 'Kyoto')
  await userEvent.click(await screen.findByText('Kyoto, Préfecture de Kyoto, Japon', undefined, { timeout: 3000 }))
}

describe('CoordinatesField', () => {
  it('choisir un lieu renseigne onChange, le garde affiché dans le champ, et il n’y a plus de champs lat/lng', async () => {
    const onChange = vi.fn()
    render(<CoordinatesField legend="Lieu" lat="" lng="" onChange={onChange} />)

    await pickKyoto()

    expect(onChange).toHaveBeenCalledWith('35.0116', '135.7681')
    // Le lieu choisi RESTE dans le champ de recherche…
    expect(screen.getByPlaceholderText(/Nom du lieu/i)).toHaveValue('Kyoto, Préfecture de Kyoto, Japon')
    // …sans relancer de recherche (pas de liste de résultats réaffichée).
    expect(screen.queryByText('Kyoto, Préfecture de Kyoto, Japon', { selector: 'li *' })).not.toBeInTheDocument()
    // Plus de champs Latitude/Longitude du tout.
    expect(screen.queryByText('Latitude')).not.toBeInTheDocument()
    expect(screen.queryByText('Longitude')).not.toBeInTheDocument()
  })

  it('le bouton « Effacer le lieu » vide le champ et les coordonnées', async () => {
    const onChange = vi.fn()
    const { rerender } = render(<CoordinatesField legend="Lieu" lat="" lng="" onChange={onChange} />)
    await pickKyoto()

    rerender(<CoordinatesField legend="Lieu" lat="35.0116" lng="135.7681" onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /Effacer le lieu/i }))

    expect(onChange).toHaveBeenLastCalledWith('', '')
    rerender(<CoordinatesField legend="Lieu" lat="" lng="" onChange={onChange} />)
    expect(screen.getByPlaceholderText(/Nom du lieu/i)).toHaveValue('')
  })
})
