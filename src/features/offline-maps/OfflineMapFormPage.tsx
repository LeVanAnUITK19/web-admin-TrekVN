import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, Info } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { ROUTES } from '@/constants'
import { cn } from '@/lib/utils'
import { useCreateOfflineMap, useUpdateOfflineMap, usePublishOfflineMap } from './useOfflineMaps'
import type { OfflineMapPackage } from '@/types'

// regionCode phải khớp với enum Mongoose: NORTH | CENTRAL | SOUTH | ALL
const REGION_OPTIONS = [
  { value: 'NORTH', label: 'Miền Bắc' },
  { value: 'CENTRAL', label: 'Miền Trung' },
  { value: 'SOUTH', label: 'Miền Nam' },
  { value: 'ALL', label: 'Toàn quốc' },
]

const schema = z.object({
  name: z.string().min(2, 'Tên gói bản đồ từ 2 ký tự'),
  version: z.string().min(1, 'Nhập phiên bản (VD: 1.0.0)'),
  regionCode: z.enum(['NORTH', 'CENTRAL', 'SOUTH', 'ALL', '']).optional(),
  /** R2 object key — backend dùng để build downloadUrl runtime */
  objectKey: z.string().optional().or(z.literal('')),
  checksum: z.string().optional().or(z.literal('')),
  fileSizeBytes: z.coerce.number().min(0).optional(),
  description: z.string().max(500).optional().or(z.literal('')),
})
type FormData = z.infer<typeof schema>

interface OfflineMapFormPageProps {
  editMap?: OfflineMapPackage
}

export default function OfflineMapFormPage({ editMap }: OfflineMapFormPageProps) {
  const navigate = useNavigate()
  const isEdit = !!editMap
  const createMutation = useCreateOfflineMap()
  const updateMutation = useUpdateOfflineMap()
  const publishMutation = usePublishOfflineMap()
  const isSaving = createMutation.isPending || updateMutation.isPending
  const [mbtilesFile, setMbtilesFile] = useState<File | null>(null)
  const [publishAfterSave, setPublishAfterSave] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      version: '',
      regionCode: '',
      objectKey: '',
      checksum: '',
      fileSizeBytes: undefined,
      description: '',
    },
  })

  useEffect(() => {
    if (editMap) {
      reset({
        name: editMap.name,
        version: editMap.version,
        regionCode: (editMap.regionCode as FormData['regionCode']) ?? '',
        objectKey: '',          // objectKey không hiển thị lại từ server vì lý do bảo mật
        checksum: editMap.checksum ?? '',
        fileSizeBytes: editMap.fileSizeBytes ?? undefined,
        description: editMap.description ?? '',
      })
    }
  }, [editMap, reset])

  const descValue = watch('description') ?? ''
  const objectKeyValue = watch('objectKey') ?? ''
  const checksumValue = watch('checksum') ?? ''

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMbtilesFile(file)
    // Ghi file size thực tế
    setValue('fileSizeBytes', file.size)
    // Lưu ý: đây chỉ là placeholder, không phải SHA256 thực.
    // Checksum thực cần được server tính sau khi upload R2.
    setValue('checksum', `sha256_placeholder_${file.name.replace(/\s/g, '_')}_${file.size}`)
    e.target.value = ''
  }

  const onSubmit = async (data: FormData) => {
    const payload = {
      name: data.name,
      version: data.version,
      regionCode: data.regionCode || undefined,
      objectKey: data.objectKey || undefined,
      checksum: data.checksum || undefined,
      fileSizeBytes: data.fileSizeBytes,
      description: data.description || undefined,
    }

    let savedId: string
    if (isEdit) {
      const updated = await updateMutation.mutateAsync({ id: editMap!.id, data: payload })
      savedId = updated.id
    } else {
      const created = await createMutation.mutateAsync(payload)
      savedId = created.id
    }

    // Publish sau khi save nếu toggle bật và có objectKey
    if (publishAfterSave && payload.objectKey) {
      try {
        await publishMutation.mutateAsync(savedId)
      } catch {
        // Lỗi publish không block điều hướng — toast đã hiển thị
      }
    }

    navigate(ROUTES.OFFLINE_MAPS)
  }

  const inputCls = (hasErr?: boolean) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
      hasErr ? 'border-destructive' : 'border-border',
    )

  const canPublish = !!objectKeyValue || (isEdit && !!editMap?.downloadUrl)

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(ROUTES.OFFLINE_MAPS)} className="hover:text-primary">
          Bản đồ offline
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">
          {isEdit ? 'Chỉnh sửa gói bản đồ' : 'Thêm gói bản đồ'}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(ROUTES.OFFLINE_MAPS)}
          className="p-2 rounded-md hover:bg-muted"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">
            {isEdit ? 'Chỉnh sửa gói bản đồ offline' : 'Thêm gói bản đồ offline'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Gói bản đồ vùng — Admin quản lý thủ công
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Left ─────────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* Thông tin cơ bản */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-4">Thông tin cơ bản</h2>
              <div className="space-y-4">
                <div>
                  <label className="form-label block mb-1">
                    Tên gói bản đồ <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('name')}
                    className={inputCls(!!errors.name)}
                    placeholder="VD: Bản đồ miền Bắc v2"
                  />
                  {errors.name && <p className="form-error">{errors.name.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label block mb-1">
                      Phiên bản <span className="text-destructive">*</span>
                    </label>
                    <input
                      {...register('version')}
                      className={inputCls(!!errors.version)}
                      placeholder="VD: 1.0.0"
                    />
                    {errors.version && <p className="form-error">{errors.version.message}</p>}
                  </div>
                  <div>
                    <label className="form-label block mb-1">Khu vực</label>
                    <select {...register('regionCode')} className={inputCls()}>
                      <option value="">— Chọn khu vực —</option>
                      {REGION_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label block mb-1">Mô tả</label>
                  <textarea
                    {...register('description')}
                    rows={3}
                    maxLength={500}
                    className={inputCls()}
                    placeholder="Mô tả nội dung gói bản đồ..."
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    {descValue.length}/500
                  </p>
                </div>
              </div>
            </div>

            {/* Trạng thái */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-4">Publish sau khi lưu</h2>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-border hover:border-primary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={publishAfterSave}
                    onChange={(e) => setPublishAfterSave(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-primary"
                  />
                  <div>
                    <p className="text-sm font-medium">Publish ngay sau khi lưu</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Chỉ hoạt động khi đã nhập <strong>Object Key</strong>. Gói sẽ chuyển sang
                      trạng thái PUBLISHED và người dùng có thể tải xuống ngay.
                    </p>
                  </div>
                </label>

                {publishAfterSave && !canPublish && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                    <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    Cần nhập <strong>Object Key</strong> bên phải để có thể publish.
                  </div>
                )}

                {isEdit && editMap?.status === 'PUBLISHED' && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    Gói này đã được PUBLISHED.
                    {editMap.publishedAt && (
                      <span className="text-xs text-green-600 ml-1">
                        ({new Date(editMap.publishedAt).toLocaleDateString('vi-VN')})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right ────────────────────────────────────────────────────── */}
          <div className="space-y-5">
            {/* File bản đồ & Object Key */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-1">File bản đồ (R2 Storage)</h2>
              <p className="text-xs text-muted-foreground mb-4">
                Upload file .mbtiles lên R2/CDN trước, sau đó dán Object Key vào đây.
                Download URL được server tự build từ Object Key.
              </p>

              {/* File chọn local (chỉ để lấy metadata) */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors mb-4"
              >
                <Upload className="w-5 h-5 text-muted-foreground mb-1.5" />
                {mbtilesFile ? (
                  <>
                    <p className="text-sm font-medium text-primary">{mbtilesFile.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {(mbtilesFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠ Chọn file để lấy metadata — không upload trực tiếp tại đây
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium">Chọn file .mbtiles (lấy metadata)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      File size và tên sẽ được điền tự động
                    </p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".mbtiles"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label className="form-label block mb-1">
                    Object Key (R2) <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('objectKey')}
                    className={inputCls(!!errors.objectKey)}
                    placeholder="VD: maps/north/v1/north-v1.mbtiles"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Path của file trên R2. Download URL được build từ key này.
                  </p>
                  {errors.objectKey && (
                    <p className="form-error">{errors.objectKey.message}</p>
                  )}
                </div>

                {objectKeyValue && (
                  <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 font-mono break-all">
                    ✓ Key: {objectKeyValue}
                  </div>
                )}

                <div>
                  <label className="form-label block mb-1">Dung lượng file (bytes)</label>
                  <input
                    {...register('fileSizeBytes')}
                    type="number"
                    min="0"
                    className={inputCls()}
                    placeholder="VD: 52428800"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tự động điền khi chọn file ở trên.
                  </p>
                </div>
              </div>
            </div>

            {/* Checksum */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold mb-4">Kiểm tra toàn vẹn (Checksum)</h2>
              <div className="space-y-3">
                <div>
                  <label className="form-label block mb-1">SHA256 Checksum</label>
                  <input
                    {...register('checksum')}
                    className={inputCls()}
                    placeholder="sha256:abc123..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tính checksum thực bằng{' '}
                    <code className="bg-muted px-1 rounded">sha256sum &lt;file&gt;</code> sau khi
                    upload R2.
                  </p>
                </div>

                {checksumValue && (
                  <div className="p-2 bg-muted/40 rounded text-xs font-mono text-muted-foreground break-all">
                    {checksumValue}
                  </div>
                )}
              </div>
            </div>

            {/* Trạng thái hiện tại (edit only) */}
            {isEdit && (
              <div className="bg-white rounded-lg border border-border p-5">
                <h2 className="font-semibold mb-3">Trạng thái hiện tại</h2>
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-full',
                      editMap?.status === 'PUBLISHED'
                        ? 'bg-green-100 text-green-700'
                        : editMap?.status === 'DEPRECATED'
                          ? 'bg-gray-100 text-gray-600'
                          : 'bg-yellow-100 text-yellow-700',
                    )}
                  >
                    {editMap?.status === 'DRAFT'
                      ? 'Bản nháp'
                      : editMap?.status === 'PUBLISHED'
                        ? 'Đã xuất bản'
                        : 'Lỗi thời'}
                  </span>
                  {editMap?.status === 'DRAFT' && (
                    <span className="text-xs text-muted-foreground">
                      → Thêm Object Key và bật publish để xuất bản
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate(ROUTES.OFFLINE_MAPS)}
            className="px-6 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSaving || publishMutation.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60 transition-colors flex items-center gap-2"
          >
            {(isSaving || publishMutation.isPending) && (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            )}
            {isSaving
              ? 'Đang lưu...'
              : publishMutation.isPending
                ? 'Đang publish...'
                : isEdit
                  ? 'Lưu thay đổi'
                  : publishAfterSave && canPublish
                    ? 'Lưu & Publish'
                    : 'Tạo gói bản đồ'}
          </button>
        </div>
      </form>
    </div>
  )
}
