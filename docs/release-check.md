# Kiểm tra Web Admin trước commit

Ngày kiểm tra: **12/10/2026** (Asia/Saigon).

## Phạm vi

Rà soát nguồn web-admin, scripts, auth/refresh, cấu hình Git, README và docs. Đối chiếu path/phương thức API với routes backend local. Không chạy lại bộ test backend, không deploy hoặc push GitHub trong lượt này.

## Đã xử lý

- Làm sạch toàn bộ lỗi và warning ESLint: kiểu any, biến/import thừa, disable directive và dependency effect.
- `typecheck` dùng `tsc -b` để kiểm tra app cùng Vite config; lệnh cũ `tsc --noEmit` ở tsconfig root chỉ chứa references không kiểm tra đầy đủ project.
- Refresh token dùng một promise chung cho các 401 đồng thời; lỗi refresh reject tất cả request đang chờ, tránh promise treo.
- Đánh dấu mọi request retry tối đa một lần và bỏ refresh tự động khi login bị từ chối.
- Thêm timeout cho refresh, kiểm tra accessToken của response, xóa token cũ khi đổi chế độ ghi nhớ đăng nhập.
- Bỏ log payload badge và body/headers lỗi API; debug API chỉ giữ URL/method/status trong dev.
- README/docs phản ánh Journeys, Ranks, AI Assistant, Map Builder, preview ZIP và endpoint `/admin/trekking/*` hiện tại; bỏ mô tả trang Place Builder đã gỡ.
- `.gitignore` chặn `.env`, `.env.*` (trừ template), node_modules, dist, logs, cache TypeScript, coverage, QA, editor, credential file và file tạm.
- Tạo repo riêng ngay trong Web-Admin-TrekVN, origin là repo web-admin, nối tiếp lịch sử main hiện có. Backend/Flutter và các báo cáo ở thư mục cha không nằm trong commit này.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run lint` | Đạt, 0 lỗi / 0 warning |
| `npm run typecheck` | Đạt |
| `npm test` | 18 file, 80 test đạt |
| `npm run build` | Đạt, tạo dist; còn cảnh báo kích thước chunk MapLibre |
| `npm ci --dry-run --ignore-scripts --offline` | Đạt; lockfile khớp package.json |
| `npm audit --json` | Báo cáo 0 vulnerability tại thời điểm kiểm tra |

Test mới kiểm tra đổi storage, refresh đồng thời thành công/thất bại, không refresh login sai và không retry vô hạn. Các test API dùng adapter/response giả; không xác nhận dịch vụ bên ngoài hoạt động.

## Điểm còn lại

- Community real mode cần backend triển khai/mount đầy đủ các API moderation posts/comments/reviews. Reviews trong PlaceDetail dùng endpoint riêng đã có.
- Cần smoke test môi trường thật cho login/cookie/CORS, tạo và duyệt job, download ZIP, upload R2 và hội thoại LLM.
- MapLibre tạo chunk khoảng 800 kB (minified), đã tách vendor riêng. Đây là cảnh báo hiệu năng, không phải lỗi biên dịch.
- Test React Router có cảnh báo future flags v7. Frontend hiện dùng React Router v6.
- Chưa có streaming SSE, tự retry theo Retry-After hoặc E2E toàn bộ luồng backend.

Repo sẵn sàng để push mã nguồn cùng tài liệu. Những giới hạn trên không đồng nghĩa các tính năng đã được xác nhận trên production.
