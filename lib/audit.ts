'use server'

import { createClient } from '@/lib/supabase/server'

export type AuditAction =
  // File actions
  | 'file.created'
  | 'file.metadata_updated'
  | 'file.status_changed'
  | 'file.officer_reassigned'
  | 'file.deleted'
  | 'file.document_uploaded'
  // Movement actions
  | 'movement.check_out'
  | 'movement.check_in'
  | 'movement.transfer'
  // User actions
  | 'user.role_changed'
  | 'user.activated'
  | 'user.deactivated'
  | 'user.supervisor_created'

export interface AuditEntry {
  action: AuditAction
  entity_type: 'file' | 'user' | 'movement'
  entity_id?: string
  entity_label?: string   // e.g. file reference or user name
  old_value?: string
  new_value?: string
  metadata?: Record<string, unknown>
}

export async function logAction(entry: AuditEntry): Promise<void> {
  try {
    const supabase = await createClient()

    // Get current user + their display name
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('user_id', user.id)
      .single()

    const actorName = profile
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || user.email
      : user.email

    await supabase.from('audit_logs').insert({
      performed_by: user.id,
      actor_name:   actorName,
      action:       entry.action,
      entity_type:  entry.entity_type,
      entity_id:    entry.entity_id   ?? null,
      entity_label: entry.entity_label ?? null,
      old_value:    entry.old_value   ?? null,
      new_value:    entry.new_value   ?? null,
      metadata:     entry.metadata    ?? {},
    })
  } catch (err) {
    // Never let audit logging crash the main operation
    console.error('Audit log failed:', err)
  }
}