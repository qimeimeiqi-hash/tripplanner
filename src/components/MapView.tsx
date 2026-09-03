import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useMemo } from 'react'
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
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

export default function MapView({ route, highlights }: MapViewProps) {
  const points: GeoPoint[] = useMemo(() => {
    const merged = [...route, ...highlights].filter(
      (p) => typeof p.lat === 'number' && typeof p.lng === 'number',
    )
    return merged
  }, [route, highlights])

  if (points.length === 0) {
    return null
  }

  const center: [number, number] = [points[0].lat, points[0].lng]
  const polylinePositions: [number, number][] = route
    .filter((p) => typeof p.lat === 'number' && typeof p.lng === 'number')
    .map((p) => [p.lat, p.lng])

  return (
    <div className="map-wrapper">
      <MapContainer center={center} zoom={5} style={{ height: '420px', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {polylinePositions.length > 1 && (
          <Polyline positions={polylinePositions} pathOptions={{ color: '#e0574c', weight: 3 }} />
        )}
        {highlights.map((p, i) => (
          <Marker key={`h-${i}-${p.name}`} position={[p.lat, p.lng]} icon={defaultIcon}>
            <Popup>{p.name}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
