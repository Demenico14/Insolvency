"use server"

import { createClient } from "@/lib/supabase/server"

export type DashboardStats = {
  totalFiles: number
  activeFiles: number
  archivedFiles: number
  missingFiles: number
  filesByCategory: { name: string; code: string; count: number }[]
  recentFiles: {
    id: string
    file_reference: string
    client_name: string
    category: { name: string; code: string } | null
    date_received: string
    status: string
  }[]
  recentMovements: {
    id: string
    action: string
    from_location: string | null
    to_location: string | null
    checked_out_to: string | null
    performed_at: string
    file: { file_reference: string; client_name: string } | null
  }[]
  filesCheckedOut: number
}

export async function getDashboardStats(): Promise<{
  data: DashboardStats | null
  error: string | null
}> {
  const supabase = await createClient()

  try {
    // Get total files count
    const { count: totalFiles, error: totalError } = await supabase
      .from("files")
      .select("*", { count: "exact", head: true })

    if (totalError) throw totalError

    // Get files by status
    const { data: statusData, error: statusError } = await supabase
      .from("files")
      .select("status")

    if (statusError) throw statusError

    const activeFiles = statusData?.filter((f) => f.status === "Active").length || 0
    const archivedFiles = statusData?.filter((f) => f.status === "Archived").length || 0
    const missingFiles = statusData?.filter((f) => f.status === "Missing").length || 0

    // Get categories with file counts
    const { data: categories, error: catError } = await supabase
      .from("categories")
      .select("id, name, code")
      .order("name")

    if (catError) throw catError

    const filesByCategory: { name: string; code: string; count: number }[] = []

    for (const cat of categories || []) {
      const { count, error: countError } = await supabase
        .from("files")
        .select("*", { count: "exact", head: true })
        .eq("category_id", cat.id)

      if (countError) throw countError

      filesByCategory.push({
        name: cat.name,
        code: cat.code,
        count: count || 0,
      })
    }

    // Get recent files
    const { data: recentFiles, error: recentError } = await supabase
      .from("files")
      .select(
        `
        id,
        file_reference,
        client_name,
        date_received,
        status,
        category:categories(name, code)
      `
      )
      .order("created_at", { ascending: false })
      .limit(5)

    if (recentError) throw recentError

    // Get recent movements
    const { data: recentMovements, error: movementsError } = await supabase
      .from("file_movements")
      .select(
        `
        id,
        action,
        from_location,
        to_location,
        checked_out_to,
        performed_at,
        file:files(file_reference, client_name)
      `
      )
      .order("performed_at", { ascending: false })
      .limit(10)

    if (movementsError) throw movementsError

    // Get count of checked out files
    const { data: checkedOutData, error: checkedOutError } = await supabase
      .from("file_movements")
      .select("file_id, action")
      .order("performed_at", { ascending: false })

    if (checkedOutError) throw checkedOutError

    // Calculate files currently checked out
    const fileLastActions = new Map<string, string>()
    for (const movement of checkedOutData || []) {
      if (!fileLastActions.has(movement.file_id)) {
        fileLastActions.set(movement.file_id, movement.action)
      }
    }
    const filesCheckedOut = Array.from(fileLastActions.values()).filter(
      (action) => action === "check_out"
    ).length

    return {
      data: {
        totalFiles: totalFiles || 0,
        activeFiles,
        archivedFiles,
        missingFiles,
        filesByCategory,
        recentFiles: (recentFiles || []).map((f) => ({
          ...f,
          category: Array.isArray(f.category) ? f.category[0] : f.category,
        })),
        recentMovements: (recentMovements || []).map((m) => ({
          ...m,
          file: Array.isArray(m.file) ? m.file[0] : m.file,
        })),
        filesCheckedOut,
      },
      error: null,
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return {
      data: null,
      error: error instanceof Error ? error.message : "Failed to fetch dashboard stats",
    }
  }
}
