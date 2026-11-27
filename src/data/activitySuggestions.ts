import type { ActivityCategory, Coordinates } from '../types/trip'

// Catalogue d'activités proposées, embarqué dans l'app (onglet Activités →
// « Propositions »). Édite ce fichier pour ajouter tes propres idées :
// chaque entrée devient une activité du voyage en un clic.
export interface ActivitySuggestion {
  name: string
  city: string
  category: ActivityCategory
  notes?: string
  mapsUrl?: string
  coordinates?: Coordinates
  date?: string // ISO — événement à cette date (ajouté comme activité planifiée)
  time?: string // "HH:mm" — heure de début de l'événement
  source?: string // nom de la source en ligne (OpenStreetMap, Wikidata, …), affiché en méta
}

export const ACTIVITY_SUGGESTIONS: ActivitySuggestion[] = [
  // Édimbourg
  { name: 'Château d’Édimbourg', city: 'Édimbourg', category: 'point_of_interest', mapsUrl: 'https://maps.google.com/?q=Edinburgh+Castle', coordinates: { lat: 55.9486, lng: -3.1999 } },
  { name: 'Royal Mile (descente vers Holyrood)', city: 'Édimbourg', category: 'point_of_interest', notes: 'Balade à pied du château au palais de Holyrood.' },
  { name: 'Arthur’s Seat', city: 'Édimbourg', category: 'hike', notes: 'Vue à 360° sur la ville, ~2 h de montée.', coordinates: { lat: 55.9444, lng: -3.1608 } },
  { name: 'Musée national d’Écosse', city: 'Édimbourg', category: 'museum', mapsUrl: 'https://maps.google.com/?q=National+Museum+of+Scotland' },
  { name: 'Whisky tasting (Scottish Malt Whisky Experience)', city: 'Édimbourg', category: 'point_of_interest', mapsUrl: 'https://maps.google.com/?q=Scottish+Malt+Whisky+Experience' },
  { name: 'Calton Hill au coucher du soleil', city: 'Édimbourg', category: 'point_of_interest', coordinates: { lat: 55.9542, lng: -3.1927 } },
  // Kyoto
  { name: 'Fushimi Inari (torii rouges)', city: 'Kyoto', category: 'hike', mapsUrl: 'https://maps.google.com/?q=Fushimi+Inari+Taisha', coordinates: { lat: 34.9671, lng: 135.7727 } },
  { name: 'Kinkaku-ji (pavillon d’or)', city: 'Kyoto', category: 'point_of_interest', mapsUrl: 'https://maps.google.com/?q=Kinkaku-ji', coordinates: { lat: 35.0394, lng: 135.7292 } },
  { name: 'Marché de Nishiki', city: 'Kyoto', category: 'restaurant', mapsUrl: 'https://maps.google.com/?q=Nishiki+Market', coordinates: { lat: 35.0047, lng: 135.7688 } },
  { name: 'Quartier de Gion (geishas le soir)', city: 'Kyoto', category: 'point_of_interest', coordinates: { lat: 35.0037, lng: 135.7788 } },
  { name: 'Temple Kiyomizu-dera', city: 'Kyoto', category: 'point_of_interest', mapsUrl: 'https://maps.google.com/?q=Kiyomizu-dera', coordinates: { lat: 34.9949, lng: 135.785 } },
  // Tokyo
  { name: 'TeamLab Planets ou Borderless', city: 'Tokyo', category: 'museum', mapsUrl: 'https://maps.google.com/?q=teamLab+Planets+Tokyo' },
  { name: 'Senso-ji (Asakusa) + rue Nakamise', city: 'Tokyo', category: 'point_of_interest', mapsUrl: 'https://maps.google.com/?q=Senso-ji+Asakusa', coordinates: { lat: 35.7148, lng: 139.7967 } },
  { name: 'Shibuya Crossing + Sky Deck', city: 'Tokyo', category: 'point_of_interest', coordinates: { lat: 35.6595, lng: 139.7005 } },
  { name: 'Tsukiji Outer Market (petit-déj)', city: 'Tokyo', category: 'restaurant', mapsUrl: 'https://maps.google.com/?q=Tsukiji+Outer+Market', coordinates: { lat: 35.6654, lng: 139.7707 } },
  { name: 'Meiji Jingu + Yoyogi Park', city: 'Tokyo', category: 'hike', coordinates: { lat: 35.6764, lng: 139.6993 } },
  // Paris
  { name: 'Tour Eiffel (esplanade du Trocadéro)', city: 'Paris', category: 'point_of_interest', mapsUrl: 'https://maps.google.com/?q=Tour+Eiffel', coordinates: { lat: 48.8584, lng: 2.2945 } },
  { name: 'Musée du Louvre', city: 'Paris', category: 'museum', mapsUrl: 'https://maps.google.com/?q=Louvre', coordinates: { lat: 48.8606, lng: 2.3376 } },
  { name: 'Montmartre + Sacré-Cœur', city: 'Paris', category: 'point_of_interest', coordinates: { lat: 48.8867, lng: 2.343 } },
  { name: 'Croisière sur la Seine (Bateaux Mouches)', city: 'Paris', category: 'point_of_interest', mapsUrl: 'https://maps.google.com/?q=Bateaux+Mouches' },
]
