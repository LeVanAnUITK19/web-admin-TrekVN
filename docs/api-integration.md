# Tích hợp API Web Admin

Cập nhật **12/10/2026**, đối chiếu với `src/services/api` và routes backend trong workspace.

## Kết nối

```text
Browser → API Gateway :3000 /api/v1
  /auth, /admin/users, /admin/ranks, /admin/dashboard, /admin/audit-logs → auth-service
  /admin/trekking, /admin/contributions, /admin/badges → trekking-service
  /agent, /llm → agent-service
```

`VITE_API_BASE_URL` chỉ chứa origin/base của Gateway; client thêm `/api/${VITE_API_VERSION}`. Template và fallback trong code đều là `VITE_API_MODE=mock`. Đặt `real` trong `.env` và khởi động lại dev server để nối backend. Không có fallback sang mock khi backend lỗi.

## Axios và phiên đăng nhập

Client có timeout 15 giây, `withCredentials: true`, và request interceptor thêm Bearer token. ZIP lớn dùng timeout riêng 120 giây.

`getStoredToken()` đọc sessionStorage rồi localStorage. `storeToken(token, persistent)` xóa token cũ ở cả hai nơi trước khi ghi vào storage đã chọn, tránh dùng nhầm token khi đổi tùy chọn ghi nhớ. `clearToken()` xóa cả hai.

Đăng nhập gọi `POST /auth/login`, kiểm tra role ADMIN và trạng thái BLOCKED, rồi lưu access token. Cookie refresh do backend quản lý (HttpOnly). Khi tải lại app, token đã lưu được xác nhận qua `GET /auth/me`. ProtectedRoute tiếp tục kiểm tra quyền và trạng thái.

Khi một API trả 401:

1. `/auth/login` và `/auth/refresh` không kích hoạt refresh tự động.
2. Các request cùng chờ một promise `POST /auth/refresh` với cookie và timeout 15 giây.
3. Nếu thành công, lưu token mới theo chế độ lưu trước đó và retry từng request tối đa một lần.
4. Nếu thất bại, mọi request đang chờ đều reject, token được xóa và trình duyệt chuyển về `/login`.

Đăng xuất gọi `POST /auth/logout`, rồi xóa token và user mock. Console debug API chỉ ghi URL/method/status trong dev, không ghi response body hay headers.

## Response

Response thông thường được unwrap bằng `res.data.data`:

```ts
{ success: true, data: resource }
{ success: true, data: { data: [], total: 0, page: 1, limit: 10, totalPages: 0 } }
```

Một số API trả danh sách trực tiếp (ví dụ badges), không áp dụng phân trang cho mọi response. Download ZIP trả bytes, không có JSON envelope. Lỗi backend có thể dùng `message` hoặc `error.message`; hook xử lý theo feature.

## Field mapping cần giữ

| Chức năng | Frontend → backend |
| --- | --- |
| Place | `provinceId`; `latitude/longitude` → GeoJSON `location.coordinates=[lng, lat]` |
| Route | `placeId` → `trekkingPlaceId`; km `distance` → `distanceMeters`; thời gian → `estimatedDurationMinutes` |
| Milestone | Tạo bằng endpoint nested của route; sửa/xóa bằng `/admin/trekking/milestones/:id`; `checkinRadius` → `checkinRadiusMeters` |
| Contribution | Review dùng `decision`: `APPROVED`, `REJECTED`, `NEEDS_REVISION` |
| Contribution marker | Review dùng `action`: `APPROVE`, `REJECT` |
| Badge | Cập nhật bằng PATCH; status gửi riêng `/status`; `DISABLED` được map thành `INACTIVE` |
| Assistant message | `{ content: req.text, provider: req.providerId }` |
| Conversation | Normalize `conversationId` → `id` |
| Map job | Gửi camelCase: `trekkingPlaceId`, `placeName`, `publishTarget`, `bbox.minLon/minLat/maxLon/maxLat`, `minZoom`, `maxZoom` |
| Map reject | `{ note }`, không dùng `reason` |
| Assistant approval | `{ approvalId }`; reject thêm `reason` tùy chọn |

Upload ảnh dùng FormData qua backend. Không nhúng credential Cloudinary/R2 trong frontend. Map job dùng `jobId` để poll và tải artifact, không dùng UUID `mapJobId` nội bộ.

## Luồng nghiệp vụ

Contribution review xử lý 409 bằng báo lỗi và tải lại dữ liệu. Journeys chỉ đọc; giao diện không sửa track GPS hoặc check-in. Status route dùng PATCH `/status`, không gửi form update rỗng.

Map Builder poll job khi xử lý. Approve trả trạng thái trung gian; hook tiếp tục poll mỗi 3 giây (tối đa 40 lần) cho đến PUBLISHED, FAILED hoặc REJECTED. Chỉ hiển thị hoàn tất khi backend xác nhận xuất bản.

Bản đồ của địa điểm tải từ `/admin/trekking/places/:id/offline-map/file`. Artifact job tải từ `/agent/map-artifacts/:id/file`. Cả hai dùng client có Bearer token. Preview đọc ZIP/MBTiles locally, hiển thị lỗi khi file không hợp lệ, không dùng tile online thay thế.

## Giới hạn tích hợp

Community real mode gọi API moderation; các route `/admin/posts`, `/admin/comments`, `/admin/reviews` chưa được mount đầy đủ trong backend workspace. Đánh giá trong PlaceDetail dùng `/admin/trekking/places/:id/reviews`, là luồng riêng.

UI không có trang Place Builder riêng; helper cũ được giữ cho dữ liệu/lịch sử tương thích. Assistant dùng HTTP request/response, chưa có streaming SSE. Frontend chưa tự retry theo `Retry-After` khi gặp 429.

Kiểm tra local bằng `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Test dùng mock adapter/response, không thay thế smoke test với backend thật. Xem [tham chiếu endpoint](api-backend.md) và [AI UI](agent-ui.md).
