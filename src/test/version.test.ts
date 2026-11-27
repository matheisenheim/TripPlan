import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// La version affichée doit changer automatiquement à chaque commit, sans bump
// manuel de package.json.
describe('version auto', () => {
  it('scripts/version.mjs retourne un semver x.y.z basé sur le nombre de commits', () => {
    const v = execSync('node scripts/version.mjs').toString().trim()
    expect(v).toMatch(/^\d+\.\d+\.\d+$/)
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { version: string }
    const [maj, min] = pkg.version.split('.')
    expect(v.startsWith(`${maj}.${min}.`)).toBe(true)
  })

  it('vite.config.ts injecte la version auto dans __APP_VERSION__', () => {
    const cfg = readFileSync('vite.config.ts', 'utf-8')
    expect(cfg).toContain('scripts/version.mjs')
    expect(cfg).toContain('__APP_VERSION__')
  })

  it('les workflows CI récupèrent tout l’historique (fetch-depth: 0)', () => {
    for (const wf of ['.github/workflows/ci.yml', '.github/workflows/deploy-pages.yml']) {
      expect(readFileSync(wf, 'utf-8')).toContain('fetch-depth: 0')
    }
  })
})
