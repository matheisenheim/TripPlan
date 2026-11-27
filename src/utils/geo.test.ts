import { describe, expect, it } from 'vitest'
import { haversineKm } from './geo'

describe('haversineKm', () => {
  it('1° de longitude à l’équateur ≈ 111,2 km', () => {
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(111.19, 1)
  })

  it('même point = 0 km', () => {
    expect(haversineKm({ lat: 55.9486, lng: -3.1999 }, { lat: 55.9486, lng: -3.1999 })).toBe(0)
  })

  it('Édimbourg centre → Arthur’s Seat ≈ 2 km', () => {
    const km = haversineKm({ lat: 55.9486, lng: -3.1999 }, { lat: 55.9444, lng: -3.1608 })
    expect(km).toBeGreaterThan(1.5)
    expect(km).toBeLessThan(3)
  })
})
