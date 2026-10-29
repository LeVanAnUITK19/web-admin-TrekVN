# Bản đồ địa điểm và đánh giá

- `/offline-maps` mặc định mở tab bản đồ địa điểm. Có tìm tên, lọc tất cả/đang cho tải/chưa bật tải, phân trang và đi tới màn quản lý. Gói bản đồ vùng giữ tab riêng tại `?tab=packages`.
- Màn quản lý đọc metadata thật từ trekking-service; xem trước bản đồ, tải ZIP bằng Bearer token, sửa phiên bản/file/checksum/zoom/bounds, bật/tắt tải và xác nhận trước khi lưu. Ô số bỏ trống gửi `null`, không tự đổi thành 0. File vẫn được giữ khi tắt tải.
- Link Map Builder gắn sẵn địa điểm và vùng bao phủ hiện có. Cần build và xuất bản ZIP qua luồng Map Builder; lưu metadata không tự upload file.
- Menu **Đánh giá địa điểm** mở `/trekking/reviews`. Có tìm nội dung/người dùng/tên địa điểm, lọc địa điểm/số sao/trạng thái, phân trang, xem ảnh/video và gỡ có xác nhận. API gỡ mềm tính lại điểm trung bình; danh sách đã gỡ giữ bản ghi. Chưa có chức năng khôi phục từ backend.
- Từ chi tiết địa điểm có link mở danh sách đánh giá đã lọc theo địa điểm đó.

Cần deploy trekking-service có `GET /api/v1/admin/trekking/reviews` và bộ lọc `available` cho `/places-offline-maps` trước hoặc cùng giao diện. Không cần đổi gateway hay tạo secrets mới. Bản đồ địa điểm và đánh giá luôn gọi API thật.

Kiểm tra: `npm run build`; `npx vitest run src/tests/map-review-admin.test.tsx src/features/trekking/places/PlaceReviews.test.tsx src/components/map/offlinePackage.test.ts src/tests/community-api.test.tsx`. Kiểm tra trình duyệt với fixture cục bộ ở 1440px và 390px; chưa thao tác dữ liệu thật trên Render.
