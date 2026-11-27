// Version de build automatique : <major>.<minor>.<nb de commits> (ex. 1.1.42).
// La base major.minor vient de package.json — on ne bumpe plus manuellement à
// chaque déploiement : chaque commit sur main change le numéro affiché.
// Fallback si git est indisponible : la version de package.json telle quelle.
// Usage : node scripts/version.mjs (utilisé par vite.config.ts via __APP_VERSION__)
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf-8'))
const [major, minor] = String(pkg.version).split('.')

try {
  const count = execSync('git rev-list --count HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] })
    .toString()
    .trim()
  if (/^\d+$/.test(count)) {
    console.log(`${major}.${minor}.${count}`)
    process.exit(0)
  }
} catch {
  // pas de git (ou pas un repo) : fallback ci-dessous
}
console.log(pkg.version)
