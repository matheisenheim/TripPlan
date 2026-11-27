import { createRoot } from 'react-dom/client'
import './index.css'
import './components/ui/ui.css'
import App from './App.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
)

// L'app a démarré : retire l'indicateur de chargement présent dans le HTML statique.
document.getElementById('boot-hint')?.remove()

// Service worker (production uniquement) : les navigations passent d'abord par
// le réseau pour ne jamais servir un index.html périmé en cache (page blanche
// après un déploiement GitHub Pages), avec repli sur le cache hors ligne.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL }).catch(() => {})
  })
}
