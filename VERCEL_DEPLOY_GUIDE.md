# 🚀 Hướng dẫn Deploy Web Admin lên Vercel

## 🐛 **Vấn đề hiện tại**

Web Admin trên Vercel vẫn chạy **mock data** và **UI cũ** mặc dù code mới đã push lên GitHub.

### **Root Cause:**

Code có constant `IS_MOCK_MODE` được điều khiển bởi ENV variable:

```typescript
// src/constants/index.ts
export const API_MODE = import.meta.env.VITE_API_MODE ?? 'mock'  // ← Mặc định 'mock'
export const IS_MOCK_MODE = API_MODE === 'mock'
```

**Local `.env`:**
```env
VITE_API_MODE=real  ← Hoạt động
```

**Vercel:**
```
VITE_API_MODE=???  ← CHƯA CÓ → mặc định 'mock' → chạy mock data!
```

---

## ✅ **Giải pháp**

### **Bước 1: Cấu hình Environment Variables trên Vercel**

1. **Vào Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Select project: `web-admin-trekvn`

2. **Settings → Environment Variables:**
   - Click "Add New"

3. **Thêm các biến:**

```env
# ⭐ QUAN TRỌNG: Switch từ mock sang real API
VITE_API_MODE=real

# API Gateway URL (Render)
VITE_API_BASE_URL=https://trekvn-gateway.onrender.com

# API Version
VITE_API_VERSION=v1

# App metadata
VITE_APP_NAME=TrekViệt Admin
VITE_APP_VERSION=1.0.0
```

4. **Environment chọn:**
   - ✅ Production
   - ✅ Preview (optional)
   - ✅ Development (optional)

5. **Save** → Vercel sẽ auto-trigger rebuild

### **Bước 2: Trigger Redeploy**

**Option A: Auto (recommended):**
- Vercel tự động redeploy sau khi save ENV variables

**Option B: Manual:**
- Dashboard → Deployments → Three dots menu (latest) → "Redeploy"

---

## 📋 **Checklist Deploy**

### ✅ **Pre-deployment:**

- [ ] Code mới đã push lên GitHub
  ```bash
  git status
  git log --oneline -3
  git push origin main
  ```

- [ ] API Gateway đã deployed trên Render
  ```bash
  curl https://trekvn-gateway.onrender.com/health
  # Expected: {"status":"ok"}
  ```

### ✅ **Vercel Configuration:**

- [ ] Project connected to correct GitHub repo
- [ ] Branch: `main` (hoặc branch chính của bạn)
- [ ] Build Command: `npm run build` (mặc định từ package.json)
- [ ] Output Directory: `dist` (mặc định Vite)
- [ ] Install Command: `npm install`

- [ ] Environment Variables configured:
  - [ ] `VITE_API_MODE=real`
  - [ ] `VITE_API_BASE_URL=<gateway-url>`
  - [ ] `VITE_API_VERSION=v1`

### ✅ **Post-deployment:**

- [ ] Deployment succeeded (green checkmark)
- [ ] Visit production URL
- [ ] Check Network tab → API calls đến Gateway (không phải mock)
- [ ] Login thử → Should call real API
- [ ] Dashboard loads real data

---

## 🔍 **Debugging**

### **Problem 1: Vẫn hiện mock data**

**Check:**
```bash
# 1. Mở DevTools → Console
console.log(IS_MOCK_MODE)  // Should be false

# 2. Check environment
console.log(import.meta.env.VITE_API_MODE)  // Should be 'real'
console.log(import.meta.env.VITE_API_BASE_URL)  // Should be Gateway URL
```

**Solution:**
- Verify ENV variables trên Vercel
- Trigger redeploy
- Clear browser cache

### **Problem 2: Build failed**

**Check Build Logs:**
- Vercel Dashboard → Deployments → Failed deployment → View logs

**Common issues:**
- TypeScript errors
- Missing dependencies
- Build command incorrect

**Solution:**
```bash
# Test build locally
npm run build

# Fix errors
npm run typecheck
npm run lint
```

### **Problem 3: CORS errors**

**Error trong Console:**
```
Access to fetch at 'https://trekvn-gateway.onrender.com/api/v1/...' 
from origin 'https://admin-trekvn.vercel.app' has been blocked by CORS policy
```

**Solution:**
Cấu hình `ALLOWED_ORIGINS` trên API Gateway (Render):

```env
# Render → API Gateway → Environment Variables
ALLOWED_ORIGINS=https://admin-trekvn.vercel.app
```

Sau đó trigger redeploy API Gateway.

### **Problem 4: 404 on refresh**

**Error:** Page works on first load but 404 khi refresh

**Solution:** Add `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 📊 **Architecture Overview**

```
User Browser
    ↓
Vercel (https://admin-trekvn.vercel.app)
    ↓ CORS check
API Gateway (https://trekvn-gateway.onrender.com)
    ↓ Proxy
Auth/Checkin/Trekking/Agent Services (Render)
    ↓
MongoDB Atlas / RabbitMQ / Cloudinary / R2
```

---

## 🔐 **Security Notes**

### **ENV Variables:**

**✅ Safe to expose (VITE_* prefix):**
- `VITE_API_BASE_URL` - Public URL
- `VITE_API_MODE` - Feature flag
- `VITE_APP_NAME` - Metadata

**❌ NEVER expose:**
- `JWT_SECRET`
- `MONGODB_URI`
- `RABBITMQ_URL`
- API keys, passwords

**Rule:** Chỉ các biến có prefix `VITE_` mới được embed vào client bundle.

### **CORS Configuration:**

**Vercel URL patterns:**
- Production: `https://admin-trekvn.vercel.app`
- Preview: `https://admin-trekvn-<git-branch>-<username>.vercel.app`

**Cấu hình Gateway:**
```env
# For production only
ALLOWED_ORIGINS=https://admin-trekvn.vercel.app

# For production + preview
ALLOWED_ORIGINS=https://admin-trekvn.vercel.app,https://admin-trekvn-*.vercel.app
```

**Note:** Wildcard `*` trong CORS config không được khuyến nghị cho production.

---

## 📱 **Alternative: Deploy to Netlify**

Nếu Vercel gặp vấn đề, có thể dùng Netlify:

### **netlify.toml:**
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### **Environment Variables:**
Same as Vercel, add trên Netlify Dashboard.

---

## 🎯 **Expected Result**

**After correct deployment:**

1. **URL:** `https://admin-trekvn.vercel.app`

2. **Login page** loads without errors

3. **Network tab** shows:
   ```
   POST https://trekvn-gateway.onrender.com/api/v1/auth/login
   Status: 200 OK (hoặc 401 nếu credentials sai)
   ```

4. **Console** không có:
   - Mock data logs
   - CORS errors
   - API errors (ngoài 401/403 expected)

5. **Dashboard** hiện real data từ backend

---

## 🆘 **Troubleshooting Checklist**

- [ ] GitHub repo có code mới nhất?
  ```bash
  git log --oneline origin/main -3
  ```

- [ ] Vercel connected đúng repo & branch?
  - Settings → Git → Repository

- [ ] ENV variables đã được set?
  - Settings → Environment Variables

- [ ] Build command & output directory đúng?
  - Settings → General → Build & Development Settings

- [ ] API Gateway đã live?
  ```bash
  curl https://trekvn-gateway.onrender.com/health
  ```

- [ ] CORS đã được cấu hình?
  - Render → API Gateway → Environment → `ALLOWED_ORIGINS`

- [ ] Browser cache đã clear?
  - DevTools → Network tab → "Disable cache"
  - Hard refresh: `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac)

---

## 📚 **Resources**

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [CORS Documentation](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Status:** 📝 **NEEDS ACTION**  
**Next Step:** Cấu hình ENV variables trên Vercel Dashboard

**ETA:** ~5 phút (sau khi config, Vercel auto-rebuild ~2-3 phút)
