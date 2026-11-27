import { useState } from 'react'
import { ALL_CURRENCIES, FIAT_CURRENCIES, useExchangeRate, type Currency, type FiatCurrency } from '../hooks/useExchangeRate'
import Button from './ui/Button'
import Icon from './ui/Icon'

const CURRENCY_SYMBOLS: Record<Currency, string> = { EUR: '€', JPY: '¥', USD: '$', GBP: '£' }

const numFormats = Object.fromEntries(
  ALL_CURRENCIES.map((c) => [c, new Intl.NumberFormat('fr-FR', { maximumFractionDigits: c === 'JPY' ? 0 : 2 })]),
) as Record<Currency, Intl.NumberFormat>
const rateFormat = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

// Accepte la virgule (clavier FR) comme le point, et ignore les espaces de
// milliers qu'Intl insère dans le champ calculé si on le réédite.
function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/\s/g, '').replace(',', '.')
  if (cleaned === '') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export default function CurrencyConverter() {
  const { rates, status, refresh } = useExchangeRate()
  const [from, setFrom] = useState<Currency>('EUR')
  const [to, setTo] = useState<Currency>('JPY')
  // Seul le champ saisi garde son texte brut ; l'autre est toujours recalculé,
  // pour que la conversion suive automatiquement un rafraîchissement du taux.
  const [edited, setEdited] = useState<{ side: 'from' | 'to'; raw: string }>({ side: 'from', raw: '' })

  const rateOf = (c: Currency): number | null => (c === 'EUR' ? 1 : (rates?.rates[c as FiatCurrency] ?? null))
  const amount = parseAmount(edited.raw)
  const rateFrom = rateOf(from)
  const rateTo = rateOf(to)
  const converted = amount !== null && rateFrom && rateTo ? (amount * rateTo) / rateFrom : null

  const fromValue = edited.side === 'from' ? edited.raw : converted !== null ? numFormats[from].format(converted) : ''
  const toValue = edited.side === 'to' ? edited.raw : converted !== null ? numFormats[to].format(converted) : ''

  let statusText: string
  if (rates) {
    statusText = `1 € = ${FIAT_CURRENCIES.map((c) => `${rateFormat.format(rates.rates[c])} ${CURRENCY_SYMBOLS[c]}`).join(' · ')} · taux du ${formatDate(rates.date)} (${rates.source})`
    if (status === 'offline') statusText += ' — hors ligne, dernier taux connu'
  } else if (status === 'error') {
    statusText = 'Taux indisponible — vérifiez la connexion'
  } else {
    statusText = 'Récupération des taux…'
  }

  return (
    <section className="converter" aria-label="Convertisseur de devises">
      <div className="converter__fields">
        <label className="converter__field">
          <select
            className="converter__currency"
            value={from}
            onChange={(e) => setFrom(e.target.value as Currency)}
            aria-label="Devise de départ"
          >
            {ALL_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_SYMBOLS[c]} {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={fromValue}
            disabled={!rates}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setEdited({ side: 'from', raw: e.target.value })}
            aria-label="Montant de départ"
          />
        </label>
        <button
          type="button"
          className="converter__arrow"
          onClick={() => {
            setFrom(to)
            setTo(from)
          }}
          aria-label="Inverser les devises"
          disabled={!rates}
        >
          <Icon name="swap" size={18} />
        </button>
        <label className="converter__field">
          <select
            className="converter__currency"
            value={to}
            onChange={(e) => setTo(e.target.value as Currency)}
            aria-label="Devise d'arrivée"
          >
            {ALL_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {CURRENCY_SYMBOLS[c]} {c}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={toValue}
            disabled={!rates}
            onFocus={(e) => e.currentTarget.select()}
            onChange={(e) => setEdited({ side: 'to', raw: e.target.value })}
            aria-label="Montant d'arrivée"
          />
        </label>
      </div>
      <div className="converter__footer">
        <span className={status === 'offline' || status === 'error' ? 'converter__rate converter__rate--warn' : 'converter__rate'}>
          {statusText}
        </span>
        <Button
          iconOnly
          variant="ghost"
          size="sm"
          icon="refresh"
          aria-label="Actualiser les taux"
          loading={status === 'loading'}
          onClick={refresh}
        />
      </div>
    </section>
  )
}
