import type {
  LLMProvider,
  Conversation,
  ConversationDetail,
  AgentTask,
  AgentTaskDetail,
  PlaceCandidateResult,
  MapArtifact,
  MapBuildProgress,
} from '@/types'

// ----------------------------------------------------------
// LLM Providers
// ----------------------------------------------------------
export const mockLLMProviders: LLMProvider[] = [
  {
    id: 'auto',
    name: 'auto',
    label: 'Auto',
    description: 'Tự động chọn provider tốt nhất',
    status: 'available',
  },
  {
    id: 'uit-llm',
    name: 'uit-llm',
    label: 'UIT LLM',
    description: 'Trong mạng trường',
    status: 'available',
  },
  {
    id: 'groq',
    name: 'groq',
    label: 'Groq',
    description: 'Cloud',
    status: 'available',
  },
  {
    id: 'openai',
    name: 'openai',
    label: 'OpenAI',
    description: 'Chưa cấu hình',
    status: 'disabled',
  },
]

// ----------------------------------------------------------
// Conversations
// ----------------------------------------------------------
export const mockConversations: Conversation[] = [
  {
    id: 'conv-001',
    title: 'Phân tích hoạt động tháng 9',
    createdAt: '2026-10-03T10:24:00Z',
    updatedAt: '2026-10-03T10:24:00Z',
    messageCount: 4,
    lastMessage: 'Tôi đã phân tích dữ liệu hệ thống trong 30 ngày qua...',
  },
  {
    id: 'conv-002',
    title: 'Gợi ý hệ thống badge mới',
    createdAt: '2026-10-02T15:30:00Z',
    updatedAt: '2026-10-02T15:30:00Z',
    messageCount: 6,
    lastMessage: 'Dựa trên hành vi người dùng, có thể thêm badge...',
  },
  {
    id: 'conv-003',
    title: 'So sánh lượt check-in các tỉnh',
    createdAt: '2026-09-30T09:15:00Z',
    updatedAt: '2026-09-30T09:15:00Z',
    messageCount: 3,
    lastMessage: 'Lâm Đồng dẫn đầu với 2,341 check-in trong tháng...',
  },
  {
    id: 'conv-004',
    title: 'Hướng dẫn tạo bản đồ offline',
    createdAt: '2026-09-26T08:00:00Z',
    updatedAt: '2026-09-26T08:00:00Z',
    messageCount: 8,
    lastMessage: 'Để tạo bản đồ offline, bạn cần xác định BBOX...',
  },
  {
    id: 'conv-005',
    title: 'Giải thích hệ thống rank',
    createdAt: '2026-09-19T14:22:00Z',
    updatedAt: '2026-09-19T14:22:00Z',
    messageCount: 5,
    lastMessage: 'Hệ thống rank được tính dựa trên điểm kinh nghiệm...',
  },
  {
    id: 'conv-006',
    title: 'Ý tưởng tính năng mới',
    createdAt: '2026-09-03T11:00:00Z',
    updatedAt: '2026-09-03T11:00:00Z',
    messageCount: 12,
    lastMessage: 'Một số tính năng tiềm năng: social challenges...',
  },
]

export const mockConversationDetail: ConversationDetail = {
  ...mockConversations[0],
  messages: [
    {
      id: 'msg-001',
      role: 'user',
      contents: [
        {
          type: 'text',
          text: 'Phân tích hoạt động người dùng trong 30 ngày qua và gợi ý một số cải tiến.',
        },
      ],
      timestamp: '2026-10-03T10:24:00Z',
    },
    {
      id: 'msg-002',
      role: 'assistant',
      contents: [
        {
          type: 'text',
          text: 'Tôi đã phân tích dữ liệu hệ thống trong 30 ngày qua (01/09/2026 – 30/09/2026). Dưới đây là tổng quan hoạt động:',
        },
        {
          type: 'stats',
          stats: [
            { label: 'Người dùng', value: '12,548', change: '+6.5%', changeType: 'positive' },
            { label: 'Người dùng mới', value: '2,341', change: '+12%', changeType: 'positive' },
            { label: 'Người dùng hoạt động', value: '8,921', change: '+8%', changeType: 'positive' },
            { label: 'Cung đường được tạo', value: '428', change: '+16%', changeType: 'positive' },
          ],
        },
        {
          type: 'chart',
          chartData: [
            { date: '09/01', users: 280, checkins: 820 },
            { date: '09/05', users: 310, checkins: 950 },
            { date: '09/10', users: 340, checkins: 1020 },
            { date: '09/15', users: 390, checkins: 1150 },
            { date: '09/20', users: 420, checkins: 1280 },
            { date: '09/25', users: 460, checkins: 1380 },
            { date: '09/30', users: 510, checkins: 1520 },
          ],
          chartKeys: ['users', 'checkins'],
          topList: [
            { rank: 1, name: 'Lâm Đồng', count: 2341 },
            { rank: 2, name: 'Tây Ninh', count: 1883 },
            { rank: 3, name: 'Bình Thuận', count: 1135 },
            { rank: 4, name: 'Đà Nẵng', count: 986 },
            { rank: 5, name: 'Sơn La', count: 842 },
          ],
        },
        {
          type: 'recommendations',
          recommendations: [
            'Thêm badge cho người dùng chính phục ≥ 5 đỉnh núi cao để tăng động lực trekking đường dài',
            'Tăng tần suất gửi thông báo đến những người dùng không hoạt động trong 7 ngày trước',
            'Cải thiện luồng tạo cung đường để giảm tỷ lệ bỏ dở (hiện tại ~34%)',
            'Thêm bộ lọc theo tỉnh thành để người dùng tìm địa điểm gần hơn',
          ],
        },
      ],
      metadata: {
        model: 'UIT-LLM-v2',
        provider: 'UIT LLM',
        latencyMs: 842,
      },
      timestamp: '2026-10-03T10:24:43Z',
    },
    {
      id: 'msg-003',
      role: 'user',
      contents: [
        {
          type: 'text',
          text: 'So sánh lượt check-in các tỉnh thành trong tháng 9 nhé.',
        },
      ],
      timestamp: '2026-10-03T10:26:00Z',
    },
    {
      id: 'msg-004',
      role: 'assistant',
      contents: [
        {
          type: 'text',
          text: 'Dưới đây là bảng so sánh lượt check-in theo tỉnh thành trong tháng 9/2026:',
        },
        {
          type: 'table',
          tableHeaders: ['#', 'Tỉnh/Thành phố', 'Check-in', 'Địa điểm', 'Tăng trưởng'],
          tableRows: [
            [1, 'Lâm Đồng', 2341, 48, '+14%'],
            [2, 'Tây Ninh', 1883, 12, '+22%'],
            [3, 'Bình Thuận', 1135, 19, '+8%'],
            [4, 'Đà Nẵng', 986, 31, '+5%'],
            [5, 'Sơn La', 842, 24, '+18%'],
            [6, 'Hà Giang', 781, 38, '+31%'],
            [7, 'Lào Cai', 654, 22, '+9%'],
          ],
        },
      ],
      metadata: {
        model: 'UIT-LLM-v2',
        provider: 'UIT LLM',
        latencyMs: 521,
      },
      timestamp: '2026-10-03T10:26:30Z',
    },
  ],
}

// ----------------------------------------------------------
// Agent Tasks (PLACE_BUILDER tasks commented out)
// ----------------------------------------------------------
export const mockAgentTasks: AgentTask[] = [
  // {
  //   id: 'task-001',
  //   jobId: 'PL-00025',
  //   type: 'PLACE_BUILDER',
  //   name: 'Núi Bà Đen - Tây Ninh',
  //   description: 'Tạo địa điểm Núi Bà Đen tại Tây Ninh',
  //   createdBy: 'admin01',
  //   status: 'PUBLISHED',
  //   createdAt: '2026-10-03T16:08:00Z',
  //   updatedAt: '2026-10-03T16:14:12Z',
  //   completedAt: '2026-10-03T16:14:12Z',
  //   executionTimeMs: 372000,
  //   resultRef: 'candidate-001',
  // },
  {
    id: 'task-002',
    jobId: 'MP-00015',
    type: 'MAP_BUILDER',
    name: 'Núi Bà Đen (BBOX: 106.13–106.19)',
    description: 'Tạo bản đồ offline cho Núi Bà Đen',
    createdBy: 'admin01',
    status: 'PENDING_REVIEW',
    createdAt: '2026-10-03T15:23:00Z',
    updatedAt: '2026-10-03T15:25:34Z',
    executionTimeMs: 154000,
    resultRef: 'map-artifact-001',
  },
  // {
  //   id: 'task-003',
  //   jobId: 'PL-00022',
  //   type: 'PLACE_BUILDER',
  //   name: 'Thác Nhị Meo - Thanh Hóa',
  //   description: 'Tạo địa điểm Thác Nhị Meo tại Thanh Hóa',
  //   createdBy: 'lananh',
  //   status: 'PROCESSING',
  //   createdAt: '2026-10-03T14:32:00Z',
  //   updatedAt: '2026-10-03T14:32:55Z',
  // },
  {
    id: 'task-004',
    jobId: 'MP-00014',
    type: 'MAP_BUILDER',
    name: 'Tà Xùa',
    description: 'Tạo bản đồ offline cho Tà Xùa',
    createdBy: 'nguyenhuy',
    status: 'FAILED',
    createdAt: '2026-10-03T14:08:00Z',
    updatedAt: '2026-10-03T14:10:22Z',
    errorMessage: 'Build MBTiles thất bại: dữ liệu OSM không đầy đủ cho vùng BBOX đã chọn',
  },
  // {
  //   id: 'task-005',
  //   jobId: 'PL-00021',
  //   type: 'PLACE_BUILDER',
  //   name: 'Đèo Ô Quy Hồ - Lào Cai',
  //   description: 'Tạo địa điểm Đèo Ô Quy Hồ',
  //   createdBy: 'admin01',
  //   status: 'APPROVED',
  //   createdAt: '2026-10-03T13:18:00Z',
  //   updatedAt: '2026-10-03T13:22:45Z',
  //   completedAt: '2026-10-03T13:22:45Z',
  //   executionTimeMs: 285000,
  //   resultRef: 'candidate-005',
  // },
  {
    id: 'task-006',
    jobId: 'MP-00013',
    type: 'MAP_BUILDER',
    name: 'Fansipan - Lào Cai',
    description: 'Tạo bản đồ offline cho Fansipan',
    createdBy: 'admin01',
    status: 'PUBLISHED',
    createdAt: '2026-10-03T11:05:00Z',
    updatedAt: '2026-10-03T11:11:33Z',
    completedAt: '2026-10-03T11:11:33Z',
    executionTimeMs: 396000,
    resultRef: 'map-artifact-002',
  },
  {
    id: 'task-007',
    jobId: 'AS-00045',
    type: 'ASSISTANT',
    name: 'Phân tích hoạt động tháng 9',
    createdBy: 'admin01',
    status: 'SUCCESS',
    createdAt: '2026-10-03T10:24:00Z',
    updatedAt: '2026-10-03T10:24:43Z',
    completedAt: '2026-10-03T10:24:43Z',
    executionTimeMs: 43000,
  },
  {
    id: 'task-008',
    jobId: 'AS-00044',
    type: 'ASSISTANT',
    name: 'Gợi ý hệ thống badge mới',
    createdBy: 'admin01',
    status: 'SUCCESS',
    createdAt: '2026-10-02T15:30:00Z',
    updatedAt: '2026-10-02T15:30:45Z',
    completedAt: '2026-10-02T15:30:45Z',
    executionTimeMs: 45000,
  },
  // {
  //   id: 'task-009',
  //   jobId: 'PL-00020',
  //   type: 'PLACE_BUILDER',
  //   name: 'Thác Drây Hup - Đắk Lắk',
  //   description: 'Tạo địa điểm Thác Drây Hup',
  //   createdBy: 'trungtu',
  //   status: 'PENDING_REVIEW',
  //   createdAt: '2026-10-02T14:15:00Z',
  //   updatedAt: '2026-10-02T14:21:08Z',
  //   executionTimeMs: 368000,
  //   resultRef: 'candidate-009',
  // },
  {
    id: 'task-010',
    jobId: 'MP-00012',
    type: 'MAP_BUILDER',
    name: 'Thác Drây Hup (BBOX...)',
    description: 'Tạo bản đồ offline cho Thác Drây Hup',
    createdBy: 'trungtu',
    status: 'CANCELLED',
    createdAt: '2026-10-02T13:00:00Z',
    updatedAt: '2026-10-02T13:05:00Z',
  },
  // {
  //   id: 'task-011',
  //   jobId: 'PL-00019',
  //   type: 'PLACE_BUILDER',
  //   name: 'Động Phong Nha - Quảng Bình',
  //   description: 'Tạo địa điểm Động Phong Nha',
  //   createdBy: 'lananh',
  //   status: 'REJECTED',
  //   createdAt: '2026-10-01T11:30:00Z',
  //   updatedAt: '2026-10-01T11:45:00Z',
  //   errorMessage: 'Dữ liệu không đủ độ tin cậy, cần kiểm tra lại nguồn',
  // },
  {
    id: 'task-012',
    jobId: 'AS-00043',
    type: 'ASSISTANT',
    name: 'So sánh lượt check-in các tỉnh',
    createdBy: 'admin01',
    status: 'SUCCESS',
    createdAt: '2026-09-30T09:15:00Z',
    updatedAt: '2026-09-30T09:15:32Z',
    completedAt: '2026-09-30T09:15:32Z',
    executionTimeMs: 32000,
  },
  {
    id: 'task-013',
    jobId: 'MP-00011',
    type: 'MAP_BUILDER',
    name: 'Mũi Né - Bình Thuận',
    createdBy: 'nguyenhuy',
    status: 'PUBLISHED',
    createdAt: '2026-09-30T08:41:11Z',
    updatedAt: '2026-09-30T08:50:00Z',
    completedAt: '2026-09-30T08:50:00Z',
    executionTimeMs: 534000,
    resultRef: 'map-artifact-003',
  },
  // {
  //   id: 'task-014',
  //   jobId: 'PL-00018',
  //   type: 'PLACE_BUILDER',
  //   name: 'Hồ Tà Đùng - Đắk Nông',
  //   createdBy: 'admin01',
  //   status: 'PUBLISHED',
  //   createdAt: '2026-09-29T16:00:00Z',
  //   updatedAt: '2026-09-29T16:08:00Z',
  //   completedAt: '2026-09-29T16:08:00Z',
  //   executionTimeMs: 480000,
  //   resultRef: 'candidate-014',
  // },
  {
    id: 'task-015',
    jobId: 'AS-00042',
    type: 'ASSISTANT',
    name: 'Hướng dẫn tạo bản đồ offline',
    createdBy: 'admin01',
    status: 'SUCCESS',
    createdAt: '2026-09-26T08:00:00Z',
    updatedAt: '2026-09-26T08:01:00Z',
    completedAt: '2026-09-26T08:01:00Z',
    executionTimeMs: 60000,
  },
]

// ----------------------------------------------------------
// Task Detail (updated to use MAP_BUILDER task)
// ----------------------------------------------------------
export const mockAgentTaskDetail: AgentTaskDetail = {
  ...mockAgentTasks[0], // Now task-002 (MAP_BUILDER) since task-001 is commented
  steps: [
    { label: 'Khởi tạo tác vụ', status: 'done', timestamp: '2026-10-03T15:23:10Z' },
    { label: 'Validate BBOX', status: 'done', timestamp: '2026-10-03T15:23:15Z' },
    { label: 'Chuẩn bị thư mục', status: 'done', timestamp: '2026-10-03T15:23:20Z' },
    { label: 'Cắt OSM', status: 'done', timestamp: '2026-10-03T15:23:45Z' },
    { label: 'Build MBTiles', status: 'done', timestamp: '2026-10-03T15:24:30Z' },
    { label: 'Package ZIP', status: 'done', timestamp: '2026-10-03T15:25:20Z' },
    { label: 'Hoàn thành', status: 'done', timestamp: '2026-10-03T15:25:34Z' },
  ],
  logs: [
    { timestamp: '2026-10-03T15:23:10Z', level: 'info', message: 'Khởi tạo tác vụ MP-00015' },
    { timestamp: '2026-10-03T15:23:15Z', level: 'info', message: 'BBOX validated: 106.139-106.191, 11.361-11.412' },
    { timestamp: '2026-10-03T15:23:45Z', level: 'info', message: 'OSM data extracted' },
    { timestamp: '2026-10-03T15:24:30Z', level: 'info', message: 'MBTiles built: 18.4MB' },
    { timestamp: '2026-10-03T15:25:20Z', level: 'info', message: 'Package created: nui-ba-den-v1-flutter.zip' },
    { timestamp: '2026-10-03T15:25:34Z', level: 'info', message: 'Tác vụ hoàn thành thành công' },
  ],
  metadata: {
    bbox: '106.139-106.191, 11.361-11.412',
    zoom: '10-14',
    fileSize: '18.4MB',
  },
}

// ----------------------------------------------------------
// Place Candidate — DISABLED (commented out)
// ----------------------------------------------------------
export const mockPlaceCandidate: PlaceCandidateResult = {
  id: 'candidate-001',
  taskId: 'task-001',
  data: {
    name: 'Núi Bà Đen',
    province: 'Tây Ninh',
    coordinates: { lat: 11.38690, lng: 106.16600 },
    elevation: 986,
    placeType: 'MOUNTAIN',
    activities: ['Trekking', 'Hiking', 'Ngắm cảnh'],
    difficulty: 'Trung bình',
    estimatedTime: '4–6 giờ',
    shortDescription:
      'Núi Bà Đen là ngọn núi cao nhất vùng Đông Nam Bộ với độ cao 986m. Nơi đây nổi tiếng với hệ thống cáp treo hiện đại, chùa Bà và các tuyến trekking thú vị dành cho người ưa khám phá thiên nhiên.',
    images: [
      { url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Ba_Den_mountain.jpg/640px-Ba_Den_mountain.jpg', caption: 'Núi Bà Đen nhìn từ xa' },
      { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400', caption: 'Cảnh trekking' },
    ],
  },
  sources: [
    { name: 'OpenStreetMap', type: 'OSM', externalId: 'node:357123456', url: 'https://www.openstreetmap.org/node/357123456', fetchedAt: '2026-10-03T16:08:45Z' },
    { name: 'Wikidata', type: 'WIKIDATA', externalId: 'Q712345', url: 'https://www.wikidata.org/wiki/Q712345', fetchedAt: '2026-10-03T16:09:12Z' },
    { name: 'dulich.tayninh.gov.vn', type: 'WEBSITE', url: 'https://dulich.tayninh.gov.vn/nui-ba-den', fetchedAt: '2026-10-03T16:11:03Z' },
  ],
  fieldConfidences: [
    { field: 'name', label: 'Tên', confidence: 100 },
    { field: 'coordinates', label: 'Tọa độ', confidence: 100 },
    { field: 'elevation', label: 'Độ cao', confidence: 90 },
    { field: 'shortDescription', label: 'Mô tả', confidence: 75 },
    { field: 'difficulty', label: 'Độ khó', confidence: 50, warning: 'Độ khó được AI đề xuất, cần Admin kiểm tra lại.' },
  ],
  overallConfidence: 92,
  duplicates: [
    { id: 'place-baden-existing', name: 'Núi Bà Đen', province: 'Tây Ninh', similarity: 94 },
  ],
  status: 'PENDING_REVIEW',
  createdAt: '2026-10-03T16:14:12Z',
}

// ----------------------------------------------------------
// Map Artifact
// ----------------------------------------------------------
export const mockMapArtifact: MapArtifact = {
  id: 'map-artifact-001',
  taskId: 'task-002',
  fileName: 'nui-ba-den-v1-flutter.zip',
  sizeBytes: 19292160, // ~18.4 MB
  checksum: 'sha256:a3f2c1d8e7b4a9c6f1d2e3b4c5a6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4',
  version: 1,
  bbox: { minLng: 106.139430, minLat: 11.361570, maxLng: 106.191620, maxLat: 11.412390 },
  zoomMin: 10,
  zoomMax: 14,
  layers: ['ROADS', 'POI', 'TERRAIN', 'CONTOUR', 'HILLSHADE'],
  scope: 'PLACE',
  placeId: 'place-baden',
  placeName: 'Núi Bà Đen',
  createdAt: '2026-10-03T15:25:34Z',
}

// ----------------------------------------------------------
// Map Build Progress (PROCESSING state)
// ----------------------------------------------------------
export const mockMapBuildProgress: MapBuildProgress = {
  jobId: 'MP-00015',
  placeName: 'Núi Bà Đen',
  status: 'PROCESSING',
  progressPercent: 55,
  elapsedMs: 154000,
  bbox: { minLng: 106.139430, minLat: 11.361570, maxLng: 106.191620, maxLat: 11.412390 },
  zoomMin: 10,
  zoomMax: 14,
  steps: [
    { label: 'Validate BBOX', status: 'done', timestamp: '2026-10-03T15:23:10Z' },
    { label: 'Chuẩn bị thư mục', status: 'done', timestamp: '2026-10-03T15:23:15Z' },
    { label: 'Cắt OSM', status: 'done', timestamp: '2026-10-03T15:23:45Z' },
    { label: 'Build MBTiles', status: 'active' },
    { label: 'Build terrain', status: 'pending' },
    { label: 'Build contour', status: 'pending' },
    { label: 'Build hillshade', status: 'pending' },
    { label: 'Build style', status: 'pending' },
    { label: 'Package ZIP', status: 'pending' },
    { label: 'Validate ZIP', status: 'pending' },
  ],
}
