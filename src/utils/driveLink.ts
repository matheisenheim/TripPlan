// Extrait l'ID d'un fichier Google Drive depuis un ID brut ou un lien partagé :
//   - ID brut :        1AbC…-_ (20+ caractères)
//   - file/d/<id>/…   https://drive.google.com/file/d/<id>/view?usp=sharing
//   - open?id=<id>    https://drive.google.com/open?id=<id>
//   - uc?id=<id>      https://drive.google.com/uc?id=<id>
// Retourne null si rien ne ressemble à un ID de fichier Drive.
const RAW_ID_RE = /^[a-zA-Z0-9_-]{20,}$/
const LINK_ID_RE = /\/d\/([a-zA-Z0-9_-]{20,})|[?&]id=([a-zA-Z0-9_-]{20,})/

export function parseDriveFileId(input: string): string | null {
  const v = input.trim()
  if (!v) return null
  if (RAW_ID_RE.test(v)) return v
  const m = v.match(LINK_ID_RE)
  if (m) return m[1] ?? m[2]
  return null
}
