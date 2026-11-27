import { render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MapView from './MapView'
import type { Trip } from '../types/trip'

// MapLibre remplacé par un mock fonctionnel (jsdom n'a pas WebGL) ; on espionne jumpTo.
const jumpToMock = vi.fn()
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: () => {},
  addProtocol: () => {},
  removeProtocol: () => {},
  LngLatBounds: class {
    extend() {
      return this
    }
  },
  Map: class {
    handlers: Record<string, ((e?: unknown) => void)[]> = {}
    on(event: string, handler: (e?: unknown) => void) {
      ;(this.handlers[event] ??= []).push(handler)
      // Le vrai MapLibre d\u00e9clenche 'load' une fois la carte pr\u00eate : c'est
      // dans ce handler que MapView fait ses jumpTo/fitBounds de focus.
      if (event === 'load') setTimeout(() => handler(), 0)
    }
    remove() {}
    addControl() {}
    jumpTo(...args: unknown[]) {
      jumpToMock(...args)
    }
    fitBounds() {}
    getCenter() {
      return { lng: 0, lat: 0 }
    }
    getZoom() {
      return 5
    }
    addSource() {}
    addLayer() {}
    getSource() {
      return undefined
    }
    getLayer() {
      return undefined
    }
    setPaintProperty() {}
    setLayerZoomRange() {}
  },
  Marker: class {
    setLngLat() {
      return this
    }
    setPopup() {
      return this
    }
    addTo() {
      return this
    }
    remove() {}
    getElement() {
      return document.createElement('div')
    }
    togglePopup() {}
  },
  Popup: class {
    setLngLat() {
      return this
    }
    setHTML() {
      return this
    }
    addTo() {
      return this
    }
    remove() {}
  },
  NavigationControl: class {},
}))

beforeEach(() => {
  localStorage.clear()
  jumpToMock.mockClear()
})

const trip: Trip = {
  id: 't1',
  name: 'Édimbourg',
  stages: [
    {
      id: 's1',
      city: 'Édimbourg',
      order: 1,
      coordinates: { lat: 55.9486, lng: -3.1999 },
      accommodations: [],
      excursions: [],
    },
  ],
  // Activité proposée sans coordonnées, rattachée à l'étape s1.
  activities: [
    { id: 'a1', name: 'Royal Mile', stageGroup: 'Édimbourg', stageId: 's1', categories: ['point_of_interest'], mapsUrl: '' },
  ],
}

describe('MapView — focus sur une activité', () => {
  it('activité sans coordonnées : la carte se centre sur l’étape associée', async () => {
    render(
      <MapView
        trip={trip}
        selectedStageId={null}
        selectedActivityId="a1"
        offline={false}
        theme="light"
        onGoToStage={() => {}}
        onGoToActivity={() => {}}
      />,
    )
    await waitFor(() => expect(jumpToMock).toHaveBeenCalled(), { timeout: 5000 })
    expect(jumpToMock).toHaveBeenCalledWith(expect.objectContaining({ center: [-3.1999, 55.9486] }))
  })
})
