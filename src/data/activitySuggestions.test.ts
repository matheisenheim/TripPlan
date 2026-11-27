import { describe, expect, it } from 'vitest'
import { ACTIVITY_SUGGESTIONS } from './activitySuggestions'
import { ALL_CATEGORIES } from '../theme/categories'

describe('catalogue de propositions (activitySuggestions)', () => {
  it('a au moins une entrée', () => {
    expect(ACTIVITY_SUGGESTIONS.length).toBeGreaterThan(0)
  })

  it('chaque entrée est valide (nom, ville, catégorie connue)', () => {
    for (const s of ACTIVITY_SUGGESTIONS) {
      expect(s.name.trim().length).toBeGreaterThan(0)
      expect(s.city.trim().length).toBeGreaterThan(0)
      expect(ALL_CATEGORIES).toContain(s.category)
    }
  })
})
