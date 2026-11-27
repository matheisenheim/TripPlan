import { useCallback, useEffect, useState } from 'react'
import { Preferences } from '@capacitor/preferences'

const CACHE_KEY = 'exchangeRatesV2'

export type Currency = 'EUR' | 'JPY' | 'USD' | 'GBP'
export type FiatCurrency = Exclude<Currency, 'EUR'>
export const FIAT_CURRENCIES: FiatCurrency[] = ['JPY', 'USD', 'GBP']
export const ALL_CURRENCIES: Currency[] = ['EUR', ...FIAT_CURRENCIES]

export interface ExchangeRates {
  /** Nombre d'unités de la devise pour 1 €. */
  rates: Record<FiatCurrency, number>
  /** Date du taux publié par la source (ISO `YYYY-MM-DD`). */
  date: string
  source: 'BCE' | 'ExchangeRate-API'
}

export type ExchangeRateStatus = 'loading' | 'ready' | 'offline' | 'error'

// Frankfurter publie les taux de référence BCE (mis à jour chaque jour ouvré
// vers 16h CET). open.er-api.com sert de repli si Frankfurter est indisponible.
// Aucune des deux n'exige de clé API et toutes deux autorisent le CORS.
async function fetchRates(): Promise<ExchangeRates> {
  try {
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${FIAT_CURRENCIES.join(',')}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { date: string; rates: Partial<Record<FiatCurrency, number>> }
    const rates = Object.fromEntries(FIAT_CURRENCIES.map((c) => [c, json.rates[c]])) as Record<FiatCurrency, number>
    if (FIAT_CURRENCIES.some((c) => typeof rates[c] !== 'number')) throw new Error('taux manquants')
    return { rates, date: json.date, source: 'BCE' }
  } catch {
    const res = await fetch('https://open.er-api.com/v6/latest/EUR')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = (await res.json()) as { time_last_update_unix: number; rates: Partial<Record<FiatCurrency, number>> }
    const rates = Object.fromEntries(FIAT_CURRENCIES.map((c) => [c, json.rates[c]])) as Record<FiatCurrency, number>
    if (FIAT_CURRENCIES.some((c) => typeof rates[c] !== 'number')) throw new Error('taux manquants')
    const date = new Date(json.time_last_update_unix * 1000).toISOString().slice(0, 10)
    return { rates, date, source: 'ExchangeRate-API' }
  }
}

async function readCache(): Promise<ExchangeRates | null> {
  const { value } = await Preferences.get({ key: CACHE_KEY })
  if (!value) return null
  try {
    return JSON.parse(value) as ExchangeRates
  } catch {
    return null
  }
}

/**
 * Taux de change pour 1 € (JPY, USD, GBP). Le dernier taux obtenu est mis en
 * cache pour rester utilisable sans réseau (cas typique en voyage) — le
 * statut `'offline'` signale alors qu'on affiche un taux potentiellement ancien.
 */
export function useExchangeRate() {
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [status, setStatus] = useState<ExchangeRateStatus>('loading')

  const refresh = useCallback(async () => {
    setStatus('loading')
    try {
      const fresh = await fetchRates()
      setRates(fresh)
      setStatus('ready')
      await Preferences.set({ key: CACHE_KEY, value: JSON.stringify(fresh) })
    } catch {
      const cached = await readCache()
      setRates((current) => current ?? cached)
      setStatus(cached ? 'offline' : 'error')
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    // Affiche immédiatement le taux en cache pendant que le réseau répond.
    readCache().then((cached) => {
      if (!cancelled && cached) setRates((current) => current ?? cached)
    })
    refresh()
    return () => {
      cancelled = true
    }
  }, [refresh])

  return { rates, status, refresh }
}
