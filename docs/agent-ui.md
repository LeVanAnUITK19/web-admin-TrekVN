# AI Agent UI

Cập nhật **12/10/2026** theo router và components hiện tại.

## Các trang đang mount

| Route | Component | Chức năng |
| --- | --- | --- |
| `/agent/assistant` | AssistantPage | Hội thoại, provider, duyệt/từ chối hành động |
| `/agent/map-builder` | MapBuilderPage | Form tạo bản đồ và wizard |
| `/agent/map-builder/:id` | MapBuilderJobPage | Mở lại job, xem kết quả và xuất bản |
| `/agent/tasks` | AgentTasksPage | Lịch sử tác vụ và bộ lọc |
| `/agent/tasks/:id` | AgentTaskDetailPage | Steps, logs và liên kết job |

Các trang nằm trong AdminLayout/ProtectedRoute và được lazy load. Sidebar không có Place Builder. `/agent/place-builder` và trang candidate không còn được router mount; tài liệu UI cũ có các route này đã được thay thế.

## Assistant

`useAssistant.ts` quản lý query hội thoại/provider, optimistic user message và trạng thái thinking. Khi đang thinking, conversation được refetch mỗi 2 giây; khi gửi thành công, refetch conversation và danh sách. Đây là HTTP + polling, chưa phải streaming token SSE.

Request message gửi `{ content, provider }`. Response v2 normalize userMessage/assistantMessage; helper còn tương thích response v1. `ApprovalCard` gọi endpoint approve/reject với approvalId. Kết quả duyệt được phản ánh trong UI và lưu vào localStorage theo conversation; metadata `_timestamp` được loại trước khi merge vào messages. Quyền ghi và trạng thái approval cuối cùng phải được backend kiểm tra.

## Map Builder

Wizard gồm nhập thông tin, xử lý dữ liệu, xem kết quả, duyệt/lưu. Chọn địa điểm, vùng BBOX và zoom; payload tạo job dùng camelCase và `publishTarget: { type: 'PLACE', targetId }`.

Job được theo dõi bằng `jobId`. MapBuildProgress hiển thị tiến độ backend. Trang job cho phép mở lại kết quả sau khi rời wizard. Approve chạy publish bất đồng bộ; `useMapPublish` poll mỗi 3 giây, tối đa 40 lần. PUBLISHED mới hoàn tất; FAILED/REJECTED dừng và báo lỗi.

Download artifact tải ZIP qua Bearer auth, tạo object URL rồi thu hồi sau khi tải. Credential bucket ở backend.

## Preview ZIP thật

`MapPreview.tsx` tải `/agent/map-artifacts/:id/file` cho job hoặc `/admin/trekking/places/:id/offline-map/file` cho địa điểm. `offlinePackage.ts` đọc ZIP/MBTiles bằng JSZip + sql.js, đăng ký protocol riêng của MapLibre và chỉ chấp nhận tile từ protocol đó.

Preview kiểm tra package/checksum và hiển thị tile, BBOX, zoom, layer controls. Lỗi ZIP hiển thị retry; không tải tile online thay thế. View của route/milestone thêm GeoJSON overlay vào bản đồ địa điểm. Sửa đường đi/vị trí cột mốc không tải lại ZIP khi file không đổi. Component hủy request, remove map/protocol và dispose SQLite khi unmount.

Mock mode chưa có ZIP artifact thật để preview. Không dùng mock mode để xác nhận chất lượng gói bản đồ xuất bản.

## Lịch sử tác vụ

Danh sách có tab và filter type đồng bộ, status, ngày, search và phân trang. Counts lấy từ API; lỗi danh sách/chi tiết có ErrorState và retry. Link chi tiết dùng task `id`, link quản lý map dùng `jobId`. Tác vụ Place Builder cũ có thể vẫn xuất hiện trong lịch sử nhưng không có trang review riêng trên web.

Xem [audit lịch sử tác vụ](agent-task-history-audit.md) để biết phạm vi test riêng.

## Thành phần và giới hạn

Components dùng chung: AgentStepper, AgentProgress, AgentStatusBadge, BBoxPreview, MapPreview. Feature Map Builder có BBoxInput, MapBuilderForm, MapBuildProgress; Assistant có ConversationList, ChatInput, ChatMessage, ApprovalCard, LLMProviderSelector.

Test UI/API adapter kiểm tra lịch sử task, auth và ZIP preview. Chưa có E2E toàn bộ hội thoại → LLM → approval → ghi backend hoặc tạo map → upload R2 trên một môi trường đang chạy. Cần smoke test thực tế sau khi cấu hình backend; `npm run build` chỉ xác nhận bundle tạo thành công.

Xem [API reference](api-backend.md) và [integration guide](api-integration.md).
