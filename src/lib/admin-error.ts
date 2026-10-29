import axios from 'axios'

export function adminError(error: unknown): string {
  if (axios.isAxiosError<{ error?: { message?: string }; message?: string }>(error)) {
    if (error.response?.status === 403) return 'Tài khoản không có quyền thực hiện thao tác quản trị này.'
    if (error.response?.status === 404) return 'Không tìm thấy dữ liệu hoặc API quản trị chưa được triển khai.'
    return error.response?.data?.error?.message ?? error.response?.data?.message ?? 'Không kết nối được máy chủ. Vui lòng thử lại.'
  }
  return error instanceof Error ? error.message : 'Thao tác thất bại. Vui lòng thử lại.'
}
