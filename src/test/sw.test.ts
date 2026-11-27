import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Régression "page blanche après déploiement" : un index.html périmé en cache
// navigateur doit être revalidé sur le réseau à chaque navigation.
describe('service worker (anti page blanche)', () => {
  const sw = readFileSync('public/sw.js', 'utf-8')

  it('intercepte les navigations en network-first avec repli cache', () => {
    expect(sw).toContain("request.mode === 'navigate'")
    expect(sw).toMatch(/fetch\(request\)/)
    expect(sw).toContain('caches.match')
  })

  it('sert les assets hashés (/assets/) en cache-first', () => {
    expect(sw).toContain('/assets/')
  })

  it('est enregistré uniquement en production, au bon scope', () => {
    const main = readFileSync('src/main.tsx', 'utf-8')
    expect(main).toContain('import.meta.env.PROD')
    expect(main).toContain('serviceWorker.register')
    expect(main).toContain('import.meta.env.BASE_URL')
  })

  it('diagnostics de démarrage : boot-hint dans le HTML, retiré au montage, ressources listées', () => {
    const html = readFileSync('index.html', 'utf-8')
    expect(html).toContain('id="boot-hint"')
    expect(html).toContain('Ressource introuvable')
    expect(html).toContain('unhandledrejection')
    const main = readFileSync('src/main.tsx', 'utf-8')
    expect(main).toContain("getElementById('boot-hint')?.remove()")
  })
})
