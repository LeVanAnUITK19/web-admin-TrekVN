import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail, Database, Users, Shield, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from './auth.context'
import { ROUTES, IS_MOCK_MODE } from '@/constants'
import { cn } from '@/lib/utils'
import authBg from '@/assets/images/auth-bg.jpg'

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
  remember: z.boolean().optional(),
})
type LoginFormData = z.infer<typeof loginSchema>

// TrekViệt logo SVG
function TrekVietLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4L6 36h36L24 4z" fill="currentColor" opacity="0.9" />
      <path d="M24 14L14 32h20L24 14z" fill="white" opacity="0.85" />
      <circle cx="24" cy="22" r="4" fill="currentColor" />
    </svg>
  )
}

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? ROUTES.DASHBOARD

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: IS_MOCK_MODE
      ? { email: 'admin@trekviet.vn', password: 'admin123', remember: false }
      : { email: '', password: '', remember: false },
  })

  if (!authLoading && isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    try {
      await login({ email: data.email, password: data.password }, data.remember)
      toast.success('Đăng nhập thành công')
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập thất bại'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL – hero with mountain background ── */}
      <div className="hidden lg:flex lg:w-[58%] relative overflow-hidden flex-col">
        {/* Background image */}
        <img
          src={authBg}
          alt="TrekViệt mountain background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Dark overlay gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-10 pt-9">
          {/* Logo + brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/25">
              <TrekVietLogo className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-lg tracking-tight">TrekViệt</span>
              <span className="text-[11px] font-semibold bg-emerald-500/80 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                Admin
              </span>
            </div>
            <span className="text-white/50 text-xs ml-1">Web Admin Portal</span>
          </div>
          {/* Tagline */}
          <p className="text-white/70 text-sm italic text-right max-w-[180px] leading-snug">
            "Khám phá Việt Nam<br />từ những bước chân thật."
          </p>
        </div>

        {/* Main content – bottom area */}
        <div className="relative z-10 flex flex-col justify-end px-10 pb-10 flex-1">
          {/* Big headline */}
          <h1 className="text-5xl font-extrabold text-white leading-tight mb-2 drop-shadow-lg">
            TrekViệt
          </h1>
          <p className="text-white/90 text-xl font-medium mb-1">Quản trị dữ liệu trekking</p>
          <p className="text-white/70 text-base mb-10">cho cộng đồng Việt Nam</p>

          {/* Feature list */}
          <div className="space-y-4 mb-10">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <Database className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Quản lý dữ liệu tập trung</p>
                <p className="text-white/60 text-xs mt-0.5">Địa điểm, cung đường, cột mốc và bản đồ offline</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Hỗ trợ cộng đồng phát triển</p>
                <p className="text-white/60 text-xs mt-0.5">Duyệt đóng góp và kiểm duyệt nội dung</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Minh bạch và an toàn</p>
                <p className="text-white/60 text-xs mt-0.5">Phân quyền rõ ràng, ghi nhận lịch sử thao tác</p>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-0 border-t border-white/20 pt-6">
            <div className="pr-6">
              <p className="text-white text-xl font-bold">12,500+</p>
              <p className="text-white/55 text-xs mt-0.5">Người dùng</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="px-6">
              <p className="text-white text-xl font-bold">1,200+</p>
              <p className="text-white/55 text-xs mt-0.5">Địa điểm</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="px-6">
              <p className="text-white text-xl font-bold">400+</p>
              <p className="text-white/55 text-xs mt-0.5">Cung đường</p>
            </div>
            <div className="h-8 w-px bg-white/20" />
            <div className="pl-6">
              <p className="text-white text-xl font-bold">30+</p>
              <p className="text-white/55 text-xs mt-0.5">Tỉnh thành</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL – login form ── */}
      <div className="flex-1 flex flex-col justify-center items-center px-8 py-12 bg-white">
        <div className="w-full max-w-[380px]">

          {/* Logo centered */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-16 h-16 bg-[#1a3d35] rounded-2xl flex items-center justify-center mb-3 shadow-lg">
              <TrekVietLogo className="w-9 h-9 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#1a3d35] font-bold text-xl tracking-tight">TrekViệt</span>
              <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Admin
              </span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-7">
            <h2 className="text-2xl font-bold text-gray-900">Chào mừng trở lại</h2>
            <p className="text-gray-500 text-sm mt-1">Đăng nhập để truy cập Web Admin Portal</p>
          </div>

          {/* Demo mode hint */}
          {IS_MOCK_MODE && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-5 text-xs text-amber-700 flex items-center gap-2">
              <span className="text-amber-500">ℹ️</span>
              <span>
                <strong>Demo:</strong> <code>admin@trekviet.vn</code> / <code>admin123</code>
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="Nhập email của bạn"
                  autoComplete="email"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 text-sm border rounded-xl outline-none transition-all',
                    'placeholder:text-gray-400',
                    'focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600',
                    errors.email
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu"
                  autoComplete="current-password"
                  className={cn(
                    'w-full pl-10 pr-10 py-2.5 text-sm border rounded-xl outline-none transition-all',
                    'placeholder:text-gray-400',
                    'focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600',
                    errors.password
                      ? 'border-red-400 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  {...register('remember')}
                  type="checkbox"
                  id="remember"
                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 accent-emerald-700 cursor-pointer"
                />
                <span className="text-sm text-gray-600">Ghi nhớ đăng nhập</span>
              </label>
              <button
                type="button"
                className="text-sm text-emerald-700 hover:text-emerald-900 font-medium transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                'w-full py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all',
                'flex items-center justify-center gap-2',
                'bg-[#1a3d35] hover:bg-[#245c4a] active:scale-[0.99]',
                'shadow-sm hover:shadow-md',
                'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100'
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Đang đăng nhập...
                </>
              ) : (
                <>
                  Đăng nhập
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">hoặc</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Google login */}
          <button
            type="button"
            className={cn(
              'w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white',
              'flex items-center justify-center gap-2.5',
              'text-sm font-medium text-gray-700',
              'hover:bg-gray-50 hover:border-gray-300 transition-all',
              'shadow-sm active:scale-[0.99]'
            )}
          >
            {/* Google G icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Đăng nhập với Google
          </button>

          {/* Admin-only notice */}
          <div className="mt-5 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3.5">
            <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Chỉ dành cho quản trị viên</p>
              <p className="text-xs text-emerald-700/80 mt-0.5 leading-relaxed">
                Hệ thống sẽ kiểm tra quyền admin trước khi đăng nhập.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
