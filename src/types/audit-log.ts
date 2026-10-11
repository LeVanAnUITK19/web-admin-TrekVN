export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'BLOCK'
  | 'UNBLOCK'
  | 'APPROVE'
  | 'REJECT'
  | 'HIDE'
  | 'PUBLISH'
  | 'DISABLE'
  | 'LOGIN'
  | 'LOGOUT'

export type AuditEntityType =
  | 'USER'
  | 'PLACE'
  | 'ROUTE'
  | 'MILESTONE'
  | 'CONTRIBUTION'
  | 'POST'
  | 'COMMENT'
  | 'REVIEW'
  | 'BADGE'
  | 'OFFLINE_MAP'
  | 'AUDIT_LOG'

export interface AuditLog {
  id: string
  timestamp: string
  adminId: string
  adminName: string
  adminEmail: string
  action: AuditAction
  entityType: AuditEntityType
  entityId: string
  beforeSummary?: Record<string, unknown>
  afterSummary?: Record<string, unknown>
  result: 'SUCCESS' | 'FAILURE'
  ipAddress?: string
  note?: string
}

export interface AuditLogListParams {
  page?: number
  limit?: number
  adminId?: string
  action?: AuditAction | ''
  entityType?: AuditEntityType | ''
  dateFrom?: string
  dateTo?: string
  result?: 'SUCCESS' | 'FAILURE' | ''
}
