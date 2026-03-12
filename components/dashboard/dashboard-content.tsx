"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  FolderOpen,
  FileCheck,
  Archive,
  AlertTriangle,
  ArrowRightLeft,
  Clock,
  TrendingUp,
  RefreshCw,
} from "lucide-react"
import { getDashboardStats, type DashboardStats } from "@/app/actions"
import Link from "next/link"

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    const result = await getDashboardStats()
    if (result.error) {
      setError(result.error)
    } else {
      setStats(result.data)
      setError(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case "check_out":
        return "Checked Out"
      case "check_in":
        return "Checked In"
      case "transfer":
        return "Transferred"
      default:
        return action
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "check_out":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20"
      case "check_in":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      case "transfer":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      case "Archived":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20"
      case "Missing":
        return "bg-red-500/10 text-red-600 border-red-500/20"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Loading statistics...
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-8 w-8 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-16 mb-2" />
                <div className="h-3 bg-muted rounded w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-sm text-red-500 mt-1">Error: {error}</p>
          </div>
          <Button onClick={fetchStats} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your file management system
          </p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Files
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FolderOpen className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFiles || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registered in the system
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Files
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <FileCheck className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {stats?.activeFiles || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Archived Files
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Archive className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats?.archivedFiles || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              In archive storage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Missing Files
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.missingFiles || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Require attention
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Files Checked Out
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <ArrowRightLeft className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats?.filesCheckedOut || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently with staff members
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Files by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.filesByCategory.map((cat) => (
                <div key={cat.code} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {cat.name}
                    </Badge>
                    
                  </div>
                  <span className="text-sm font-medium">{cat.count}</span>
                </div>
              ))}
              {(!stats?.filesByCategory || stats.filesByCategory.length === 0) && (
                <p className="text-sm text-muted-foreground">No categories yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Files */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">Recent Files</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Latest registered files
              </p>
            </div>
            <Link href="/files">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {file.file_reference}
                      </span>
                      {file.category && (
                        <Badge variant="outline" className="text-xs">
                          {file.category.code}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {file.client_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(file.status)}>
                      {file.status}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDate(file.date_received)}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats?.recentFiles || stats.recentFiles.length === 0) && (
                <div className="text-center py-8">
                  <FolderOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No files registered yet</p>
                  <Link href="/register">
                    <Button variant="outline" size="sm" className="mt-3">
                      Register First File
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Movements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                Recent Activity
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                File movements and transfers
              </p>
            </div>
            <Link href="/tracking">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentMovements.map((movement) => (
                <div
                  key={movement.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className="h-8 w-8 rounded-full bg-background flex items-center justify-center flex-shrink-0">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {movement.file?.file_reference || "Unknown"}
                      </span>
                      <Badge className={getActionColor(movement.action)}>
                        {getActionLabel(movement.action)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {movement.action === "check_out" && movement.checked_out_to
                        ? `To: ${movement.checked_out_to}`
                        : movement.action === "transfer"
                        ? `${movement.from_location || "?"} → ${movement.to_location || "?"}`
                        : movement.to_location
                        ? `Returned to: ${movement.to_location}`
                        : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(movement.performed_at)}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats?.recentMovements || stats.recentMovements.length === 0) && (
                <div className="text-center py-8">
                  <ArrowRightLeft className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">No file movements yet</p>
                  <Link href="/tracking">
                    <Button variant="outline" size="sm" className="mt-3">
                      Go to Tracking
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Link href="/register">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                  <FolderOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Register File</div>
                  <div className="text-xs text-muted-foreground">
                    Add new file to system
                  </div>
                </div>
              </Button>
            </Link>
            <Link href="/files">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
              >
                <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-3">
                  <FileCheck className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Browse Files</div>
                  <div className="text-xs text-muted-foreground">
                    Search and filter files
                  </div>
                </div>
              </Button>
            </Link>
            <Link href="/tracking">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3">
                  <ArrowRightLeft className="h-5 w-5 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Track Files</div>
                  <div className="text-xs text-muted-foreground">
                    Check in/out files
                  </div>
                </div>
              </Button>
            </Link>
            <Link href="/reports">
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
              >
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mr-3">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">View Reports</div>
                  <div className="text-xs text-muted-foreground">
                    Analytics and exports
                  </div>
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
