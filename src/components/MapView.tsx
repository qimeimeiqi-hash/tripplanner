import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useMemo } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import type { GeoPoint } from '../types/itinerary'

const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

interface MapViewProps {
  route: GeoPoint[]
  highlights: GeoPoint[]
}

function FitToBounds({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 })
  }, [map, bounds])
  return null
}

export default function MapView({ route, highlights }: MapViewProps) {
  const validHighlights = useMemo(
    () => highlights.filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number'),
    [highlights],
  )

  // Focus the map on the destination's highlights rather than fitting the whole trip
  // (which can span continents when origin/destination are far apart) — a route that
  // includes an intercontinental leg would otherwise force the map to zoom out so far
  // that the destination itself becomes an unreadable speck.
  const bounds = useMemo(
    () =>
      validHighlights.length > 0
        ? L.latLngBounds(validHighlights.map((p): [number, number] => [p.lat, p.lng]))
        : null,
    [validHighlights],
  )

  const polylinePositions = useMemo(() => {
    if (!bounds) return []
    const localArea = bounds.pad(0.5)
    return route
      .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
      .filter((p) => localArea.contains([p.lat, p.lng]))
      .map((p): [number, number] => [p.lat, p.lng])
  }, [route, bounds])

  if (!bounds) {
    return null
  }

  const center: [number, number] = [bounds.getCenter().lat, bounds.getCenter().lng]

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={12} style={{ height: '420px', width: '100%' }}>
        <FitToBounds bounds={bounds} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polylinePositions.length > 1 && (
          <Polyline positions={polylinePositions} pathOptions={{ color: '#e0574c', weight: 3 }} />
        )}
        {validHighlights.map((p, i) => (
          <Marker key={`h-${i}-${p.name}`} position={[p.lat, p.lng]} icon={defaultIcon}>
            <Popup>{p.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
