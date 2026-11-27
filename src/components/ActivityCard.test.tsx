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
