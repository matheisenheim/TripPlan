import { useEffect, useRef, useState } from 'react'
import { isUnresolvableMapsLink, parseLocationInput, searchPlaces, type NominatimResult } from '../utils/nominatimSearch'
import Field from './ui/Field'
import Button from './ui/Button'
import MapPickerModal from './MapPickerModal'

interface CoordinatesFieldProps {
  legend: string
  lat: string
  lng: string
  onChange: (lat: string, lng: string) => void
}

// lat/lng restent dans les props (renseignés par le parent à la soumission) mais
// ne sont plus affichés : on choisit un lieu par recherche, sur la carte, ou en
// collant des coordonnées.
export default function CoordinatesField({ legend, onChange }: CoordinatesFieldProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<NominatimResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string>()
  const [showPasteFallback, setShowPasteFallback] = useState(false)
  const [pastedUrl, setPastedUrl] = useState('')
  const [pasteError, setPasteError] = useState<string>()
  const [pickedName, setPickedName] = useState<string>()
  const pickedNameRef = useRef<string | undefined>(undefined)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    // Le nom du lieu choisi reste affiché dans le champ : ne pas relancer de
    // recherche dessus.
    if (pickedNameRef.current && query.trim() === pickedNameRef.current) {
      setResults([])
      setSearchError(undefined)
      return
    }
    if (query.trim().length < 3) {
      setResults([])
      setSearchError(undefined)
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setSearching(true)
      setSearchError(undefined)
      try {
        const found = await searchPlaces(query.trim(), controller.signal)
        setResults(found)
        if (found.length === 0) setSearchError('Aucun résultat.')
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError')) {
          setSearchError('Recherche indisponible.')
        }
      } finally {
        setSearching(false)
      }
    }, 500)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  function selectResult(result: NominatimResult) {
    onChange(String(result.lat), String(result.lng))
    setPickedName(result.displayName)
    pickedNameRef.current = result.displayName
    // Le lieu choisi reste affiché dans le champ de recherche.
    setQuery(result.displayName)
    setResults([])
  }

  function clearPicked() {
    onChange('', '')
    setPickedName(undefined)
    pickedNameRef.current = undefined
    setQuery('')
  }

  function handlePaste(value: string) {
    setPastedUrl(value)
    const parsed = parseLocationInput(value)
    if (parsed) {
      onChange(String(parsed.lat), String(parsed.lng))
      setPickedName(undefined)
      pickedNameRef.current = undefined
      setPasteError(undefined)
    } else if (!value.trim()) {
      setPasteError(undefined)
    } else if (isUnresolvableMapsLink(value)) {
      setPasteError(
        'Ce lien (partagé depuis l\'appli Maps) ne contient pas de coordonnées. Dans Maps : appui long sur le lieu pour poser un repère, puis appui sur les coordonnées affichées en bas de l\'écran pour les copier, et colle-les ici.',
      )
    } else {
      setPasteError('Coordonnées introuvables — colle un lien Maps déjà ouvert (avec le pin centré) ou des coordonnées copiées (ex. "35.0172, 135.6852").')
    }
  }

  return (
    <div className="coordinates-field">
      <Field label={`${legend} — rechercher un lieu`}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom du lieu…" />
      </Field>
      {searching && <p className="coordinates-field__hint">Recherche…</p>}
      {searchError && !searching && <p className="coordinates-field__hint">{searchError}</p>}
      {results.length > 0 && (
        <ul className="coordinates-field__results">
          {results.map((r, i) => (
            <li key={i}>
              <button type="button" onClick={() => selectResult(r)}>
                {r.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
      {pickedName && (
        <Button variant="link" size="sm" onClick={clearPicked}>
          Effacer le lieu
        </Button>
      )}

      <Button variant="link" size="sm" onClick={() => setPickerOpen(true)}>
        Choisir sur la carte
      </Button>
      {!showPasteFallback ? (
        <Button variant="link" size="sm" onClick={() => setShowPasteFallback(true)}>
          Saisir les coordonnées manuellement (coller un lien Maps ou « lat, lng »)
        </Button>
      ) : (
        <Field label="Coordonnées copiées, ou lien Maps déjà ouvert (avec le pin centré)">
          <input type="text" value={pastedUrl} onChange={(e) => handlePaste(e.target.value)} placeholder="35.0172, 135.6852" />
        </Field>
      )}
      {pasteError && <p className="coordinates-field__hint coordinates-field__hint--error">{pasteError}</p>}

      {pickerOpen && (
        <MapPickerModal
          onPick={(coords, name) => {
            onChange(String(coords.lat), String(coords.lng))
            setPickedName(name ?? `Point sur la carte (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)})`)
            setPickerOpen(false)
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  )
}
