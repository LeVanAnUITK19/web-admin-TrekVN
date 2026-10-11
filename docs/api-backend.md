# Tham chiếu API đang sử dụng

Cập nhật **12/10/2026**. Base URL: `${VITE_API_BASE_URL}/api/${VITE_API_VERSION}`. Các path dưới đây không bao gồm `/api/v1`.

Tài liệu này thay thế bản mapping thiết kế cũ. Phương thức/path được đối chiếu với helper frontend và routes backend local; không phải cam kết một server đang deploy đầy đủ mọi endpoint.

## Auth, users, dashboard, ranks

| Method | Path | Mục đích |
| --- | --- | --- |
| POST | `/auth/login` | `{ email, password }` → accessToken + user |
| POST | `/auth/logout` | Kết thúc phiên |
| GET | `/auth/me` | User hiện tại |
| POST | `/auth/refresh` | Cookie HttpOnly → accessToken mới |
| GET | `/admin/dashboard` | Thống kê |
| GET/POST | `/admin/users` | Danh sách / tạo |
| GET/PATCH | `/admin/users/:id` | Chi tiết / cập nhật |
| POST | `/admin/users/:id/block` | Khóa, reason tùy chọn |
| POST | `/admin/users/:id/unblock` | Mở khóa |
| GET | `/admin/users/:id/rank-profile` | Rank/XP |
| GET | `/admin/users/:id/xp-transactions` | Lịch sử XP |
| POST | `/admin/users/:id/xp-adjustments` | Điều chỉnh XP |
| GET | `/admin/users/:id/rank-history` | Lịch sử rank |
| GET | `/admin/ranks` | Rank definitions |
| PATCH | `/admin/ranks/:id` | Chỉnh cấu hình rank |
| GET | `/admin/audit-logs` | Nhật ký |

## Trekking

| Method | Path | Mục đích |
| --- | --- | --- |
| GET/POST | `/admin/trekking/places` | Danh sách / tạo địa điểm |
| GET/PUT/DELETE | `/admin/trekking/places/:id` | Chi tiết / cập nhật / xóa |
| PATCH | `/admin/trekking/places/:id/status` | Cập nhật trạng thái |
| POST | `/admin/trekking/places/:id/images` | FormData `images`, tối đa 10 ảnh |
| POST | `/admin/trekking/places/:id/map-image` | FormData `image` |
| GET | `/admin/trekking/places/:id/reviews` | Danh sách đánh giá địa điểm |
| DELETE | `/admin/trekking/places/:id/reviews/:reviewId` | Xóa đánh giá |
| GET/POST | `/admin/trekking/routes` | Danh sách / tạo cung đường |
| GET/PUT/DELETE | `/admin/trekking/routes/:id` | Chi tiết / cập nhật / xóa |
| PATCH | `/admin/trekking/routes/:id/status` | Cập nhật trạng thái |
| POST | `/admin/trekking/routes/:id/image` | FormData `image` |
| GET/POST | `/admin/trekking/routes/:routeId/milestones` | Cột mốc theo route / tạo |
| PUT/DELETE | `/admin/trekking/routes/:routeId/milestones/:milestoneId` | Endpoint nested giữ trong constants |
| GET | `/admin/trekking/milestones` | Danh sách cột mốc, lọc theo routeId |
| GET/PUT/DELETE | `/admin/trekking/milestones/:id` | Chi tiết / cập nhật / xóa |
| GET | `/admin/trekking/journeys` | Hành trình, chỉ đọc |
| GET | `/admin/trekking/journeys/:id` | Chi tiết hành trình |

Route list được normalize: `trekkingRouteId → id`, `trekkingPlaceId → placeId`, `distanceMeters / 1000 → distance`, `estimatedDurationMinutes → estimatedDuration`. GeoJSON luôn dùng `[longitude, latitude]`.

## Contributions và badges

| Method | Path | Payload/ghi chú |
| --- | --- | --- |
| GET | `/admin/contributions` | Danh sách phân trang |
| GET | `/admin/contributions/:id` | Chi tiết |
| PATCH | `/admin/contributions/:id/review` | `decision`: APPROVED/REJECTED/NEEDS_REVISION, xem ReviewContributionPayload |
| GET | `/admin/contributions/:id/markers` | Marker của submission |
| POST | `/admin/contributions/:id/markers/:markerId/review` | `action`: APPROVE/REJECT |
| GET/POST | `/admin/badges` | Danh sách / tạo |
| GET/PATCH | `/admin/badges/:id` | Chi tiết / cập nhật thông tin |
| PATCH | `/admin/badges/:id/status` | `{ status }`; DISABLED của UI → INACTIVE |

Status-only badge chỉ gọi `/status`, không gửi request update rỗng. Contribution review có thể trả 409 khi admin khác đã xử lý.

## Offline maps

| Method | Path | Mục đích |
| --- | --- | --- |
| GET/POST | `/admin/trekking/offline-maps` | Danh sách / tạo gói vùng |
| GET/PUT/DELETE | `/admin/trekking/offline-maps/:id` | Chi tiết / cập nhật / xóa |
| POST | `/admin/trekking/offline-maps/:id/publish` | Xuất bản gói |
| GET | `/admin/trekking/places-offline-maps` | Địa điểm có bản đồ offline |
| PUT | `/admin/trekking/places/:id/offline-map` | Chỉnh embedded offlineMap |
| GET | `/admin/trekking/places/:id/offline-map/file` | ZIP qua Bearer auth, response bytes |

Gói mới bắt đầu ở DRAFT. Không xóa gói đang PUBLISHED; cần chuyển trạng thái phù hợp trước. Tạo gói dùng `objectKey`, `checksum`, `fileSizeBytes`, `version`, `name`, và các field tùy chọn trong OfflineMapFormData.

## AI Assistant và tác vụ

| Method | Path | Mục đích |
| --- | --- | --- |
| GET | `/llm/providers` | Danh sách provider |
| GET/POST | `/agent/conversations` | Danh sách / tạo hội thoại |
| GET/PATCH/DELETE | `/agent/conversations/:id` | Chi tiết / đổi tên / xóa |
| POST | `/agent/conversations/:id/messages` | `{ content, provider }` |
| POST | `/agent/conversations/:id/approve` | `{ approvalId }` |
| POST | `/agent/conversations/:id/reject` | `{ approvalId, reason? }` |
| GET | `/agent/tasks` | Phân trang, search, type, status, from, to |
| GET | `/agent/tasks/:id` | Chi tiết tác vụ, steps/logs |

## AI Map Builder

| Method | Path | Mục đích |
| --- | --- | --- |
| POST | `/agent/map-jobs` | Tạo job |
| GET | `/agent/map-jobs/:id` | Poll bằng jobId |
| POST | `/agent/map-jobs/:id/approve` | `{}`; backend xuất bản bất đồng bộ |
| POST | `/agent/map-jobs/:id/reject` | `{ note }` |
| GET | `/agent/map-artifacts/:id` | Metadata artifact |
| GET | `/agent/map-artifacts/:id/download` | Helper signed URL tương thích |
| GET | `/agent/map-artifacts/:id/file` | Download/preview ZIP bytes có auth |

Payload tạo job đang dùng:

```json
{
  "trekkingPlaceId": "place-id",
  "placeName": "Tên địa điểm",
  "publishTarget": { "type": "PLACE", "targetId": "place-id" },
  "bbox": { "minLon": 106.13, "minLat": 11.36, "maxLon": 106.19, "maxLat": 11.41 },
  "minZoom": 10,
  "maxZoom": 14
}
```

Dùng `jobId` (MAP-...) từ response, không dùng `mapJobId` nội bộ, để poll và mở artifact. Approve không đồng nghĩa đã PUBLISHED; tiếp tục poll cho đến trạng thái cuối.

## API tương thích cũ và chưa hoàn chỉnh

Helper Place Builder vẫn giữ `/agent/place-jobs`, `/agent/place-jobs/:id`, `/agent/candidates/:id` và `/agent/candidates/:id/review`; UI không mount trang Place Builder riêng. Không dùng các helper này làm bằng chứng tính năng UI đã hoàn thiện.

Community real mode gọi GET `/admin/posts`, PATCH `/admin/posts/:id/hide`, DELETE `/admin/posts/:id`, GET `/admin/comments`, PATCH `/admin/comments/:id/hide`, GET `/admin/reviews`, PATCH `/admin/reviews/:id/hide`. Backend workspace chưa mount đầy đủ các API này. Không nhầm với reviews của địa điểm trong nhóm Trekking.

Xem [integration guide](api-integration.md) để biết auth, envelope và các giới hạn. Nguồn dùng khi cập nhật: `endpoints.ts`, `client.ts`, `agentApi.ts`, và hook `src/features/**/use*.ts`.
