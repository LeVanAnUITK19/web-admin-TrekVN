import { useState } from 'react'
import { MoreHorizontal, Eye, Ban, CheckCircle, Plus } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/common/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Pagination } from '@/components/ui/Pagination'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TableSkeleton } from '@/components/feedback/LoadingSkeleton'
import { EmptyState } from '@/components/feedback/EmptyState'
import { ErrorState } from '@/components/feedback/ErrorState'
import { UserDetailDrawer } from './UserDetailDrawer'
import { useUsers, useBlockUser, useUnblockUser, useUserFilters } from './useUsers'
import { formatDateTime, getInitials } from '@/lib/utils'
import { ROUTES } from '@/constants'
import type { User } from '@/types'

export default function UsersPage() {
  const navigate = useNavigate()
  const { params, setSearch, setStatus, setRole, setPage } = useUserFilters()
  const { data, isLoading, isError, refetch } = useUsers(params)
  const blockMutation = useBlockUser()
  const unblockMutation = useUnblockUser()

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ user: User; action: 'block' | 'unblock' } | null>(null)

  const handleConfirm = async () => {
    if (!confirmAction) return
    if (confirmAction.action === 'block') {
      await blockMutation.mutateAsync({ id: confirmAction.user.id })
    } else {
      await unblockMutation.mutateAsync(confirmAction.user.id)
    }
    setConfirmAction(null)
  }

  return (
    <div>
      <PageHeader title="Quản lý người dùng" description="Tìm kiếm, quản lý và điều chỉnh tài khoản người dùng"
        action={
          <button
            onClick={() => navigate(ROUTES.USERS_CREATE)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
          >
            <Plus className="w-4 h-4" /> Thêm người dùng
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchInput
          value={params.search ?? ''}
          onChange={setSearch}
          placeholder="Tìm theo tên, email..."
          className="w-72"
        />
        <select
          value={params.status ?? ''}
          onChange={(e) => setStatus(e.target.value as User['status'] | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="BLOCKED">Đã khóa</option>
          <option value="INACTIVE">Không hoạt động</option>
        </select>
        <select
          value={params.role ?? ''}
          onChange={(e) => setRole(e.target.value as User['role'] | '')}
          className="px-3 py-2 text-sm border border-border rounded-md bg-white outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tất cả vai trò</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="data-table-container">
        {isLoading ? (
          <div className="p-5"><TableSkeleton rows={5} /></div>
        ) : isError ? (
          <ErrorState retry={refetch} />
        ) : !data?.data?.length ? (
          <EmptyState title="Không có người dùng" description="Không tìm thấy người dùng phù hợp" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-8">#</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Người dùng</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Vai trò</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Trạng thái</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Ngày tham gia</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.data.map((user: User, idx: number) => (
                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {(params.page! - 1) * params.limit! + idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold flex-shrink-0">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={user.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDateTime(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu.Root>
                          <DropdownMenu.Trigger asChild>
                            <button className="p-1.5 rounded hover:bg-muted transition-colors">
                              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenu.Trigger>
                          <DropdownMenu.Portal>
                            <DropdownMenu.Content
                              align="end"
                              className="z-50 min-w-36 bg-white rounded-lg shadow-dropdown border border-border py-1 text-sm"
                            >
                              <DropdownMenu.Item
                                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted outline-none text-foreground"
                                onSelect={() => setSelectedUser(user)}
                              >
                                <Eye className="w-4 h-4" /> Xem chi tiết
                              </DropdownMenu.Item>
                              {user.status !== 'BLOCKED' ? (
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-red-50 text-red-600 outline-none"
                                  onSelect={() => setConfirmAction({ user, action: 'block' })}
                                >
                                  <Ban className="w-4 h-4" /> Khóa tài khoản
                                </DropdownMenu.Item>
                              ) : (
                                <DropdownMenu.Item
                                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-green-50 text-green-600 outline-none"
                                  onSelect={() => setConfirmAction({ user, action: 'unblock' })}
                                >
                                  <CheckCircle className="w-4 h-4" /> Mở khóa
                                </DropdownMenu.Item>
                              )}
                            </DropdownMenu.Content>
                          </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {/* Detail Drawer */}
      <UserDetailDrawer
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onBlock={(user) => setConfirmAction({ user, action: 'block' })}
        onUnblock={(user) => setConfirmAction({ user, action: 'unblock' })}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null) }}
        title={confirmAction?.action === 'block' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
        description={
          confirmAction?.action === 'block'
            ? `Bạn có chắc muốn khóa tài khoản "${confirmAction?.user.name}"? Người dùng sẽ không thể đăng nhập.`
            : `Bạn có chắc muốn mở khóa tài khoản "${confirmAction?.user.name}"?`
        }
        confirmLabel={confirmAction?.action === 'block' ? 'Khóa tài khoản' : 'Mở khóa'}
        variant={confirmAction?.action === 'block' ? 'danger' : 'default'}
        onConfirm={handleConfirm}
        isLoading={blockMutation.isPending || unblockMutation.isPending}
      />
    </div>
  )
}
