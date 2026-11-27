import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchOverpassSuggestions,
  fetchParisEventSuggestions,
  fetchWikidataSuggestions,
  googleMapsUrl,
  osmCategory,
} from './publicSuggestions'

const center = { lat: 48.8566, lng: 2.3522 } // Paris

function stubFetch(handler: (url: string) => unknown) {
  const fetchMock = vi.fn(async (input: unknown) => {
    const result = handler(String(input))
    if (result instanceof Error) throw result
    return { ok: true, status: 200, json: async () => result } as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('osmCategory', () => {
  it('mappe les tags OSM vers les catégories de l’app', () => {
    expect(osmCategory({ tourism: 'museum' })).toBe('museum')
    expect(osmCategory({ historic: 'museum' })).toBe('museum')
    expect(osmCategory({ amenity: 'restaurant' })).toBe('restaurant')
    expect(osmCategory({ amenity: 'cafe' })).toBe('restaurant')
    expect(osmCategory({ natural: 'peak' })).toBe('hike')
    expect(osmCategory({ shop: 'gift' })).toBe('souvenir')
    expect(osmCategory({ amenity: 'marketplace' })).toBe('shop')
    expect(osmCategory({ tourism: 'attraction' })).toBe('point_of_interest')
    expect(osmCategory({ historic: 'castle' })).toBe('point_of_interest')
  })
})

describe('googleMapsUrl', () => {
  it('génère un lien Google Maps avec les coordonnées', () => {
    expect(googleMapsUrl({ lat: 48.8566, lng: 2.3522 })).toBe('https://maps.google.com/?q=48.8566,2.3522')
  })
})

describe('fetchOverpassSuggestions', () => {
  it('parse les éléments nommés, déduplique, construit coordonnées + lien Maps', async () => {
    stubFetch((url) => {
      expect(url).toContain('overpass')
      return {
        elements: [
          { type: 'node', lat: 48.8584, lon: 2.2945, tags: { name: 'Tour Eiffel', tourism: 'attraction' } },
          { type: 'way', center: { lat: 48.8606, lon: 2.3376 }, tags: { name: 'Musée du Louvre', tourism: 'museum' } },
          { type: 'node', lat: 48.85, lon: 2.35, tags: { name: 'Tour Eiffel' } }, // doublon de nom
          { type: 'node', lat: 48.86, lon: 2.36, tags: { tourism: 'attraction' } }, // sans nom
        ],
      }
    })
    const items = await fetchOverpassSuggestions(center, 20, 'Paris')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      name: 'Tour Eiffel',
      city: 'Paris',
      category: 'point_of_interest',
      coordinates: { lat: 48.8584, lng: 2.2945 },
      mapsUrl: 'https://maps.google.com/?q=48.8584,2.2945',
      source: 'OpenStreetMap',
    })
    expect(items[1].category).toBe('museum')
    expect(items[1].coordinates).toEqual({ lat: 48.8606, lng: 2.3376 })
  })

  it('retombe sur le second endpoint Overpass si le premier échoue', async () => {
    let calls = 0
    stubFetch((url) => {
      calls++
      if (calls === 1) return new Error('réseau indisponible')
      expect(url).toContain('overpass')
      return { elements: [{ type: 'node', lat: 48.85, lon: 2.35, tags: { name: 'Panthéon', historic: 'monument' } }] }
    })
    const items = await fetchOverpassSuggestions(center, 20, 'Paris')
    expect(calls).toBe(2)
    expect(items[0].name).toBe('Panthéon')
  })

  it('rejette si tous les endpoints échouent (hors connexion)', async () => {
    stubFetch(() => new Error('hors connexion'))
    await expect(fetchOverpassSuggestions(center, 20, 'Paris')).rejects.toThrow('hors connexion')
  })
})

describe('fetchWikidataSuggestions', () => {
  it('parse Point(lng lat), filtre hors rayon, mappe le musée', async () => {
    stubFetch((url) => {
      expect(url).toContain('query.wikidata.org')
      return {
        results: {
          bindings: [
            {
              itemLabel: { value: 'Musée du Louvre' },
              coord: { value: 'Point(2.3376 48.8606)' },
              dist: { value: '0.5' },
              class: { value: 'http://www.wikidata.org/entity/Q33506' },
            },
            {
              itemLabel: { value: 'Château de Versailles' },
              coord: { value: 'Point(2.1204 48.8049)' },
              dist: { value: '17' },
              class: { value: 'http://www.wikidata.org/entity/Q23413' },
            },
            { itemLabel: { value: 'Trop loin' }, coord: { value: 'Point(3.0 49.5)' }, dist: { value: '60' } },
          ],
        },
      }
    })
    const items = await fetchWikidataSuggestions(center, 20, 'Paris')
    expect(items.map((i) => i.name)).toEqual(['Musée du Louvre', 'Château de Versailles'])
    expect(items[0].category).toBe('museum')
    expect(items[0].coordinates).toEqual({ lat: 48.8606, lng: 2.3376 })
    expect(items[0].source).toBe('Wikidata')
    expect(items[1].category).toBe('point_of_interest')
  })
})

describe('fetchParisEventSuggestions', () => {
  const records = {
    records: [
      {
        title: 'Concert au Louvre',
        lat_lon: { lat: 48.8606, lon: 2.3376 },
        occurrences: [{ start: '2026-12-01T20:00:00+01:00', end: '2026-12-01T22:00:00+01:00' }],
        address_name: 'Musée du Louvre',
        address_city: 'Paris',
        price_type: 'Payant',
      },
      {
        title: 'Expo un autre jour',
        lat_lon: { lat: 48.8606, lon: 2.3376 },
        occurrences: [{ start: '2026-12-05T10:00:00+01:00' }],
      },
      {
        title: 'Trop loin',
        lat_lon: { lat: 45.76, lon: 4.83 }, // Lyon
        occurrences: [{ start: '2026-12-01T10:00:00+01:00' }],
      },
    ],
  }

  it('garde les événements du jour choisi dans le rayon, avec date et heure', async () => {
    stubFetch((url) => {
      expect(url).toContain('opendata.paris.fr')
      return records
    })
    const items = await fetchParisEventSuggestions(center, 20, 'Paris', '2026-12-01')
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      name: 'Concert au Louvre',
      date: '2026-12-01',
      time: '20:00',
      category: 'point_of_interest',
      coordinates: { lat: 48.8606, lng: 2.3376 },
      mapsUrl: 'https://maps.google.com/?q=48.8606,2.3376',
      source: 'Que faire à Paris',
    })
    expect(items[0].notes).toContain('Musée du Louvre')
    expect(items[0].notes).toContain('Payant')
  })

  it('rejette hors connexion', async () => {
    stubFetch(() => new Error('réseau coupé'))
    await expect(fetchParisEventSuggestions(center, 20, 'Paris', '2026-12-01')).rejects.toThrow('réseau coupé')
  })
})
