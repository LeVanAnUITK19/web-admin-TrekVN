# Kiểm tra lịch sử tác vụ Agent — 11/10/2026

> Đây là biên bản lịch sử của đợt sửa ngày 11/10. Ngày 12/10/2026, lỗi/cảnh báo lint toàn web đã được xử lý và bộ test frontend tăng lên 80 test đạt. Xem [kiểm tra trước commit](release-check.md) để biết trạng thái hiện tại. Kết quả backend bên dưới là kết quả được ghi lại từ đợt trước, không được chạy lại trong lượt rà soát web-admin này.

## Lỗi đã sửa

- Trang danh sách gọi ROUTES.AGENT_TASK_DETAIL trong khi hằng thực tế là AGENT_TASKS_DETAIL, khiến thao tác mở chi tiết lỗi.
- Trang chi tiết sử dụng isPlaceTask chưa khai báo và đường dẫn tới tính năng Place Builder đã bị gỡ.
- Bộ lọc mặc định gửi chuỗi rỗng; backend chỉ nhận None là tất cả, dẫn tới bỏ qua mọi nguồn dữ liệu.
- API cắt từng nguồn trước khi gộp và tính total từ số bản ghi đã cắt; trang sau và số đếm tab bị sai.
- Tìm kiếm thực hiện sau khi cắt dữ liệu, bộ lọc ngày bị bỏ qua. Đã chuyển lọc và đếm vào MongoDB, gộp rồi phân trang. Khoảng ngày dùng múi giờ Việt Nam và bao gồm toàn bộ ngày kết thúc.
- Tab Trợ lý AI chưa có nguồn dữ liệu. Đã bổ sung agent_runs với runType=ASSISTANT_CHAT, ánh xạ RUNNING thành PROCESSING và đọc chi tiết run.
- Lịch sử Place Builder còn tồn tại trong database nhưng thiếu loại tương ứng ở frontend. Đã giữ chức năng đọc lịch sử và kết quả; không tạo đường dẫn tới màn hình đã gỡ.
- API chi tiết địa điểm chỉ tìm candidate ID, không tìm job ID. Đã hỗ trợ cả hai.
- Đồng bộ tab với bộ lọc loại; mở trang quản lý bản đồ bằng jobId.
- Các nút Thử lại và Xóa lịch sử trước đây không có xử lý. Đã bỏ các nút này khỏi menu.
- Chuẩn hóa tiến trình từ dữ liệu pipeline, mức log WARNING/null và thông báo lỗi; tự tải lại chi tiết khi đang chạy.
- Cập nhật test cũ chỉ cho phép READ_ONLY theo cơ chế đề xuất huy hiệu hiện tại; thêm kiểm tra proposal trả cờ chờ duyệt và không tạo TrekkingWriteClient.

## Kiểm chứng

- Toàn bộ 52 test frontend đạt, gồm 4 test mới cho lịch sử tác vụ.
- Toàn bộ 100 unit test agent-service đạt, gồm 14 test lịch sử và kiểm tra proposal không tự ghi production.
- Kiểm tra ESLint riêng trang lịch sử, kiểu dữ liệu và test mới đạt.
- TypeScript và build production admin đạt.

## Những điểm còn lại trong kiểm tra tổng thể

- ESLint toàn web admin: 23 lỗi và 11 cảnh báo ở các module khác. Các lỗi chủ yếu là kiểu any và eslint-disable không còn cần thiết; cảnh báo gồm biến không dùng, export Fast Refresh và dependency của useEffect. Các file liên quan: MapPreview.test.tsx, useBadges.ts, OfflineMapFormPage.tsx, OfflineMapsPage.tsx, useOfflineMaps.ts, useMilestones.ts, usePlaces.ts, RouteFormPage.tsx, useRoutes.ts, types/trekking.ts. Chưa sửa các module này trong đợt sửa lịch sử Agent.
- Build còn cảnh báo chunk bản đồ lớn; pytest còn cảnh báo cấu hình event loop cũ.
- Các test sử dụng mock database và dịch vụ ngoài. Chưa xác nhận bằng phiên admin đang đăng nhập với dữ liệu thật.

## Áp dụng

Khởi động lại agent-service nếu tiến trình hiện tại không tự reload. Với admin chạy Vite dev, tải lại trang. Với bản production, triển khai dist mới. Kiểm tra tab Tất cả, lọc loại, chuyển trang, mở chi tiết và mở quản lý bản đồ.
