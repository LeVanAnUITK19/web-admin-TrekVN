# Quản lý bài viết cộng đồng

Mở rộng nhắn tin: nút **Nhóm & báo cáo tin nhắn** tại `/community`. `SocialAdmin.tsx` gọi `/admin/community/groups` và `/admin/community/message-reports`, lọc/phân trang, disable/enable nhóm và REMOVE/DISMISS báo cáo có lý do. Chỉ xem metadata nhóm/tin đã báo cáo, không xem toàn bộ DM. Chi tiết contract và DB ở `Backend-TrekVN/backend/docs/community-social-api.md`; cần deploy lại Auth, Community, Gateway và rebuild Admin. Kiểm thử phần mở rộng: `npx vitest run src/tests/community-social.test.tsx`.

Màn `/community` dùng API thật qua Gateway, kể cả khi module cũ còn bật mock. Không thay lỗi API bằng dữ liệu mẫu.

```dotenv
VITE_API_MODE=real
VITE_API_BASE_URL=https://api-gateway-trekvn.onrender.com
VITE_API_VERSION=v1
```

Base URL không có `/api/v1`: client tự ghép. Cần tài khoản ADMIN thật; triển khai lại cả community-service và api-gateway có prefix `/api/v1/admin/community`. Origin Web Admin phải được cho phép tại Gateway.

- Bài viết và bình luận: phân trang phía server, tìm nội dung/ID, lọc trạng thái; bài có thêm lọc loại và quyền riêng tư.
- Chi tiết: nội dung, ảnh, liên kết địa điểm/hành trình, bình luận và 20 thao tác kiểm duyệt gần nhất.
- Ẩn/hiển thị lại/xóa yêu cầu lý do 3–1000 ký tự. Ẩn giữ nội dung để khôi phục theo privacy cũ; xóa redact và không khôi phục được. Không sửa nội dung thay tác giả.
- `GET /admin/community/posts`, `GET /admin/community/posts/:postId`, `GET /admin/community/comments`.
- `PATCH /admin/community/{posts|comments}/:id/{hide|publish}`, `DELETE /admin/community/{posts|comments}/:id` với JSON `{reason}`.
- Danh sách backend là `data.items`; hooks ánh xạ `postId`/`commentId`, thông tin tác giả và counter sang kiểu UI. Không dùng các API cũ `/admin/posts`, `/admin/comments`, `/admin/reviews`.
- Sau thao tác thành công, làm mới danh sách, chi tiết và bình luận đang mở. Community phát WebSocket invalidation xuống app. Tab không hoạt động không tải dữ liệu.
- Lịch sử lưu trong database Community, xem tại chi tiết bài viết; chưa gộp vào audit logs của auth-service. Đánh giá địa điểm thuộc trekking-service.

Kiểm tra: `npx vitest run src/tests/community-api.test.tsx`, `npm run build`. Smoke test trên môi trường triển khai: đăng nhập ADMIN, xem/lọc, mở chi tiết và ẩn/hiển thị lại bài thử nghiệm; đối chiếu app. Không dùng bài thật để thử xóa.

## Kết quả kiểm tra cục bộ

- Community: lint đạt, 12/12 test UI/API đạt (8 bài/bình luận + 4 nhóm/báo cáo); production build đạt. Không sửa dữ liệu production.
- Backend Community: 45/45 test đạt; Gateway: 83/83 test đạt; Auth discovery đạt. E2E kiểm duyệt và chat riêng xuyên Gateway/WebSocket đạt, có xác nhận tài khoản ngoài cuộc trò chuyện không đọc/nhận được dữ liệu. Flutter Community: 42/42 test đạt; đã render UI dark theme và build APK debug Android có plugin QR.
- Lần kiểm tra toàn bộ Web Admin trước phần mở rộng social ghi nhận 82 test đạt, 2 test Milestone thất bại; suite Route status thiếu `window.URL.createObjectURL` trong jsdom. Lần mở rộng này chỉ kiểm thử lại phạm vi Community và production build, không sửa module ngoài Community.
- Chưa kiểm thử phiên ADMIN thực trên Render với API mới; cần deploy lại Community và Gateway trước khi chạy smoke test Web Admin.
