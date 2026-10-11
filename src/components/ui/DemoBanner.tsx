import { Info } from 'lucide-react'
import { IS_MOCK_MODE } from '@/constants'

export function DemoBanner() {
  if (!IS_MOCK_MODE) return null

  return (
    <div className="demo-banner text-white px-4 py-2 text-xs flex items-center gap-2 justify-center font-medium">
      <Info className="w-3.5 h-3.5 flex-shrink-0" />
      <span>DEMO MODE – Đang sử dụng dữ liệu mẫu, không phải dữ liệu thực tế</span>
    </div>
  )
}
