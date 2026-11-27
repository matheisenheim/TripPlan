import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ActivityCard from './ActivityCard'
import type { Activity } from '../types/trip'

const baseActivity: Activity = {
  id: 'a1',
  name: 'Château d’Édimbourg',
  stageGroup: 'Édimbourg',
  categories: ['point_of_interest'],
  mapsUrl: '',
}

describe('ActivityCard — wishlist retirable + actions visibles', () => {
  it('activité en wishlist : le chip « envie de faire » permet de retirer (clic)', async () => {
    const onToggleWishlist = vi.fn()
    render(
      <ActivityCard
        activity={{ ...baseActivity, wishlist: true }}
        onToggleWishlist={onToggleWishlist}
        wishlistLabel="Wishlist"
      />,
    )
    const chip = screen.getByRole('button', { name: /Retirer de la liste d'envies/i })
    await userEvent.click(chip)
    expect(onToggleWishlist).toHaveBeenCalledWith(expect.objectContaining({ id: 'a1', wishlist: true }))
  })

  it('activité hors wishlist : bouton drapeau pour la marquer', async () => {
    const onToggleWishlist = vi.fn()
    render(<ActivityCard activity={baseActivity} onToggleWishlist={onToggleWishlist} />)
    await userEvent.click(screen.getByRole('button', { name: /Marquer comme envie de faire/i }))
    expect(onToggleWishlist).toHaveBeenCalled()
  })

})

describe('ActivityCard — lien En Maps', () => {
  it('sans lien Google Maps : aucune icône ni texte « En Maps » affiché', () => {
    render(<ActivityCard activity={baseActivity} />)
    expect(screen.queryByText('En Maps')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /En Maps/i })).not.toBeInTheDocument()
  })

  it('avec un lien Google Maps : le lien « En Maps » est affiché avec le bon href', () => {
    render(
      <ActivityCard
        activity={{ ...baseActivity, mapsUrl: 'https://maps.google.com/?q=Edinburgh+Castle' }}
      />,
    )
    const link = screen.getByRole('link', { name: /En Maps/i })
    expect(link).toHaveAttribute('href', 'https://maps.google.com/?q=Edinburgh+Castle')
  })

  it('mode compact : jamais de lien « En Maps » même avec un mapsUrl', () => {
    render(
      <ActivityCard
        activity={{ ...baseActivity, mapsUrl: 'https://maps.google.com/?q=Edinburgh+Castle' }}
        compact
      />,
    )
    expect(screen.queryByRole('link', { name: /En Maps/i })).not.toBeInTheDocument()
  })
})
