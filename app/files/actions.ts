"use server"

import { createClient } from "@/lib/supabase/server"

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
  category: {
    id: string
    code: string
    name: string
  } | null
  officer: {
    id: string
    name: string
  } | null
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
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedResult> {
  const supabase = await createClient()
  
  let query = supabase
    .from("files")
    .select(`
      id,
      file_reference,
      client_name,
      registration_id,
      date_received,
      physical_location,
      status,
      created_at,
      document_url,
      document_name,
      category:categories(id, code, name),
      officer:officers(id, name)
    `, { count: "exact" })

  // Apply filters
  if (filters.search) {
    query = query.or(`file_reference.ilike.%${filters.search}%,client_name.ilike.%${filters.search}%,registration_id.ilike.%${filters.search}%`)
  }

  if (filters.category) {
    query = query.eq("category_id", filters.category)
  }

  if (filters.status) {
    query = query.eq("status", filters.status)
  }

  if (filters.officer) {
    query = query.eq("assigned_officer_id", filters.officer)
  }

  if (filters.dateFrom) {
    query = query.gte("date_received", filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte("date_received", filters.dateTo)
  }

  // Apply pagination
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query
    .order("created_at", { ascending: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error("Error fetching files:", error)
    return {
      files: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    }
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
    .from("files")
    .select(`
      id,
      file_reference,
      client_name,
      registration_id,
      date_received,
      physical_location,
      status,
      created_at,
      document_url,
      document_name,
      category:categories(id, code, name),
      officer:officers(id, name)
    `)
    .eq("id", id)
    .single()

  if (error) {
    console.error("Error fetching file:", error)
    return null
  }

  return data as FileRecord
}

export async function deleteFile(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("files")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting file:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateFileStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("files")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    console.error("Error updating file status:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
