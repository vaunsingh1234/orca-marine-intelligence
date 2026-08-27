import type { Feature, Polygon } from 'geojson'
import type { Layer, LayerGroup, Map as LeafletMap, PathOptions } from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Coordinates } from '../marine/place'
import {
  bearingDegrees,
  compassAbbrev,
  haversineKm,
  polygonCentroid,
  ringToLeaflet,
  roundKm,
} from './geo'
import { buildMapScene } from './scene'
import { MUMBAI_PROTOTYPE_FALLBACK, type Geofence, type GeofenceKind, type PfzZone } from './types'
import 'leaflet/dist/leaflet.css'
import './DecisionMap.css'

type MapFocus = 'route' | 'zone' | null

type DecisionMapProps = {
  coordinates: Coordinates | null
  focus: MapFocus
  onLocate?: () => void
}

type LayerKey = 'heat' | 'pfz' | 'restricted' | 'route'

const LAYER_LABELS: { key: LayerKey; label: string }[] = [
  { key: 'heat', label: 'Fishing potential' },
  { key: 'pfz', label: 'PFZ' },
  { key: 'restricted', label: 'Restricted areas' },
  { key: 'route', label: 'Recommended route' },
]

export default function DecisionMap({ coordinates, focus, onLocate }: DecisionMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  const layersRef = useRef<MapLayers | null>(null)
  const LRef = useRef<LeafletRuntime | null>(null)
  const [ready, setReady] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)
  const [visible, setVisible] = useState<Record<LayerKey, boolean>>({
    heat: true,
    pfz: true,
    restricted: true,
    route: true,
  })

  const scene = useMemo(() => buildMapScene(coordinates), [coordinates])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    let map: LeafletMap | undefined
    let resize: ResizeObserver | undefined

    void (async () => {
      const L = await loadLeaflet()
      if (cancelled || !hostRef.current) return
      LRef.current = L

      map = L.map(host, {
        zoomControl: false,
        attributionControl: true,
        minZoom: 10,
        maxZoom: 16,
        fadeAnimation: true,
      })
      map.attributionControl.setPrefix('')
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map)

      const heat = L.heatLayer([], {
          radius: 30,
          blur: 22,
          maxZoom: 12,
          max: 1,
          minOpacity: 0.18,
          gradient: {
            0.2: '#0b3d66',
            0.4: '#3ecdf5',
            0.65: '#9be37a',
            0.85: '#ffce7a',
            1: '#ff7a45',
          },
        },
      )

      const pfz = L.layerGroup()
      const restricted = L.layerGroup()
      const recommended = L.layerGroup()
      const route = L.layerGroup()
      const you = L.layerGroup()

      heat.addTo(map)
      pfz.addTo(map)
      recommended.addTo(map)
      restricted.addTo(map)
      route.addTo(map)
      you.addTo(map)

      mapRef.current = map
      layersRef.current = { heat: heat as HeatLayerInstance, pfz, recommended, restricted, route, you }
      setReady(true)

      resize = new ResizeObserver(() => {
        map?.invalidateSize()
      })
      resize.observe(host)
      window.setTimeout(() => map?.invalidateSize(), 480)
    })()

    return () => {
      cancelled = true
      resize?.disconnect()
      map?.remove()
      mapRef.current = null
      layersRef.current = null
      LRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    const L = LRef.current
    if (!ready || !map || !layers || !L) return

    layers.pfz.clearLayers()
    layers.recommended.clearLayers()
    layers.restricted.clearLayers()
    layers.route.clearLayers()
    layers.you.clearLayers()
    layers.heat.setLatLngs(scene.heatPoints.map((point) => [point.lat, point.lng, point.intensity]))

    for (const zone of scene.pfzZones) {
      polygonFromZone(L, zone, pfzStyle(zone.potential), scene.user).addTo(layers.pfz)
    }
    polygonFromZone(L, scene.recommendedZone, recommendedStyle, scene.user).addTo(layers.recommended)

    for (const fence of scene.geofences) {
      polygonFromFence(L, fence).addTo(layers.restricted)
    }

    L.polyline(scene.route.coordinates, {
      color: '#8fe8ff',
      weight: 3,
      dashArray: '8 8',
      opacity: 0.92,
      className: 'odm-route-line',
    })
      .bindPopup(
        popupHtml('Recommended route', [
          { label: 'Path', value: scene.route.startsFromUser ? 'From your location to the recommended area' : 'Prototype marine route to the recommended area' },
          { label: 'Note', value: 'Not a live navigation track' },
        ]),
        popupOptions(),
      )
      .addTo(layers.route)

    if (scene.user) {
      L.marker([scene.user.lat, scene.user.lng], { icon: youIcon(L), zIndexOffset: 600 })
        .bindPopup(popupHtml('Your location', [{ label: 'Status', value: 'Current position' }]), popupOptions())
        .addTo(layers.you)
    }

    map.setView([scene.center.lat, scene.center.lng], 12)
  }, [ready, scene])

  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    if (!ready || !map || !layers) return
    toggle(map, layers.heat, visible.heat)
    toggle(map, layers.pfz, visible.pfz || focus === 'zone')
    toggle(map, layers.recommended, visible.pfz || focus === 'zone')
    toggle(map, layers.restricted, visible.restricted)
    toggle(map, layers.route, visible.route || focus === 'route')
  }, [ready, visible, focus])

  useEffect(() => {
    const map = mapRef.current
    const L = LRef.current
    if (!ready || !map || !L || !focus) return

    if (focus === 'route') {
      map.fitBounds(L.latLngBounds(scene.route.coordinates), { padding: [36, 36], maxZoom: 11 })
      return
    }

    map.fitBounds(L.latLngBounds(ringToLeaflet(scene.recommendedZone.ring)), {
      padding: [40, 40],
      maxZoom: 11,
    })
  }, [focus, ready, scene])

  function locateMe() {
    const map = mapRef.current
    if (scene.user && map) {
      map.flyTo([scene.user.lat, scene.user.lng], 11, { duration: 0.7 })
      return
    }
    onLocate?.()
  }

  function zoomBy(delta: number) {
    mapRef.current?.setZoom((mapRef.current.getZoom() ?? 9) + delta)
  }

  return (
    <div className="odm">
      <div ref={hostRef} className="odm-map" role="presentation" />

      <p className="odm-badge">
        SAMPLE FISHING-POTENTIAL DATA
        {scene.usingLocationFallback ? ' · Prototype origin (Mumbai)' : ''}
      </p>

      <div className="odm-layers">
        <button type="button" className="odm-tool" onClick={() => setLayersOpen((open) => !open)}>
          Layers
        </button>
        {layersOpen ? (
          <div className="odm-layer-card">
            {LAYER_LABELS.map((item) => (
              <label key={item.key}>
                <input
                  type="checkbox"
                  checked={visible[item.key]}
                  onChange={() =>
                    setVisible((current) => ({ ...current, [item.key]: !current[item.key] }))
                  }
                />
                {item.label}
              </label>
            ))}
          </div>
        ) : null}
      </div>

      <div className="odm-zoom">
        <button type="button" className="odm-tool" onClick={() => zoomBy(1)} aria-label="Zoom in">
          +
        </button>
        <button type="button" className="odm-tool" onClick={() => zoomBy(-1)} aria-label="Zoom out">
          −
        </button>
        <button type="button" className="odm-tool odm-locate" onClick={locateMe}>
          Locate me
        </button>
      </div>

      <div className="odm-legend">
        <p>Fishing potential</p>
        <div className="odm-scale" aria-hidden="true">
          <span>Low</span>
          <i />
          <span>High</span>
        </div>
        <ul>
          <li>
            <i className="odm-you" />
            Your location
          </li>
          <li>
            <i className="odm-rec" />
            Recommended zone
          </li>
          <li>
            <i className="odm-caution" />
            Caution
          </li>
          <li>
            <i className="odm-stop" />
            Restricted
          </li>
          <li>
            <i className="odm-path" />
            Route
          </li>
        </ul>
      </div>
    </div>
  )
}

type LeafletRuntime = typeof import('leaflet')

type HeatLayerInstance = Layer & {
  setLatLngs: (points: Array<[number, number, number]>) => Layer
}

type MapLayers = {
  heat: HeatLayerInstance
  pfz: LayerGroup
  recommended: LayerGroup
  restricted: LayerGroup
  route: LayerGroup
  you: LayerGroup
}

async function loadLeaflet(): Promise<LeafletRuntime> {
  const module = await import('leaflet')
  const L = unwrapLeaflet(module)
  ;(globalThis as unknown as { L: LeafletRuntime }).L = L
  await import('leaflet.heat')
  const runtime = unwrapLeaflet(module)
  if (typeof runtime.heatLayer !== 'function') {
    throw new Error('Leaflet heatmap plugin failed to load')
  }
  return runtime
}

function unwrapLeaflet(module: object) {
  const inner = (module as { default?: { map?: unknown } }).default
  if (inner && typeof inner.map === 'function') return inner as typeof import('leaflet')
  if ('map' in module && typeof (module as { map: unknown }).map === 'function') {
    return module as typeof import('leaflet')
  }
  throw new Error('Leaflet failed to load')
}

function toggle(map: LeafletMap, layer: Layer, on: boolean) {
  if (on) {
    if (!map.hasLayer(layer)) layer.addTo(map)
    return
  }
  if (map.hasLayer(layer)) map.removeLayer(layer)
}

function polygonFromZone(
  L: LeafletRuntime,
  zone: PfzZone,
  style: PathOptions,
  user: { lat: number; lng: number } | null,
) {
  const center = polygonCentroid(zone.ring)
  const from = user ?? MUMBAI_PROTOTYPE_FALLBACK
  const distanceKm = roundKm(haversineKm(from, center))
  const direction = compassAbbrev(bearingDegrees(from, center))
  const rows = [
    { label: 'Potential', value: zone.potential },
    { label: 'Distance', value: user ? `${distanceKm} km` : `${distanceKm} km (prototype origin)` },
    { label: 'Direction', value: direction },
    { label: 'Status', value: zone.status },
  ]
  if (zone.validity) rows.push({ label: 'Window', value: zone.validity })
  rows.push({ label: 'Note', value: 'Higher fishing potential — not an exact fish location' })
  return L.polygon(ringToLeaflet(zone.ring), style).bindPopup(popupHtml(zone.name, rows), popupOptions())
}

function polygonFromFence(L: LeafletRuntime, fence: Geofence) {
  const feature: Feature<Polygon> = {
    type: 'Feature',
    properties: { kind: fence.kind, name: fence.name },
    geometry: { type: 'Polygon', coordinates: [fence.ring] },
  }
  return L.geoJSON(feature, {
    style: fenceStyle(fence.kind),
    onEachFeature(_feature, layer: Layer) {
      layer.bindPopup(
        popupHtml(fence.name, [{ label: 'Advice', value: fence.message }]),
        popupOptions(),
      )
    },
  })
}

function fenceStyle(kind: GeofenceKind): PathOptions {
  if (kind === 'restricted') {
    return { color: '#ff9494', weight: 2, fillColor: '#ff8a8a', fillOpacity: 0.16, className: 'odm-fence' }
  }
  if (kind === 'caution') {
    return { color: '#ffce7a', weight: 2, fillColor: '#ffce7a', fillOpacity: 0.12, className: 'odm-fence' }
  }
  return { color: '#b794f6', weight: 2, fillColor: '#9b7cf0', fillOpacity: 0.12, className: 'odm-fence' }
}

const pfzStyle = (potential: PfzZone['potential']): PathOptions => ({
  color: potential === 'High' || potential === 'Moderate-High' ? '#5fe3ab' : '#8fe8ff',
  weight: 1.6,
  fillColor: potential === 'High' ? '#5fe3ab' : '#3ecdf5',
  fillOpacity: potential === 'High' ? 0.12 : 0.1,
})

const recommendedStyle: PathOptions = {
  color: '#5fe3ab',
  weight: 2.6,
  fillColor: '#5fe3ab',
  fillOpacity: 0.18,
}

function youIcon(L: LeafletRuntime) {
  return L.divIcon({
    className: 'odm-you-marker',
    html: '<span></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

function popupOptions() {
  return { className: 'odm-popup', closeButton: true, maxWidth: 260 }
}

function popupHtml(title: string, rows: { label: string; value: string }[]) {
  const body = rows
    .map(
      (row) =>
        `<p><small>${escapeHtml(row.label)}</small><strong>${escapeHtml(row.value)}</strong></p>`,
    )
    .join('')
  return `<div class="odm-popup-inner"><p class="odm-popup-title">${escapeHtml(title)}</p>${body}</div>`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
