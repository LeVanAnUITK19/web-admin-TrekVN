# TrekViệt Admin Portal

Web quản trị TrekVN, dùng React 18, TypeScript, Vite và TanStack Query. Cập nhật ngày **12/10/2026** theo mã nguồn hiện tại.

## Chạy local

Dùng Node.js 22 và npm đi kèm. Commit `package-lock.json` để cài đúng bộ dependency.

```powershell
git clone https://github.com/LeVanAnUITK19/web-admin-TrekVN.git
cd web-admin-TrekVN
npm ci
Copy-Item .env.example .env
npm run dev
```

Trên macOS/Linux, thay lệnh copy bằng `cp .env.example .env`. Mở `http://localhost:5173`.

Template mặc định chạy **mock**. Tài khoản demo: `admin@trekviet.vn` / `admin123`. Tài khoản này chỉ dùng cho mock; API thật cần tài khoản ADMIN được tạo trong backend.

## Cấu hình

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:3000` | URL gốc Gateway, không thêm `/api/v1` |
| `VITE_API_VERSION` | `v1` | Prefix API |
| `VITE_API_MODE` | `mock` | `mock` dùng dữ liệu mẫu; `real` gọi backend |
| `VITE_APP_NAME` | `TrekViệt Admin` | Tên ứng dụng |

Để dùng API thật, đặt `VITE_API_MODE=real`, chạy API Gateway và các service backend liên quan, rồi khởi động lại Vite. HTTP client tự thêm `/api/v1`, Bearer token và cookie refresh. Real mode không tự chuyển sang mock khi API lỗi.

Các biến `VITE_*` được đưa vào mã JavaScript khi build và có thể đọc từ trình duyệt. Không đặt JWT secret, mật khẩu database, API key riêng hoặc credential R2/Cloudinary trong frontend. `.env` và mọi `.env.*` bị Git bỏ qua, trừ `.env.example`.

## Tính năng

| Chức năng | Route giao diện | Phạm vi |
| --- | --- | --- |
| Đăng nhập / Dashboard | `/login`, `/dashboard` | ADMIN, thống kê |
| Người dùng | `/users` | Tạo/sửa, khóa/mở khóa, XP và lịch sử rank |
| Địa điểm | `/trekking/places` | CRUD, ảnh, đánh giá, bản đồ offline |
| Cung đường | `/trekking/routes` | CRUD, ảnh và đường đi GPX/GeoJSON |
| Cột mốc | `/trekking/milestones` | CRUD theo cung đường, thứ tự và vị trí |
| Đóng góp | `/contributions` | Duyệt đề xuất và marker, xử lý xung đột |
| Cộng đồng | `/community` | UI bài viết/bình luận/đánh giá; cần API moderation tương ứng |
| Huy hiệu / Xếp hạng | `/badges`, `/ranks` | Cấu hình điều kiện huy hiệu và rank |
| Bản đồ offline | `/offline-maps` | Gói vùng và offlineMap của địa điểm |
| Hành trình | `/journeys` | Danh sách, chi tiết, track/marker; chỉ đọc |
| Nhật ký | `/audit-logs` | Tra cứu và lọc |
| AI Assistant | `/agent/assistant` | Hội thoại, provider, duyệt/từ chối hành động |
| Map Builder | `/agent/map-builder` | Tạo ZIP, xem bản đồ, duyệt và xuất bản |
| Lịch sử AI | `/agent/tasks` | Lọc, chi tiết task và mở job bản đồ |

Place Builder không còn trang/route riêng trên web. Các helper và kiểu dữ liệu cũ còn được giữ để tương thích lịch sử tác vụ.

Community gọi `/admin/posts`, `/admin/comments`, `/admin/reviews` trong real mode. Backend trong workspace chưa mount đầy đủ các API moderation này; mock mode dùng dữ liệu mẫu. Xem đánh giá ngay tại chi tiết địa điểm dùng API riêng đã có.

## Lệnh phát triển

```bash
npm run dev            # Vite dev server
npm run typecheck      # Kiểm tra cả project app và config
npm run lint           # ESLint, không chấp nhận warning
npm test               # Vitest, toàn bộ test
npm run test:watch     # Vitest watch
npm run test:coverage  # Coverage
npm run build          # TypeScript + production build vào dist/
npm run preview        # Xem production build local
```

Bộ test kiểm tra auth/refresh token, bản đồ ZIP, hành trình, đóng góp, cột mốc, trạng thái cung đường, huy hiệu và lịch sử AI. Kết quả rà soát được ghi tại [docs/release-check.md](docs/release-check.md).

## Cấu trúc

```text
src/
  app/           Router, providers, App
  components/    UI dùng chung, layout, map và agent
  constants/     Routes, cấu hình môi trường, nhãn
  features/      Các module nghiệp vụ
  lib/           Tiện ích, parser track
  mocks/         Dữ liệu demo
  services/api/  Axios client, endpoint map, agent API
  tests/         Test tích hợp UI và helper
  types/         Kiểu dữ liệu
public/          Favicon và asset tĩnh
docs/            Hướng dẫn API, AI và kết quả rà soát
```

## Build và triển khai

Đặt các biến môi trường cho môi trường đích **trước khi** chạy `npm run build`; thay `.env` sau build không đổi bundle. Chỉ deploy `dist/`. Hosting cần rewrite các đường dẫn SPA như `/users` về `index.html`.

Gateway phải cho phép CORS từ domain admin và gửi cookie refresh phù hợp với HTTPS/SameSite. Backend vẫn chịu trách nhiệm xác thực JWT, quyền ADMIN và trạng thái tài khoản cho mọi API. Kiểm tra ProtectedRoute trên giao diện không thay thế kiểm tra quyền phía server.

Preview offline đọc tile từ chính ZIP/MBTiles bằng sql.js và MapLibre, tải qua endpoint có Bearer token. Lỗi ZIP không tự chuyển sang tile online. Chunk MapLibre lớn có thể tạo cảnh báo kích thước khi build; đây không phải lỗi build.

## Tài liệu

Bắt đầu tại [docs/README.md](docs/README.md). Endpoint hiện hành nằm trong `src/services/api/endpoints.ts`; payload và phương thức HTTP nằm trong hook/API helper tương ứng.
