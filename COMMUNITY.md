# Quản lý bài viết cộng đồng

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

- Community: lint đạt, 8/8 test UI/API đạt; production build đạt. Giao diện đã xem trong trình duyệt ở desktop 1440px và màn hình nhỏ 390px với fixture cục bộ, không sửa dữ liệu production.
- Backend Community: 33/33 test đạt; Gateway: 76/76 test đạt; E2E kiểm duyệt và WebSocket xuyên Gateway đạt. Flutter Community: 31/31 test đạt; analyze hai file tương thích tombstone không có lỗi.
- Toàn bộ Web Admin: 82 test đạt, 2 test Milestone thất bại (danh sách nhóm cung đường không hiện dữ liệu fixture); suite Route status không tải được do môi trường jsdom thiếu `window.URL.createObjectURL`. Hai bộ này vẫn lỗi khi chạy riêng, không import màn Community. Chưa sửa các module ngoài Community trong lần thay đổi này.
- Chưa kiểm thử phiên ADMIN thực trên Render với API mới; cần deploy lại Community và Gateway trước khi chạy smoke test Web Admin.
