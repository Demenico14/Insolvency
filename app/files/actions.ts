'use server'

import { createClient } from '@/lib/supabase/server'
import { logAction } from '@/lib/audit'

export interface FileRecord {
  id: string
  file_reference: string
  client_name: string
  registration_id: string | null
  date_received: string
  physical_location: string | null
  status: string
  created_at: string
  document_url: string | null
  document_name: string | null
  notes: string | null
  category_details: Record<string, string> | null
  category: { id: string; code: string; name: string } | null
  officer: { id: string; name: string } | null
}

export interface FilesFilter {
  search?: string
  category?: string
  status?: string
  officer?: string
  dateFrom?: string
  dateTo?: string
}

export interface PaginatedResult {
  files: FileRecord[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getFiles(
  filters: FilesFilter = {},
  page = 1,
  pageSize = 10
): Promise<PaginatedResult> {
  const supabase = await createClient()

  let query = supabase
    .from('files')
    .select(`
      id, file_reference, client_name, registration_id, date_received,
      physical_location, status, created_at, document_url, document_name,
      notes, category_details,
      category:categories(id, code, name),
      officer:officers(id, name)
    `, { count: 'exact' })

  if (filters.search)
    query = query.or(`file_reference.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%,registration_id.ilike.%${filters.search}%`)
  if (filters.category)  query = query.eq('category_id', filters.category)
  if (filters.status)    query = query.eq('status', filters.status)
  if (filters.officer)   query = query.eq('assigned_officer_id', filters.officer)
  if (filters.dateFrom)  query = query.gte('date_received', filters.dateFrom)
  if (filters.dateTo)    query = query.lte('date_received', filters.dateTo)

  const from = (page - 1) * pageSize
  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (error) {
    console.error('Error fetching files:', error)
    return { files: [], totalCount: 0, page, pageSize, totalPages: 0 }
  }

  return {
    files: (data || []) as FileRecord[],
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

export async function getFileById(id: string): Promise<FileRecord | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('files')
    .select(`
      id, file_reference, client_name, registration_id, date_received,
      physical_location, status, created_at, document_url, document_name,
      notes, category_details,
      category:categories(id, code, name),
      officer:officers(id, name)
    `)
    .eq('id', id)
    .single()

  if (error) return null
  return data as FileRecord
}

export async function deleteFile(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Fetch label + document path before deleting
  const { data: file } = await supabase
    .from('files').select('file_reference, client_name, document_url').eq('id', id).single()

  // Remove document from storage bucket if one exists
  if (file?.document_url) {
    try {
      // Extract the storage path from the public URL
      // URL format: .../storage/v1/object/public/insolvency-files/documents/xxx
      const url = new URL(file.document_url)
      const pathParts = url.pathname.split('/insolvency-files/')
      if (pathParts[1]) {
        await supabase.storage.from('insolvency-files').remove([pathParts[1]])
      }
    } catch (e) {
      console.error('Storage cleanup error (non-fatal):', e)
    }
  }

  const { error } = await supabase.from('files').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  await logAction({
    action:       'file.deleted',
    entity_type:  'file',
    entity_id:    id,
    entity_label: file?.file_reference,
    metadata:     { client_name: file?.client_name },
  })

  return { success: true }
}

export async function updateFileStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: file } = await supabase
    .from('files').select('file_reference, status').eq('id', id).single()

  const { error } = await supabase
    .from('files')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  await logAction({
    action:       'file.status_changed',
    entity_type:  'file',
    entity_id:    id,
    entity_label: file?.file_reference,
    old_value:    file?.status,
    new_value:    status,
  })

  return { success: true }
}

export interface FileMetadataUpdate {
  client_name: string
  registration_id: string
  date_received: string
  physical_location: string
  status: string
  category_id: string
  notes: string
}

export async function updateFileMetadata(
  id: string,
  data: FileMetadataUpdate
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: before } = await supabase
    .from('files').select('file_reference, client_name, status').eq('id', id).single()

  const { error } = await supabase
    .from('files')
    .update({
      client_name:       data.client_name,
      registration_id:   data.registration_id   || null,
      date_received:     data.date_received,
      physical_location: data.physical_location  || null,
      status:            data.status,
      category_id:       data.category_id        || null,
      notes:             data.notes              || null,
      updated_at:        new Date().toISOString(),
    })
    .eq('id', id)

  if (error) return { success: false, error: error.message }

  await logAction({
    action:       'file.metadata_updated',
    entity_type:  'file',
    entity_id:    id,
    entity_label: before?.file_reference,
    metadata: {
      client_name:       data.client_name,
      status:            data.status,
      physical_location: data.physical_location,
    },
  })

  return { success: true }
}

export async function reassignFileOfficer(
  fileId: string,
  officerId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Fetch old officer name
  const { data: file } = await supabase
    .from('files')
    .select('file_reference, officer:officers(name), assigned_officer_id')
    .eq('id', fileId)
    .single()

  const { data: newOfficer } = await supabase
    .from('officers').select('name').eq('id', officerId).single()

  const { error } = await supabase
    .from('files')
    .update({ assigned_officer_id: officerId || null, updated_at: new Date().toISOString() })
    .eq('id', fileId)

  if (error) return { success: false, error: error.message }

  const oldName = (file?.officer as any)?.name ?? 'Unassigned'
  const newName = newOfficer?.name ?? 'Unassigned'

  await logAction({
    action:       'file.officer_reassigned',
    entity_type:  'file',
    entity_id:    fileId,
    entity_label: file?.file_reference,
    old_value:    oldName,
    new_value:    newName,
  })

  return { success: true }
}

export async function removeFileDocument(
  fileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: file } = await supabase
    .from('files')
    .select('file_reference, document_url, document_name')
    .eq('id', fileId)
    .single()

  if (!file) return { success: false, error: 'File not found' }

  // Remove from storage bucket
  if (file.document_url) {
    try {
      const url = new URL(file.document_url)
      const pathParts = url.pathname.split('/insolvency-files/')
      if (pathParts[1]) {
        await supabase.storage.from('insolvency-files').remove([pathParts[1]])
      }
    } catch (e) {
      console.error('Storage cleanup error (non-fatal):', e)
    }
  }

  // Clear document fields on the file record
  const { error } = await supabase
    .from('files')
    .update({ document_url: null, document_name: null, updated_at: new Date().toISOString() })
    .eq('id', fileId)

  if (error) return { success: false, error: error.message }

  await logAction({
    action:       'file.metadata_updated',
    entity_type:  'file',
    entity_id:    fileId,
    entity_label: file.file_reference,
    old_value:    file.document_name ?? 'document',
    new_value:    'removed',
    metadata:     { action: 'document_removed' },
  })

  return { success: true }
}