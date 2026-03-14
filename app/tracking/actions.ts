"use server"

import { createClient } from "@/lib/supabase/server"
import { logAction } from "@/lib/audit"

export interface FileMovement {
  id: string
  file_id: string
  action: string
  from_location: string | null
  to_location: string | null
  checked_out_to: string | null
  purpose: string | null
  notes: string | null
  performed_at: string
  file?: {
    id: string
    file_reference: string
    client_name: string
    physical_location: string | null
    status: string
  }
  officer?: {
    id: string
    name: string
  } | null
}

export interface FileForTracking {
  id: string
  file_reference: string
  client_name: string
  physical_location: string | null
  status: string
  category: {
    code: string
    name: string
  } | null
}

export interface MovementsFilter {
  search?: string
  action?: string
  dateFrom?: string
  dateTo?: string
}

export interface PaginatedMovements {
  movements: FileMovement[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
}

export async function getFileMovements(
  filters: MovementsFilter = {},
  page: number = 1,
  pageSize: number = 10
): Promise<PaginatedMovements> {
  const supabase = await createClient()

  let query = supabase
    .from("file_movements")
    .select(`
      id,
      file_id,
      action,
      from_location,
      to_location,
      checked_out_to,
      purpose,
      notes,
      performed_at,
      performed_by,
      file:files(id, file_reference, client_name, physical_location, status)
    `, { count: "exact" })

  if (filters.action) {
    query = query.eq("action", filters.action)
  }

  if (filters.dateFrom) {
    query = query.gte("performed_at", filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte("performed_at", `${filters.dateTo}T23:59:59`)
  }

  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  query = query
    .order("performed_at", { ascending: false })
    .range(from, to)

  const { data, count, error } = await query

  if (error) {
    console.error("Error fetching movements:", error)
    return {
      movements: [],
      totalCount: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }

  let movements = (data || []) as unknown as FileMovement[]

  // Client-side search filter for file reference/client name
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    movements = movements.filter(m => 
      m.file?.file_reference?.toLowerCase().includes(searchLower) ||
      m.file?.client_name?.toLowerCase().includes(searchLower) ||
      m.checked_out_to?.toLowerCase().includes(searchLower)
    )
  }

  return {
    movements,
    totalCount: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize),
  }
}

export async function getFilesForTracking(search?: string): Promise<FileForTracking[]> {
  const supabase = await createClient()

  let query = supabase
    .from("files")
    .select(`
      id,
      file_reference,
      client_name,
      physical_location,
      status,
      category:categories(code, name)
    `)
    .order("file_reference", { ascending: true })

  if (search) {
    query = query.or(`file_reference.ilike.%${search}%,client_name.ilike.%${search}%`)
  }

  const { data, error } = await query.limit(50)

  if (error) {
    console.error("Error fetching files for tracking:", error)
    return []
  }

  return (data || []) as unknown as FileForTracking[]
}

export async function getFileMovementHistory(fileId: string): Promise<FileMovement[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("file_movements")
    .select(`
      id,
      file_id,
      action,
      from_location,
      to_location,
      checked_out_to,
      purpose,
      notes,
      performed_at,
      performed_by
    `)
    .eq("file_id", fileId)
    .order("performed_at", { ascending: false })

  if (error) {
    console.error("Error fetching file movement history:", error)
    return []
  }

  return (data || []) as FileMovement[]
}

export async function checkOutFile(
  fileId: string,
  data: {
    checkedOutTo: string
    purpose: string
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current file info
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("file_reference, physical_location, status")
    .eq("id", fileId)
    .single()

  if (fileError || !file) {
    return { success: false, error: "File not found" }
  }

  if (file.status === "Missing") {
    return { success: false, error: "Cannot check out a missing file" }
  }

  // Get current user for performed_by
  const { data: { user } } = await supabase.auth.getUser()

  // Create movement record
  const { error: movementError } = await supabase
    .from("file_movements")
    .insert({
      file_id: fileId,
      action: "Check Out",
      from_location: file.physical_location,
      to_location: `Checked out to: ${data.checkedOutTo}`,
      checked_out_to: data.checkedOutTo,
      purpose: data.purpose,
      notes: data.notes || null,
      performed_by: user?.id ?? null,
      performed_at: new Date().toISOString(),
    })

  if (movementError) {
    console.error("Error creating movement:", movementError)
    return { success: false, error: movementError.message }
  }

  // Update file location
  const { error: updateError } = await supabase
    .from("files")
    .update({
      physical_location: `Checked out to: ${data.checkedOutTo}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fileId)

  if (updateError) {
    console.error("Error updating file:", updateError)
    return { success: false, error: updateError.message }
  }

  await logAction({
    action:       "movement.check_out",
    entity_type:  "movement",
    entity_id:    fileId,
    entity_label: file.file_reference,
    old_value:    file.physical_location ?? "Unknown location",
    new_value:    `Checked out to: ${data.checkedOutTo}`,
    metadata: {
      checked_out_to: data.checkedOutTo,
      purpose:        data.purpose,
      notes:          data.notes ?? null,
      from_location:  file.physical_location,
    },
  })

  return { success: true }
}

export async function checkInFile(
  fileId: string,
  data: {
    returnLocation: string
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current file info
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("file_reference, physical_location")
    .eq("id", fileId)
    .single()

  if (fileError || !file) {
    return { success: false, error: "File not found" }
  }

  // Get current user for performed_by
  const { data: { user } } = await supabase.auth.getUser()

  // Create movement record
  const { error: movementError } = await supabase
    .from("file_movements")
    .insert({
      file_id: fileId,
      action: "Check In",
      from_location: file.physical_location,
      to_location: data.returnLocation,
      checked_out_to: null,
      purpose: "File returned",
      notes: data.notes || null,
      performed_by: user?.id ?? null,
      performed_at: new Date().toISOString(),
    })

  if (movementError) {
    console.error("Error creating movement:", movementError)
    return { success: false, error: movementError.message }
  }

  // Update file location
  const { error: updateError } = await supabase
    .from("files")
    .update({
      physical_location: data.returnLocation,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fileId)

  if (updateError) {
    console.error("Error updating file:", updateError)
    return { success: false, error: updateError.message }
  }

  await logAction({
    action:       "movement.check_in",
    entity_type:  "movement",
    entity_id:    fileId,
    entity_label: file.file_reference,
    old_value:    file.physical_location ?? "Unknown location",
    new_value:    data.returnLocation,
    metadata: {
      return_location: data.returnLocation,
      notes:           data.notes ?? null,
      from_location:   file.physical_location,
    },
  })

  return { success: true }
}

export async function transferFile(
  fileId: string,
  data: {
    toLocation: string
    purpose: string
    notes?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Get current file info
  const { data: file, error: fileError } = await supabase
    .from("files")
    .select("file_reference, physical_location, status")
    .eq("id", fileId)
    .single()

  if (fileError || !file) {
    return { success: false, error: "File not found" }
  }

  if (file.status === "Missing") {
    return { success: false, error: "Cannot transfer a missing file" }
  }

  // Get current user for performed_by
  const { data: { user } } = await supabase.auth.getUser()

  // Create movement record
  const { error: movementError } = await supabase
    .from("file_movements")
    .insert({
      file_id: fileId,
      action: "Transfer",
      from_location: file.physical_location,
      to_location: data.toLocation,
      checked_out_to: null,
      purpose: data.purpose,
      notes: data.notes || null,
      performed_by: user?.id ?? null,
      performed_at: new Date().toISOString(),
    })

  if (movementError) {
    console.error("Error creating movement:", movementError)
    return { success: false, error: movementError.message }
  }

  // Update file location
  const { error: updateError } = await supabase
    .from("files")
    .update({
      physical_location: data.toLocation,
      updated_at: new Date().toISOString(),
    })
    .eq("id", fileId)

  if (updateError) {
    console.error("Error updating file:", updateError)
    return { success: false, error: updateError.message }
  }

  await logAction({
    action:       "movement.transfer",
    entity_type:  "movement",
    entity_id:    fileId,
    entity_label: file.file_reference,
    old_value:    file.physical_location ?? "Unknown location",
    new_value:    data.toLocation,
    metadata: {
      from_location: file.physical_location,
      to_location:   data.toLocation,
      purpose:       data.purpose,
      notes:         data.notes ?? null,
    },
  })

  return { success: true }
}