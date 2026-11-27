import { useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { parseDriveFileId } from '../utils/driveLink'
import type { DatabaseStatus } from '../hooks/useDatabase'
import type { MapMode } from '../data/offlineMapRepository'
import type { OfflineMapStatus } from '../hooks/useOfflineMap'
import type { ThemePref } from '../theme/theme'
import type { ResolvedTheme } from '../theme/categories'
import Sheet from './ui/Sheet'
import Button from './ui/Button'
import Field from './ui/Field'
import Icon from './ui/Icon'

interface SettingsModalProps {
  themePref: ThemePref
  resolvedTheme: ResolvedTheme
  onSetThemePref: (pref: ThemePref) => Promise<void>
  databaseStatus: DatabaseStatus
  databaseError?: string
  // Distinct de databaseError (échec de lecture/connexion, cf. useDatabase) :
  // une écriture ratée n'y touche plus — voir persist() dans useDatabase.ts.
  databaseSaveError?: string
  // Bascule brièvement à true après qu'un changement distant (poll) ou un rebase
  // d'écriture a mis à jour l'état local — voir useDatabase.ts.
  databaseRecentlySynced?: boolean
  onRetrySave: () => Promise<void>
  databaseFileName?: string
  databaseLocalMode?: boolean
  onConnectDatabaseFile: () => Promise<void>
  onConnectDatabaseFileId: (fileId: string) => Promise<void>
  onExportDatabase: () => void
  onImportDatabaseFile: (file: File) => void
  mapStatus: OfflineMapStatus
  mapError?: string
  mapFileName?: string
  mode: MapMode
  onConnectMap: () => Promise<void>
  onSetMode: (mode: MapMode) => Promise<void>
  onClose: () => void
}

export default function SettingsModal({
  themePref,
  resolvedTheme,
  onSetThemePref,
  databaseStatus,
  databaseError,
  databaseSaveError,
  databaseRecentlySynced,
  onRetrySave,
  databaseFileName,
  databaseLocalMode,
  onConnectDatabaseFile,
  onConnectDatabaseFileId,
  onExportDatabase,
  onImportDatabaseFile,
  mapStatus,
  mapError,
  mapFileName,
  mode,
  onConnectMap,
  onSetMode,
  onClose,
}: SettingsModalProps) {
  const databaseConnected = databaseStatus === 'ready'
  const mapConnected = mapStatus === 'ready'
  const [retrying, setRetrying] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const [driveInput, setDriveInput] = useState('')
  const [driveConnecting, setDriveConnecting] = useState(false)
  const [driveError, setDriveError] = useState<string>()

  async function handleConnectById() {
    const id = parseDriveFileId(driveInput)
    if (!id) {
      setDriveError('Lien ou ID Drive invalide — colle un lien drive.google.com ou l’ID du fichier.')
      return
    }
    setDriveError(undefined)
    setDriveConnecting(true)
    try {
      await onConnectDatabaseFileId(id)
      setDriveInput('')
    } catch (e) {
      setDriveError(e instanceof Error ? e.message : String(e))
    } finally {
      setDriveConnecting(false)
    }
  }

  async function handleRetrySave() {
    setRetrying(true)
    try {
      await onRetrySave()
    } catch {
      // L'échec reste porté par databaseSaveError, déjà affiché ci-dessous.
    } finally {
      setRetrying(false)
    }
  }

  return (
    <Sheet
      title="Paramètres"
      onClose={onClose}
      tall
      footer={
        <Button variant="secondary" block onClick={onClose}>
          Fermer
        </Button>
      }
    >
      <section className="settings-section">
        <h2>Apparence</h2>

        <div className="segmented">
          <button
            type="button"
            className={themePref === 'auto' ? 'segmented__button segmented__button--active' : 'segmented__button'}
            onClick={() => onSetThemePref('auto')}
          >
            Auto
          </button>
          <button
            type="button"
            className={themePref === 'light' ? 'segmented__button segmented__button--active' : 'segmented__button'}
            onClick={() => onSetThemePref('light')}
          >
            Clair
          </button>
          <button
            type="button"
            className={themePref === 'dark' ? 'segmented__button segmented__button--active' : 'segmented__button'}
            onClick={() => onSetThemePref('dark')}
          >
            Sombre
          </button>
        </div>

        {themePref === 'auto' && (
          <p className="settings-status">Suit le thème {resolvedTheme === 'dark' ? 'sombre' : 'clair'} du téléphone.</p>
        )}
      </section>

      <section className="settings-section">
        <h2>Base de voyages</h2>

        <p className="settings-status">
          {databaseConnected && databaseLocalMode && 'Mode local : base stockée dans ce navigateur (hors connexion)'}
          {databaseConnected && !databaseLocalMode && `Fichier connecté : ${databaseFileName}`}
          {databaseConnected && databaseRecentlySynced && ' — mis à jour'}
          {databaseStatus === 'no-file' && !databaseError && 'Aucun fichier de voyages connecté.'}
          {databaseError}
          {databaseStatus === 'loading' && 'Chargement…'}
        </p>

        <Field label="Lien ou ID du fichier Drive">
          <input
            type="text"
            value={driveInput}
            onChange={(e) => setDriveInput(e.target.value)}
            placeholder="https://drive.google.com/file/d/…  ou  ID du fichier"
          />
        </Field>
        {driveError && (
          <p className="sheet__error" role="alert">
            <Icon name="alert" size={16} />
            {driveError}
          </p>
        )}
        <Button variant="primary" block onClick={handleConnectById} loading={driveConnecting} loadingLabel="Connexion…">
          Connecter ce fichier
        </Button>
        <Button variant="secondary" block onClick={onConnectDatabaseFile}>
          {databaseLocalMode
            ? '…ou choisir dans Google Drive'
            : databaseConnected
              ? 'Changer de fichier (Picker)'
              : '…ou choisir dans Google Drive'}
        </Button>
        <p className="settings-hint">
          Le lien/ID suffit : un seul réglage Google requis (l'ID client OAuth). Le Picker « choisir dans Drive »
          demande en plus la clé API Picker et le n° de projet.
        </p>
        {databaseLocalMode && (
          <p className="settings-hint">
            Sans fichier Drive, tes données restent dans ce navigateur et l'app fonctionne hors connexion.
          </p>
        )}

        <div className="settings-actions">
          <Button variant="secondary" icon="external" onClick={onExportDatabase}>
            Exporter (.json)
          </Button>
          <Button variant="secondary" icon="plus" onClick={() => importInputRef.current?.click()}>
            Importer (.json)
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) void onImportDatabaseFile(f)
            }}
          />
        </div>
        <p className="settings-hint">
          Export/import de la base active en JSON. En mode local, la base vit dans ce navigateur : vider les
          données du site l'efface — exporte régulièrement pour garder une sauvegarde.
        </p>

        {databaseSaveError && (
          <>
            {/* Affiché ici plutôt que via la prop `error` de Sheet (comme pour
                les autres modales) : le footer de Sheet est en position:sticky
                avec un fond opaque, et recouvrait ce message dès que le
                contenu de cette modale dépassait la hauteur visible — bug
                repéré en testant l'échec de sauvegarde, voir Sheet.tsx. */}
            <p className="sheet__error" role="alert">
              <Icon name="alert" size={16} />
              {databaseSaveError}
            </p>
            <Button variant="primary" block onClick={handleRetrySave} loading={retrying} loadingLabel="Nouvel essai…">
              Réessayer la sauvegarde
            </Button>
          </>
        )}
      </section>

      <section className="settings-section">
        <h2>Carte hors ligne</h2>

        <div className="segmented">
          <button
            type="button"
            className={mode === 'online' ? 'segmented__button segmented__button--active' : 'segmented__button'}
            onClick={() => onSetMode('online')}
          >
            En ligne
          </button>
          <button
            type="button"
            className={mode === 'offline' ? 'segmented__button segmented__button--active' : 'segmented__button'}
            onClick={() => onSetMode('offline')}
            disabled={!mapConnected}
          >
            Hors ligne
          </button>
        </div>

        <p className="settings-status">
          {mapConnected && `Carte connectée : ${mapFileName}`}
          {mapStatus === 'no-file' && !mapError && 'Aucune carte connectée.'}
          {mapError}
          {mapStatus === 'loading' && 'Chargement…'}
        </p>

        <Button variant="secondary" block onClick={onConnectMap}>
          {mapConnected ? 'Changer le fichier' : Capacitor.isNativePlatform() ? 'Connecter la carte' : 'Choisir un fichier .pmtiles…'}
        </Button>

        {Capacitor.isNativePlatform() ? (
          <p className="settings-hint">
            Pour que le mode hors ligne fonctionne vraiment sans réseau (avion, zone blanche), marque ce fichier{' '}
            <strong>Disponible hors connexion</strong> dans l'app Google Drive elle-même.
          </p>
        ) : (
          <p className="settings-hint">
            Sur navigateur, le fichier .pmtiles est copié dans ce navigateur (IndexedDB) : la carte hors ligne
            fonctionne sans aucun réseau.
          </p>
        )}
      </section>

      <p className="settings-hint settings-version">TripPlan v{__APP_VERSION__}</p>
    </Sheet>
  )
}
