import { useState } from 'react'

const RANK_ICONS: Record<string, string> = {
  NEWBIE: '🌱', HIKER: '🥾', EXPLORER: '🧭', TREKKER: '🏔️',
  PATHFINDER: '🗺️', MOUNTAINEER: '⛰️', ADVENTURER: '🌋',
  ELITE_TREKKER: '🦅', TREK_MASTER: '👑', TREK_LEGEND: '🌟',
}

export function RankIcon({ code, iconUrl }: { code: string; iconUrl?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return iconUrl && failedUrl !== iconUrl
    ? <img src={iconUrl} alt="" className="w-7 h-7 object-contain" onError={() => setFailedUrl(iconUrl)} />
    : <span>{RANK_ICONS[code] ?? '🏅'}</span>
}
