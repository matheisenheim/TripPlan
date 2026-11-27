import type { ActivityCategory, Coordinates } from '../types/trip'
import type { ActivitySuggestion } from '../data/activitySuggestions'
import { haversineKm } from '../utils/geo'

// Sources publiques d'activités proposées, appelées depuis le navigateur
// (CORS requis, aucune clé) utilisées par la modale « Propositions » :
// - Overpass (OpenStreetMap) : POI nommés dans un rayon autour de l'étape
// - Wikidata (SPARQL) : attractions/musées/châteaux « notables » à proximité
// - Paris Data « Que faire à Paris ? » : événements datés (Paris/région)
// Hors connexion, ces appels échouent : la modale retombe alors sur le catalogue
// embarqué (src/data/activitySuggestions.ts).

const FETCH_TIMEOUT_MS = 30_000
const OVERPASS_RESULT_LIMIT = 80
const WIKIDATA_RESULT_LIMIT = 40
const PARIS_RESULT_LIMIT = 100

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

export function googleMapsUrl(c: Coordinates): string {
  return `https://maps.google.com/?q=${c.lat},${c.lng}`
}

async function fetchJson(url: string, init?: RequestInit, timeoutMs = FETCH_TIMEOUT_MS): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// ---------- Overpass (OpenStreetMap) ----------

function overpassQuery(center: Coordinates, radiusKm: number): string {
  const radiusM = Math.round(radiusKm * 1000)
  const { lat, lng } = center
  return `[out:json][timeout:25];
(
  nwr["name"]["tourism"~"^(attraction|museum|gallery|viewpoint|castle|ruins|zoo|theme_park|artwork|monument)$"](around:${radiusM},${lat},${lng});
  nwr["name"]["historic"](around:${radiusM},${lat},${lng});
  nwr["name"]["amenity"~"^(restaurant|fast_food|cafe|bar|pub|biergarten|ice_cream|marketplace)$"](around:${radiusM},${lat},${lng});
  nwr["name"]["leisure"~"^(park|garden|nature_reserve|playground)$"](around:${radiusM},${lat},${lng});
  nwr["name"]["natural"~"^(peak|beach|waterfall)$"](around:${radiusM},${lat},${lng});
  nwr["name"]["shop"~"^(mall|gift)$"](around:${radiusM},${lat},${lng});
);
out tags center ${OVERPASS_RESULT_LIMIT};`
}

export function osmCategory(tags: Record<string, string>): ActivityCategory {
  if (tags.tourism === 'museum' || tags.historic === 'museum') return 'museum'
  if (['restaurant', 'fast_food', 'cafe', 'bar', 'pub', 'biergarten', 'ice_cream'].includes(tags.amenity)) return 'restaurant'
  if (tags.natural === 'peak' || tags.leisure === 'nature_reserve') return 'hike'
  if (tags.shop === 'gift') return 'souvenir'
  if (tags.shop === 'mall' || tags.amenity === 'marketplace') return 'shop'
  return 'point_of_interest'
}

interface OverpassElement {
  type: string
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  tags?: Record<string, string>
}

export async function fetchOverpassSuggestions(
  center: Coordinates,
  radiusKm: number,
  city: string,
): Promise<ActivitySuggestion[]> {
  const body = `data=${encodeURIComponent(overpassQuery(center, radiusKm))}`
  let lastError: unknown
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const data = (await fetchJson(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      })) as { elements?: OverpassElement[] }
      const seen = new Set<string>()
      const out: ActivitySuggestion[] = []
      for (const el of data.elements ?? []) {
        const tags = el.tags ?? {}
        const name = tags['name:fr'] ?? tags.name
        if (!name) continue
        const key = name.trim().toLowerCase()
        if (seen.has(key)) continue
        const lat = el.lat ?? el.center?.lat
        const lng = el.lon ?? el.center?.lon
        if (lat === undefined || lng === undefined) continue
        seen.add(key)
        const coordinates = { lat, lng }
        out.push({
          name: name.trim(),
          city,
          category: osmCategory(tags),
          coordinates,
          mapsUrl: googleMapsUrl(coordinates),
          source: 'OpenStreetMap',
        })
      }
      return out
    } catch (e) {
      lastError = e
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

// ---------- Wikidata (SPARQL) ----------

interface SparqlBinding {
  itemLabel?: { value: string }
  coord?: { value: string }
  dist?: { value: string }
  class?: { value: string }
}

// Q570116 = attraction touristique, Q33506 = musée, Q23413 = château
const WIKIDATA_CLASSES = ['wd:Q570116', 'wd:Q33506', 'wd:Q23413']

export async function fetchWikidataSuggestions(
  center: Coordinates,
  radiusKm: number,
  city: string,
): Promise<ActivitySuggestion[]> {
  const query = `SELECT ?item ?itemLabel ?coord ?dist ?class WHERE {
  SERVICE wikibase:around {
    ?item wdt:P625 ?coord .
    bd:serviceParam wikibase:center "Point(${center.lng} ${center.lat})"^^geo:wktLiteral .
    bd:serviceParam wikibase:radius "${radiusKm}" .
    bd:serviceParam wikibase:distance ?dist .
  }
  { ${WIKIDATA_CLASSES.map((c) => `?item wdt:P31/wdt:P279* ${c}`).join(' } UNION { ')} }
  OPTIONAL { ?item wdt:P31 ?class }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en" . }
}
ORDER BY ?dist
LIMIT ${WIKIDATA_RESULT_LIMIT}`
  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`
  const data = (await fetchJson(url, {
    headers: { Accept: 'application/sparql-results+json' },
  })) as { results?: { bindings?: SparqlBinding[] } }

  const out: ActivitySuggestion[] = []
  for (const b of data.results?.bindings ?? []) {
    const name = b.itemLabel?.value
    const coordRaw = b.coord?.value ?? ''
    const match = coordRaw.match(/^Point\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)$/)
    if (!name || !match) continue
    const coordinates = { lat: Number(match[2]), lng: Number(match[1]) }
    // Filtre client de sécurité : on ne garde que ce qui est vraiment dans le rayon.
    if (haversineKm(center, coordinates) > radiusKm) continue
    out.push({
      name,
      city,
      category: b.class?.value === 'http://www.wikidata.org/entity/Q33506' ? 'museum' : 'point_of_interest',
      coordinates,
      mapsUrl: googleMapsUrl(coordinates),
      source: 'Wikidata',
    })
  }
  return out
}

// ---------- Paris Data « Que faire à Paris ? » (événements datés) ----------

const PARIS_RECORDS_URL =
  'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/que-faire-a-paris-/records'

interface ParisOccurrence {
  start?: string
  end?: string
}

interface ParisRecord {
  title?: string
  lat_lon?: { lat?: number; lon?: number } | [number, number]
  occurrences?: ParisOccurrence[]
  address_name?: string
  address_city?: string
  price_type?: string
  tags?: string[]
}

function parisRecordCoords(rec: ParisRecord): Coordinates | undefined {
  const ll = rec.lat_lon
  if (!ll) return undefined
  if (Array.isArray(ll)) {
    const [lon, lat] = ll
    if (typeof lat === 'number' && typeof lon === 'number') return { lat, lng: lon }
    return undefined
  }
  if (typeof ll.lat === 'number' && typeof ll.lon === 'number') return { lat: ll.lat, lng: ll.lon }
  return undefined
}

function isoDay(iso: string): string {
  return iso.slice(0, 10)
}

// Un événement couvre la date choisie si une occurrence chevauche ce jour.
function occurrenceCoversDay(occ: ParisOccurrence, day: string): boolean {
  if (!occ.start) return false
  const start = isoDay(occ.start)
  const end = occ.end ? isoDay(occ.end) : start
  return start <= day && day <= end
}

export async function fetchParisEventSuggestions(
  center: Coordinates,
  radiusKm: number,
  city: string,
  date: string, // YYYY-MM-DD
): Promise<ActivitySuggestion[]> {
  const url = `${PARIS_RECORDS_URL}?limit=${PARIS_RESULT_LIMIT}`
  const data = (await fetchJson(url)) as { records?: ParisRecord[] }

  const out: ActivitySuggestion[] = []
  for (const rec of data.records ?? []) {
    const name = rec.title?.trim()
    if (!name) continue
    const coordinates = parisRecordCoords(rec)
    if (!coordinates) continue
    if (haversineKm(center, coordinates) > radiusKm) continue
    const occ = (rec.occurrences ?? []).find((o) => occurrenceCoversDay(o, date))
    if (!occ?.start) continue
    const notes = [rec.address_name, rec.address_city, rec.price_type].filter(Boolean).join(' · ')
    out.push({
      name,
      city,
      category: 'point_of_interest',
      coordinates,
      mapsUrl: googleMapsUrl(coordinates),
      notes: notes || undefined,
      date,
      time: occ.start.length >= 16 ? occ.start.slice(11, 16) : undefined,
      source: 'Que faire à Paris',
    })
  }
  return out
}
