import { describe, expect, it } from 'vitest'
import { parseDriveFileId } from './driveLink'

const ID = '1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT'

describe('parseDriveFileId', () => {
  it('accepte un ID brut', () => {
    expect(parseDriveFileId(ID)).toBe(ID)
    expect(parseDriveFileId(`  ${ID}  `)).toBe(ID)
  })

  it('extrait l’ID d’un lien file/d/<id>/view', () => {
    expect(parseDriveFileId(`https://drive.google.com/file/d/${ID}/view?usp=sharing`)).toBe(ID)
  })

  it('extrait l’ID de open?id= et uc?id=', () => {
    expect(parseDriveFileId(`https://drive.google.com/open?id=${ID}`)).toBe(ID)
    expect(parseDriveFileId(`https://drive.google.com/uc?id=${ID}&export=download`)).toBe(ID)
  })

  it('rejette les entrées invalides (texte, dossier, vide)', () => {
    expect(parseDriveFileId('')).toBeNull()
    expect(parseDriveFileId('hello world')).toBeNull()
    expect(parseDriveFileId('https://drive.google.com/drive/folders/1aB2cD3eF4gH5iJ6kL7mN8oP9qR0sT')).toBeNull()
    expect(parseDriveFileId('https://example.com')).toBeNull()
  })
})
