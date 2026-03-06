"use server"

import { createClient } from "@/lib/supabase/server"

export type ReportPeriod = "week" | "month" | "quarter" | "year" | "all"

export interface FilesByCategory {
  category: string
  code: string
  count: number
}

export interface FilesByStatus {
  status: string
  count: number
}

export interface FilesByOfficer {
  officer: string
  department: string
  count: number
}

export interface MovementsByAction {
  action: string
  count: number
}

export interface MonthlyTrend {
  month: string
  registered: number
  movements: number
}

export interface ReportData {
  summary: {
    totalFiles: number
    activeFiles: number
    archivedFiles: number
    missingFiles: number
    totalMovements: number
    checkedOutFiles: number
  }
  filesByCategory: FilesByCategory[]
  filesByStatus: FilesByStatus[]
  filesByOfficer: FilesByOfficer[]
  movementsByAction: MovementsByAction[]
  monthlyTrends: MonthlyTrend[]
  recentFiles: {
    file_reference: string
    client_name: string
    category: string
    date_received: string
    status: string
  }[]
}

function getDateFilter(period: ReportPeriod): Date | null {
  const now = new Date()
  switch (period) {
    case "week":
      return new Date(now.setDate(now.getDate() - 7))
    case "month":
      return new Date(now.setMonth(now.getMonth() - 1))
    case "quarter":
      return new Date(now.setMonth(now.getMonth() - 3))
    case "year":
      return new Date(now.setFullYear(now.getFullYear() - 1))
    case "all":
    default:
      return null
  }
}

export async function getReportData(period: ReportPeriod = "all"): Promise<{ data: ReportData | null; error: string | null }> {
  const supabase = await createClient()
  const dateFilter = getDateFilter(period)

  try {
    // Get all files with category info
    let filesQuery = supabase
      .from("files")
      .select("id, file_reference, client_name, status, date_received, category_id, assigned_officer_id, categories(name, code)")
    
    if (dateFilter) {
      filesQuery = filesQuery.gte("date_received", dateFilter.toISOString().split("T")[0])
    }

    const { data: files, error: filesError } = await filesQuery

    if (filesError) {
      console.error("Error fetching files:", filesError)
      return { data: null, error: filesError.message }
    }

    // Get all movements
    let movementsQuery = supabase
      .from("file_movements")
      .select("id, action, performed_at, file_id")

    if (dateFilter) {
      movementsQuery = movementsQuery.gte("performed_at", dateFilter.toISOString())
    }

    const { data: movements, error: movementsError } = await movementsQuery

    if (movementsError) {
      console.error("Error fetching movements:", movementsError)
      return { data: null, error: movementsError.message }
    }

    // Get officers
    const { data: officers, error: officersError } = await supabase
      .from("officers")
      .select("id, name, department")

    if (officersError) {
      console.error("Error fetching officers:", officersError)
      return { data: null, error: officersError.message }
    }

    const officersMap = new Map(officers?.map(o => [o.id, o]) || [])

    // Calculate summary stats
    const totalFiles = files?.length || 0
    const activeFiles = files?.filter(f => f.status === "Active").length || 0
    const archivedFiles = files?.filter(f => f.status === "Archived").length || 0
    const missingFiles = files?.filter(f => f.status === "Missing").length || 0
    const totalMovements = movements?.length || 0

    // Count checked out files (files with checkout but no subsequent checkin)
    const fileMovementMap = new Map<string, string>()
    movements?.sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime())
      .forEach(m => {
        fileMovementMap.set(m.file_id, m.action)
      })
    const checkedOutFiles = Array.from(fileMovementMap.values()).filter(action => action === "check_out").length

    // Files by category
    const categoryCount = new Map<string, { name: string; code: string; count: number }>()
    files?.forEach(f => {
      const cat = f.categories as { name: string; code: string } | null
      if (cat) {
        const existing = categoryCount.get(cat.code) || { name: cat.name, code: cat.code, count: 0 }
        existing.count++
        categoryCount.set(cat.code, existing)
      }
    })
    const filesByCategory: FilesByCategory[] = Array.from(categoryCount.values())
      .map(c => ({ category: c.name, code: c.code, count: c.count }))
      .sort((a, b) => b.count - a.count)

    // Files by status
    const statusCount = new Map<string, number>()
    files?.forEach(f => {
      statusCount.set(f.status, (statusCount.get(f.status) || 0) + 1)
    })
    const filesByStatus: FilesByStatus[] = Array.from(statusCount.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    // Files by officer
    const officerCount = new Map<string, { name: string; department: string; count: number }>()
    files?.forEach(f => {
      if (f.assigned_officer_id) {
        const officer = officersMap.get(f.assigned_officer_id)
        if (officer) {
          const existing = officerCount.get(f.assigned_officer_id) || { name: officer.name, department: officer.department || "Unknown", count: 0 }
          existing.count++
          officerCount.set(f.assigned_officer_id, existing)
        }
      }
    })
    const filesByOfficer: FilesByOfficer[] = Array.from(officerCount.values())
      .map(o => ({ officer: o.name, department: o.department, count: o.count }))
      .sort((a, b) => b.count - a.count)

    // Movements by action
    const actionCount = new Map<string, number>()
    movements?.forEach(m => {
      const actionLabel = m.action === "check_in" ? "Check In" : m.action === "check_out" ? "Check Out" : "Transfer"
      actionCount.set(actionLabel, (actionCount.get(actionLabel) || 0) + 1)
    })
    const movementsByAction: MovementsByAction[] = Array.from(actionCount.entries())
      .map(([action, count]) => ({ action, count }))

    // Monthly trends (last 6 months)
    const monthlyTrends: MonthlyTrend[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" })
      
      const registered = files?.filter(f => {
        const d = new Date(f.date_received)
        return d >= monthDate && d <= monthEnd
      }).length || 0

      const monthMovements = movements?.filter(m => {
        const d = new Date(m.performed_at)
        return d >= monthDate && d <= monthEnd
      }).length || 0

      monthlyTrends.push({ month: monthLabel, registered, movements: monthMovements })
    }

    // Recent files
    const recentFiles = files
      ?.sort((a, b) => new Date(b.date_received).getTime() - new Date(a.date_received).getTime())
      .slice(0, 10)
      .map(f => ({
        file_reference: f.file_reference,
        client_name: f.client_name,
        category: (f.categories as { name: string } | null)?.name || "Unknown",
        date_received: f.date_received,
        status: f.status
      })) || []

    return {
      data: {
        summary: {
          totalFiles,
          activeFiles,
          archivedFiles,
          missingFiles,
          totalMovements,
          checkedOutFiles
        },
        filesByCategory,
        filesByStatus,
        filesByOfficer,
        movementsByAction,
        monthlyTrends,
        recentFiles
      },
      error: null
    }
  } catch (err) {
    console.error("Error generating report:", err)
    return { data: null, error: "Failed to generate report" }
  }
}

export async function exportReportCSV(period: ReportPeriod = "all"): Promise<{ data: string | null; error: string | null }> {
  const { data, error } = await getReportData(period)
  
  if (error || !data) {
    return { data: null, error: error || "No data available" }
  }

  // Generate CSV content
  let csv = "INSOLVENCY FILE & RECORDS MANAGEMENT SYSTEM - REPORT\n"
  csv += `Generated: ${new Date().toLocaleDateString()}\n`
  csv += `Period: ${period === "all" ? "All Time" : period.charAt(0).toUpperCase() + period.slice(1)}\n\n`

  csv += "SUMMARY\n"
  csv += `Total Files,${data.summary.totalFiles}\n`
  csv += `Active Files,${data.summary.activeFiles}\n`
  csv += `Archived Files,${data.summary.archivedFiles}\n`
  csv += `Missing Files,${data.summary.missingFiles}\n`
  csv += `Total Movements,${data.summary.totalMovements}\n`
  csv += `Currently Checked Out,${data.summary.checkedOutFiles}\n\n`

  csv += "FILES BY CATEGORY\n"
  csv += "Category,Code,Count\n"
  data.filesByCategory.forEach(c => {
    csv += `${c.category},${c.code},${c.count}\n`
  })
  csv += "\n"

  csv += "FILES BY STATUS\n"
  csv += "Status,Count\n"
  data.filesByStatus.forEach(s => {
    csv += `${s.status},${s.count}\n`
  })
  csv += "\n"

  csv += "FILES BY OFFICER\n"
  csv += "Officer,Department,Count\n"
  data.filesByOfficer.forEach(o => {
    csv += `${o.officer},${o.department},${o.count}\n`
  })
  csv += "\n"

  csv += "MOVEMENT ACTIVITY\n"
  csv += "Action,Count\n"
  data.movementsByAction.forEach(m => {
    csv += `${m.action},${m.count}\n`
  })

  return { data: csv, error: null }
}
