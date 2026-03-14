'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserWithRole } from '@/lib/rbac/server'

export interface AuditLogRecord {
  id: string
  performed_by: string | null
  actor_name: string | null
  action: string
  entity_type: string
  entity_id: string | null
  entity_label: string | null
  old_value: string | null
  new_value: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface AuditFilter {
  search?: string
  action?: string
  entity_type?: string
  dateFrom?: string
  dateTo?: string
}

export async function getAuditLogs(
  filters: AuditFilter = {},
  page = 1,
  pageSize = 20
): Promise<{ logs: AuditLogRecord[]; totalCount: number; totalPages: number }> {
  const currentUser = await getCurrentUserWithRole()
  if (!currentUser || currentUser.role !== 'supervisor') {
    return { logs: [], totalCount: 0, totalPages: 0 }
  }

  const supabase = await createClient()

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })

  if (filters.search) {
    query = query.or(
      `actor_name.ilike.%${filters.search}%,entity_label.ilike.%${filters.search}%,action.ilike.%${filters.search}%`
    )
  }
  if (filters.action && filters.action !== 'all') {
    query = query.eq('action', filters.action)
  }
  if (filters.entity_type && filters.entity_type !== 'all') {
    query = query.eq('entity_type', filters.entity_type)
  }
  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }
  if (filters.dateTo) {
    // include the full day
    query = query.lte('created_at', filters.dateTo + 'T23:59:59Z')
  }

  const from = (page - 1) * pageSize
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) {
    console.error('Error fetching audit logs:', error)
    return { logs: [], totalCount: 0, totalPages: 0 }
  }

  return {
    logs: (data || []) as AuditLogRecord[],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

export async function getAuditStats(): Promise<{
  totalActions: number
  todayActions: number
  fileActions: number
  userActions: number
}> {
  const currentUser = await getCurrentUserWithRole()
  if (!currentUser || currentUser.role !== 'supervisor') {
    return { totalActions: 0, todayActions: 0, fileActions: 0, userActions: 0 }
  }

  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [total, todayRes, fileRes, userRes] = await Promise.all([
    supabase.from('audit_logs').select('*', { count: 'exact', head: true }),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true })
      .eq('entity_type', 'file'),
    supabase.from('audit_logs').select('*', { count: 'exact', head: true })
      .eq('entity_type', 'user'),
  ])

  return {
    totalActions: total.count || 0,
    todayActions: todayRes.count || 0,
    fileActions:  fileRes.count || 0,
    userActions:  userRes.count || 0,
  }
}