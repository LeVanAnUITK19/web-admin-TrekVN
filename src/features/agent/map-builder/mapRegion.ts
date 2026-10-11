import type { MapBBox } from '@/components/map/MapPreview'

/** Bounds from the user's ba-den-v1-flutter.zip reference package. */
export const BA_DEN_REFERENCE_BBOX: MapBBox = {
  minLng: 106.13943, minLat: 11.36157, maxLng: 106.19162, maxLat: 11.41239,
}

export function isBaDenName(name: string): boolean {
  const normalized = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
  return /(?:^|\s)ba\s+den(?:\s|$)/.test(normalized)
}

export function isOutsideBaDenReference(name: string, bbox: MapBBox): boolean {
  const centerLng = (BA_DEN_REFERENCE_BBOX.minLng + BA_DEN_REFERENCE_BBOX.maxLng) / 2
  const centerLat = (BA_DEN_REFERENCE_BBOX.minLat + BA_DEN_REFERENCE_BBOX.maxLat) / 2
  return isBaDenName(name) && (centerLng < bbox.minLng || centerLng > bbox.maxLng || centerLat < bbox.minLat || centerLat > bbox.maxLat)
}
