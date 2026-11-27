import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CurrencyConverter from './CurrencyConverter'

// Pas de réseau en test : taux fixes pour 1 €.
vi.mock('../hooks/useExchangeRate', () => ({
  ALL_CURRENCIES: ['EUR', 'JPY', 'USD', 'GBP'],
  FIAT_CURRENCIES: ['JPY', 'USD', 'GBP'],
  useExchangeRate: () => ({
    rates: { rates: { JPY: 160, USD: 1.1, GBP: 0.85 }, date: '2026-11-27', source: 'BCE' },
    status: 'ready',
    refresh: vi.fn(),
  }),
}))

const digits = (v: string) => v.replace(/\s/g, '')

describe('CurrencyConverter (EUR/JPY/USD/GBP)', () => {
  it('convertit EUR → JPY par défaut, puis vers USD/GBP via les sélecteurs', async () => {
    render(<CurrencyConverter />)

    await userEvent.type(screen.getByLabelText('Montant de départ'), '100')
    expect(digits(screen.getByLabelText("Montant d'arrivée").value)).toBe('16000')

    await userEvent.selectOptions(screen.getByLabelText("Devise d'arrivée"), 'USD')
    expect(digits(screen.getByLabelText("Montant d'arrivée").value)).toBe('110')

    await userEvent.selectOptions(screen.getByLabelText('Devise de départ'), 'GBP')
    expect(digits(screen.getByLabelText("Montant d'arrivée").value)).toBe('129,41')
  })

  it('le bouton swap inverse les devises', async () => {
    render(<CurrencyConverter />)
    await userEvent.type(screen.getByLabelText('Montant de départ'), '100')
    await userEvent.click(screen.getByLabelText('Inverser les devises'))
    expect(screen.getByLabelText('Devise de départ')).toHaveValue('JPY')
    expect(screen.getByLabelText("Devise d'arrivée")).toHaveValue('EUR')
    expect(digits(screen.getByLabelText("Montant d'arrivée").value)).toBe('0,63')
  })
})
