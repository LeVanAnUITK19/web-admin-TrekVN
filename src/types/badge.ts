export type BadgeStatus = 'ACTIVE' | 'INACTIVE' | 'DISABLED'

/** DB v3.1: badges.category */
export type BadgeCategory = 'TREKKING' | 'EXPLORATION' | 'DISTANCE' | 'PROVINCE'

/** DB v3.1: badges.rarity – affects XP on earn (COMMON 50 / RARE 150 / EPIC 400 / LEGENDARY 1000) */
export type BadgeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'

export type BadgeConditionType =
  | 'CHECKIN_COUNT'
  | 'JOURNEY_COUNT'
  | 'PROVINCE_COUNT'
  | 'CONTRIBUTION_APPROVED'
  | 'SPECIFIC_PLACE'
  | 'ELEVATION_TOTAL'
  | 'DISTANCE_TOTAL'
  | 'JOURNEY_COMPLETED_COUNT'
  | 'SUMMIT_CHECKIN_COUNT'
  | 'PROVINCE_VISITED_COUNT'
  | 'ALTITUDE_REACHED'
  | 'PLACE_VISITED_COUNT'
  | 'FIRST_JOURNEY'

export interface BadgeCondition {
  type: BadgeConditionType
  value?: number
  placeId?: string
  unit?: 'KILOMETERS' | 'METERS'
}

export interface Badge {
  id: string
  code?: string // Thêm field code (optional vì có thể backend chưa trả về)
  name: string
  description: string
  iconUrl: string
  category?: BadgeCategory
  rarity?: BadgeRarity
  condition: BadgeCondition
  status: BadgeStatus
  totalAwarded?: number
  createdAt: string
  updatedAt: string
}

export interface BadgeFormData {
  code: string
  name: string
  description: string
  iconUrl?: string
  category?: BadgeCategory
  rarity?: BadgeRarity
  condition: {
    type: BadgeConditionType
    value: number
    placeId?: string
    unit?: 'KILOMETERS' | 'METERS'
  }
  status?: BadgeStatus
}
