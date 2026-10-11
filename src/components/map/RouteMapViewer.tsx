import { PlaceOfflineMap } from './PlaceOfflineMap'
import type { GeoPoint, GeoLineString } from '@/types'

interface RouteMapViewerProps {
  placeId: string
  placeLocation?: GeoPoint | null
  placeName?: string
  path?: GeoLineString | null
  startLocation?: GeoPoint | null
  endLocation?: GeoPoint | null
  height?: string
}

export default function RouteMapViewer({ placeId, placeLocation, placeName, path }: RouteMapViewerProps) {
  return <PlaceOfflineMap placeId={placeId} placeName={placeName} location={placeLocation} path={path} />
}
