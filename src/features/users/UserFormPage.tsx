import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Upload, Eye, EyeOff } from 'lucide-react'
import { useState, useRef } from 'react'
import { ROUTES } from '@/constants'
import { cn } from '@/lib/utils'
import { useCreateUser } from './useUsers'

const schema = z
  .object({
    name: z.string().min(2, 'Họ và tên phải từ 2 ký tự'),
    email: z.string().email('Email không hợp lệ'),
    username: z.string().min(3, 'Tên đăng nhập từ 3 ký tự').optional().or(z.literal('')),
    password: z.string().min(6, 'Mật khẩu từ 6 ký tự'),
    confirmPassword: z.string(),
    role: z.enum(['ADMIN', 'USER']),
    status: z.enum(['ACTIVE', 'INACTIVE', 'BLOCKED']),
    bio: z.string().max(500).optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })

type FormData = z.infer<typeof schema>

export default function UserFormPage() {
  const navigate = useNavigate()
  const createMutation = useCreateUser()
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      username: '',
      password: '',
      confirmPassword: '',
      role: 'USER',
      status: 'ACTIVE',
      bio: '',
    },
  })

  const bioValue = watch('bio') ?? ''

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (data: FormData) => {
    await createMutation.mutateAsync({
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      status: data.status as 'ACTIVE' | 'INACTIVE' | 'BLOCKED',
      username: data.username || undefined,
      bio: data.bio || undefined,
    })
    navigate(ROUTES.USERS)
  }

  const inputCls = (hasErr?: boolean) =>
    cn(
      'w-full px-3 py-2 text-sm border rounded-md outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
      hasErr ? 'border-destructive' : 'border-border',
    )

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button onClick={() => navigate(ROUTES.USERS)} className="hover:text-primary transition-colors">
          Người dùng
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">Thêm người dùng</span>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(ROUTES.USERS)}
          className="p-2 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Thêm người dùng</h1>
          <p className="text-sm text-muted-foreground">Tạo tài khoản người dùng mới cho hệ thống</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left: main fields ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Thông tin cơ bản */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Thông tin cơ bản</h2>
              <div className="space-y-4">

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label block mb-1">
                      Họ và tên <span className="text-destructive">*</span>
                    </label>
                    <input
                      {...register('name')}
                      className={inputCls(!!errors.name)}
                      placeholder="Họ và tên"
                    />
                    {errors.name && <p className="form-error">{errors.name.message}</p>}
                  </div>
                  <div>
                    <label className="form-label block mb-1">Tên người dùng</label>
                    <input
                      {...register('username')}
                      className={inputCls(!!errors.username)}
                      placeholder="Tên đăng nhập (tùy chọn)"
                    />
                    {errors.username && <p className="form-error">{errors.username.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="form-label block mb-1">
                    Email <span className="text-destructive">*</span>
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className={inputCls(!!errors.email)}
                    placeholder="Nhập email"
                  />
                  {errors.email && <p className="form-error">{errors.email.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label block mb-1">
                      Mật khẩu <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        {...register('password')}
                        type={showPw ? 'text' : 'password'}
                        className={cn(inputCls(!!errors.password), 'pr-10')}
                        placeholder="Nhập mật khẩu"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="form-error">{errors.password.message}</p>}
                  </div>
                  <div>
                    <label className="form-label block mb-1">
                      Xác nhận mật khẩu <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <input
                        {...register('confirmPassword')}
                        type={showConfirm ? 'text' : 'password'}
                        className={cn(inputCls(!!errors.confirmPassword), 'pr-10')}
                        placeholder="Nhập lại mật khẩu"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="form-error">{errors.confirmPassword.message}</p>
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Vai trò và trạng thái */}
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Vai trò và trạng thái</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label block mb-1">Vai trò</label>
                  <select {...register('role')} className={inputCls()}>
                    <option value="USER">User</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    CS ADMIN chỉ có thể truy cập Admin Portal
                  </p>
                </div>
                <div>
                  <label className="form-label block mb-1">Trạng thái</label>
                  <select {...register('status')} className={inputCls()}>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Không hoạt động</option>
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="form-label block mb-1">Ghi chú</label>
                <textarea
                  {...register('bio')}
                  rows={3}
                  maxLength={500}
                  className={inputCls()}
                  placeholder="Nhập ghi chú (tùy chọn)"
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{bioValue.length}/500</p>
              </div>
            </div>

          </div>

          {/* ── Right: Avatar ── */}
          <div>
            <div className="bg-white rounded-lg border border-border p-5">
              <h2 className="font-semibold text-foreground mb-4">Ảnh đại diện</h2>
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-24 h-24 rounded-full object-cover mb-3"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <p className="text-sm font-medium text-foreground">Kéo thả ảnh hoặc chọn file</p>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG (tối đa 2MB)</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={() => navigate(ROUTES.USERS)}
            className="px-6 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-6 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md disabled:opacity-60 transition-colors"
          >
            {createMutation.isPending ? 'Đang lưu...' : 'Tạo người dùng'}
          </button>
        </div>
      </form>
    </div>
  )
}
