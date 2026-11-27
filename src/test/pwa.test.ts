import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Critères d'installabilité PWA (Chrome mobile « Installer l'application ») :
// manifest valide + icônes 192/512 + service worker avec handler fetch.
describe('PWA installable', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf-8')) as Record<string, unknown> & {
    icons: Array<{ src: string; sizes: string; purpose?: string }>
  }

  it('le manifest est valide (name, display standalone, start_url, icônes)', () => {
    expect(manifest.name).toBe('TripPlan')
    expect(manifest.short_name).toBe('TripPlan')
    expect(manifest.display).toBe('standalone')
    expect(typeof manifest.start_url).toBe('string')
    const sizes = manifest.icons.map((i) => i.sizes)
    expect(sizes).toContain('192x192')
    expect(sizes).toContain('512x512')
    expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true)
  })

  it('les fichiers d’icônes référencés existent', () => {
    for (const icon of manifest.icons) {
      expect(existsSync(`public/${icon.src}`)).toBe(true)
    }
    expect(existsSync('public/icons/apple-touch-icon.png')).toBe(true)
  })

  it('index.html lie le manifest et les meta mobile', () => {
    const html = readFileSync('index.html', 'utf-8')
    expect(html).toContain('rel="manifest"')
    expect(html).toContain('manifest.webmanifest')
    expect(html).toContain('apple-touch-icon')
    expect(html).toContain('mobile-web-app-capable')
  })

  it('le service worker a un handler fetch et est enregistré en prod', () => {
    const sw = readFileSync('public/sw.js', 'utf-8')
    expect(sw).toContain("addEventListener('fetch'")
    const main = readFileSync('src/main.tsx', 'utf-8')
    expect(main).toContain('serviceWorker.register')
    expect(main).toContain('import.meta.env.PROD')
  })
})
