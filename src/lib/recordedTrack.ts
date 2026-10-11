import type { GeoLineString } from '@/types'

/** Standard precision-5 GPS polyline from completed mobile journeys. */
export function recordedTrack(encoded?: string): GeoLineString | null {
  if (!encoded) return null
  let index = 0, latitude = 0, longitude = 0
  const coordinates: [number, number][] = []
  const read = () => {
    let value = 0, shift = 0
    while (true) {
      if (index >= encoded.length || shift > 30) throw new Error('Invalid track')
      const byte = encoded.charCodeAt(index++) - 63
      if (byte < 0 || byte > 63) throw new Error('Invalid track')
      value |= (byte & 31) << shift
      if (byte < 32) break
      shift += 5
    }
    return value & 1 ? ~(value >> 1) : value >> 1
  }
  try {
    while (index < encoded.length) {
      latitude += read()
      longitude += read()
      if (Math.abs(latitude) > 9000000 || Math.abs(longitude) > 18000000) return null
      coordinates.push([longitude / 1e5, latitude / 1e5])
    }
    return coordinates.length >= 2 ? { type: 'LineString', coordinates } : null
  } catch {
    return null
  }
}
