export const API_MODE = import.meta.env.VITE_API_MODE ?? 'mock'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'
export const API_VERSION = import.meta.env.VITE_API_VERSION ?? 'v1'
export const IS_MOCK_MODE = API_MODE === 'mock'

export const APP_NAME = import.meta.env.VITE_APP_NAME ?? 'TrekViệt Admin'

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  USERS: '/users',
  USERS_CREATE: '/users/create',
  TREKKING_PLACES: '/trekking/places',
  TREKKING_PLACES_CREATE: '/trekking/places/create',
  TREKKING_PLACES_EDIT: (id: string) => `/trekking/places/${id}/edit`,
  TREKKING_ROUTES: '/trekking/routes',
  TREKKING_ROUTES_CREATE: '/trekking/routes/create',
  TREKKING_ROUTES_EDIT: (id: string) => `/trekking/routes/${id}/edit`,
  TREKKING_MILESTONES: '/trekking/milestones',
  TREKKING_MILESTONES_CREATE: '/trekking/milestones/create',
  TREKKING_MILESTONES_EDIT: (id: string) => `/trekking/milestones/${id}/edit`,
  CONTRIBUTIONS: '/contributions',
  COMMUNITY: '/community',
  BADGES: '/badges',
  BADGES_CREATE: '/badges/create',
  BADGES_EDIT: (id: string) => `/badges/${id}/edit`,
  OFFLINE_MAPS: '/offline-maps',
  OFFLINE_MAPS_CREATE: '/offline-maps/create',
  OFFLINE_MAPS_EDIT: (id: string) => `/offline-maps/${id}/edit`,
  JOURNEYS: '/journeys',
  AUDIT_LOGS: '/audit-logs',

  // ── Gamification ──────────────────────────────────────────
  RANKS: '/ranks',

  // ── AI Agent ──────────────────────────────────────────────
  AGENT: '/agent',
  AGENT_ASSISTANT: '/agent/assistant',
  AGENT_MAP_BUILDER: '/agent/map-builder',
  AGENT_MAP_BUILDER_JOB: (id: string) => `/agent/map-builder/${id}`,
  AGENT_TASKS: '/agent/tasks',
  AGENT_TASKS_DETAIL: (id: string) => `/agent/tasks/${id}`,
} as const

// Province data với mapping id (slug) và name (display)
export const PROVINCE_OPTIONS = [
  { id: 'an_giang', name: 'An Giang' },
  { id: 'ba_ria_vung_tau', name: 'Bà Rịa - Vũng Tàu' },
  { id: 'bac_giang', name: 'Bắc Giang' },
  { id: 'bac_kan', name: 'Bắc Kạn' },
  { id: 'bac_lieu', name: 'Bạc Liêu' },
  { id: 'bac_ninh', name: 'Bắc Ninh' },
  { id: 'ben_tre', name: 'Bến Tre' },
  { id: 'binh_dinh', name: 'Bình Định' },
  { id: 'binh_duong', name: 'Bình Dương' },
  { id: 'binh_phuoc', name: 'Bình Phước' },
  { id: 'binh_thuan', name: 'Bình Thuận' },
  { id: 'ca_mau', name: 'Cà Mau' },
  { id: 'can_tho', name: 'Cần Thơ' },
  { id: 'cao_bang', name: 'Cao Bằng' },
  { id: 'da_nang', name: 'Đà Nẵng' },
  { id: 'dak_lak', name: 'Đắk Lắk' },
  { id: 'dak_nong', name: 'Đắk Nông' },
  { id: 'dien_bien', name: 'Điện Biên' },
  { id: 'dong_nai', name: 'Đồng Nai' },
  { id: 'dong_thap', name: 'Đồng Tháp' },
  { id: 'gia_lai', name: 'Gia Lai' },
  { id: 'ha_giang', name: 'Hà Giang' },
  { id: 'ha_nam', name: 'Hà Nam' },
  { id: 'ha_noi', name: 'Hà Nội' },
  { id: 'ha_tinh', name: 'Hà Tĩnh' },
  { id: 'hai_duong', name: 'Hải Dương' },
  { id: 'hai_phong', name: 'Hải Phòng' },
  { id: 'hau_giang', name: 'Hậu Giang' },
  { id: 'hoa_binh', name: 'Hòa Bình' },
  { id: 'hung_yen', name: 'Hưng Yên' },
  { id: 'khanh_hoa', name: 'Khánh Hòa' },
  { id: 'kien_giang', name: 'Kiên Giang' },
  { id: 'kon_tum', name: 'Kon Tum' },
  { id: 'lai_chau', name: 'Lai Châu' },
  { id: 'lam_dong', name: 'Lâm Đồng' },
  { id: 'lang_son', name: 'Lạng Sơn' },
  { id: 'lao_cai', name: 'Lào Cai' },
  { id: 'long_an', name: 'Long An' },
  { id: 'nam_dinh', name: 'Nam Định' },
  { id: 'nghe_an', name: 'Nghệ An' },
  { id: 'ninh_binh', name: 'Ninh Bình' },
  { id: 'ninh_thuan', name: 'Ninh Thuận' },
  { id: 'phu_tho', name: 'Phú Thọ' },
  { id: 'phu_yen', name: 'Phú Yên' },
  { id: 'quang_binh', name: 'Quảng Bình' },
  { id: 'quang_nam', name: 'Quảng Nam' },
  { id: 'quang_ngai', name: 'Quảng Ngãi' },
  { id: 'quang_ninh', name: 'Quảng Ninh' },
  { id: 'quang_tri', name: 'Quảng Trị' },
  { id: 'soc_trang', name: 'Sóc Trăng' },
  { id: 'son_la', name: 'Sơn La' },
  { id: 'tay_ninh', name: 'Tây Ninh' },
  { id: 'thai_binh', name: 'Thái Bình' },
  { id: 'thai_nguyen', name: 'Thái Nguyên' },
  { id: 'thanh_hoa', name: 'Thanh Hóa' },
  { id: 'thua_thien_hue', name: 'Thừa Thiên Huế' },
  { id: 'tien_giang', name: 'Tiền Giang' },
  { id: 'ho_chi_minh', name: 'TP. Hồ Chí Minh' },
  { id: 'tra_vinh', name: 'Trà Vinh' },
  { id: 'tuyen_quang', name: 'Tuyên Quang' },
  { id: 'vinh_long', name: 'Vĩnh Long' },
  { id: 'vinh_phuc', name: 'Vĩnh Phúc' },
  { id: 'yen_bai', name: 'Yên Bái' },
] as const

// Deprecated: Dùng PROVINCE_OPTIONS thay thế (giữ lại để tương thích ngược)
export const VIETNAM_PROVINCES = PROVINCE_OPTIONS.map((p) => p.name)

// Helper functions
export const getProvinceNameById = (id: string): string => {
  return PROVINCE_OPTIONS.find((p) => p.id === id)?.name ?? id
}

export const getProvinceIdByName = (name: string): string | undefined => {
  return PROVINCE_OPTIONS.find((p) => p.name === name)?.id
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  EASY: 'Dễ',
  MODERATE: 'Trung bình',
  HARD: 'Khó',
  EXPERT: 'Chuyên gia',
}

export const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Không hoạt động',
  DISABLED: 'Đã vô hiệu',
  BLOCKED: 'Đã khóa',
  PENDING_REVIEW: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  NEEDS_REVISION: 'Cần chỉnh sửa',
  DRAFT: 'Bản nháp',
  CANCELLED: 'Đã hủy',
  HIDDEN: 'Đã ẩn',
  DELETED: 'Đã xóa',
  PUBLISHED: 'Đã xuất bản',
  DEPRECATED: 'Lỗi thời',
}

export const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  ROUTE_SUBMISSION: 'Đề xuất cung đường',
  PLACE_SUGGESTION: 'Gợi ý địa điểm',
}

export const MILESTONE_TYPE_LABELS: Record<string, string> = {
  START: 'Điểm xuất phát',
  END: 'Điểm kết thúc',
  WAYPOINT: 'Điểm trung gian',
  SUMMIT: 'Đỉnh núi',
  CAMP: 'Khu cắm trại',
  REST_POINT: 'Điểm nghỉ ngơi',
  VIEWPOINT: 'Điểm ngắm cảnh',
  WATER_SOURCE: 'Nguồn nước',
}

export const BADGE_CONDITION_LABELS: Record<string, string> = {
  CHECKIN_COUNT: 'Số lần check-in',
  JOURNEY_COUNT: 'Số hành trình',
  PROVINCE_COUNT: 'Số tỉnh thành',
  CONTRIBUTION_APPROVED: 'Đóng góp được duyệt',
  SPECIFIC_PLACE: 'Địa điểm cụ thể',
  ELEVATION_TOTAL: 'Tổng độ cao tích lũy (m)',
  DISTANCE_TOTAL: 'Tổng quãng đường',
  JOURNEY_COMPLETED_COUNT: 'Hành trình hoàn thành',
  FIRST_JOURNEY: 'Hành trình đầu tiên',
  SUMMIT_CHECKIN_COUNT: 'Check-in đỉnh núi',
  PROVINCE_VISITED_COUNT: 'Tỉnh thành đã ghé',
  ALTITUDE_REACHED: 'Độ cao lớn nhất (m)',
  PLACE_VISITED_COUNT: 'Địa điểm đã ghé',
}

export const DEFAULT_PAGE_SIZE = 10
export const PAGE_SIZE_OPTIONS = [10, 20, 50]

export const RANK_CODE_LABELS: Record<string, string> = {
  NEWBIE:        'Tân binh',
  HIKER:         'Người leo núi',
  EXPLORER:      'Nhà thám hiểm',
  TREKKER:       'Trekker',
  PATHFINDER:    'Người tìm đường',
  MOUNTAINEER:   'Nhà leo núi',
  ADVENTURER:    'Người phiêu lưu',
  ELITE_TREKKER: 'Trekker Ưu Tú',
  TREK_MASTER:   'Trek Master',
  TREK_LEGEND:   'Trek Legend',
}

export const BADGE_RARITY_LABELS: Record<string, string> = {
  COMMON:    'Phổ biến',
  RARE:      'Hiếm',
  EPIC:      'Sử thi',
  LEGENDARY: 'Huyền thoại',
}

/** XP cộng khi đạt badge theo rarity (FR-RANK-07) */
export const BADGE_RARITY_XP: Record<string, number> = {
  COMMON:    50,
  RARE:      150,
  EPIC:      400,
  LEGENDARY: 1000,
}

export const BADGE_CATEGORY_LABELS: Record<string, string> = {
  TREKKING:    'Trekking',
  EXPLORATION: 'Khám phá',
  DISTANCE:    'Quãng đường',
  PROVINCE:    'Tỉnh thành',
}

export const XP_SOURCE_LABELS: Record<string, string> = {
  JOURNEY_COMPLETED:  'Hoàn thành hành trình',
  JOURNEY_DISTANCE:   'Quãng đường hành trình',
  JOURNEY_ELEVATION:  'Độ cao hành trình',
  MILESTONE_CHECKIN:  'Check-in cột mốc',
  PROVINCE_VISITED:   'Khám phá tỉnh mới',
  PLACE_VISITED:      'Khám phá địa điểm mới',
  BADGE_EARNED:       'Đạt huy hiệu',
  ROUTE_APPROVED:     'Đóng góp cung đường được duyệt',
  PLACE_APPROVED:     'Đóng góp địa điểm được duyệt',
  ADMIN_ADJUSTMENT:   'Điều chỉnh bởi Admin',
}

export const XP_TRANSACTION_TYPE_LABELS: Record<string, string> = {
  EARN:             'Tích lũy',
  REVERSAL:         'Hoàn tác',
  ADMIN_ADJUSTMENT: 'Điều chỉnh Admin',
}

export const JOURNEY_MARKER_TYPE_LABELS: Record<string, string> = {
  VIEWPOINT:    'Điểm ngắm cảnh',
  REST_POINT:   'Điểm nghỉ ngơi',
  WATER_POINT:  'Nguồn nước',
  DANGER:       'Điểm nguy hiểm',
  INTERSECTION: 'Ngã ba / Ngã tư',
  CAMP:         'Khu cắm trại',
  PHOTO_SPOT:   'Điểm chụp ảnh',
  LANDMARK:     'Điểm mốc',
  SUMMIT:       'Đỉnh núi',
  OTHER:        'Khác',
}
