"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  ChevronLeft, ChevronRight, Loader2, Search, RefreshCw,
  Shield, FileText, User, ArrowRight, Filter, X,
  Activity, Clock, FolderOpen, Users,
} from "lucide-react"
import { getAuditLogs, getAuditStats, type AuditLogRecord, type AuditFilter } from "@/app/audit/actions"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  "file.created":          { label: "File Created",       color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  "file.metadata_updated": { label: "Metadata Updated",   color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  "file.status_changed":   { label: "Status Changed",     color: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
  "file.officer_reassigned":{ label: "Officer Reassigned", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  "file.deleted":          { label: "File Deleted",       color: "bg-red-500/10 text-red-500 border-red-500/20" },
  "file.document_uploaded":{ label: "Document Uploaded",  color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20" },
  "movement.check_out":    { label: "Checked Out",        color: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  "movement.check_in":     { label: "Checked In",         color: "bg-teal-500/10 text-teal-500 border-teal-500/20" },
  "movement.transfer":     { label: "Transferred",        color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20" },
  "user.role_changed":     { label: "Role Changed",       color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  "user.activated":        { label: "User Activated",     color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  "user.deactivated":      { label: "User Deactivated",   color: "bg-red-500/10 text-red-500 border-red-500/20" },
  "user.supervisor_created":{ label: "Supervisor Created", color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
}

const ENTITY_ICON: Record<string, React.ElementType> = {
  file:     FileText,
  user:     User,
  movement: ArrowRight,
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-ZA", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  })
}

function formatTimeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60)    return "Just now"
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AuditLogContent() {
  const [logs,       setLogs]       = useState<AuditLogRecord[]>([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [page,       setPage]       = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [stats, setStats] = useState({
    totalActions: 0, todayActions: 0, fileActions: 0, userActions: 0,
  })

  const [filters, setFilters] = useState<AuditFilter>({
    search: "", action: "", entity_type: "", dateFrom: "", dateTo: "",
  })

  const pageSize = 20

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")) as AuditFilter
    const result = await getAuditLogs(clean, page, pageSize)
    setLogs(result.logs)
    setTotalCount(result.totalCount)
    setTotalPages(result.totalPages)
    setIsLoading(false)
  }, [filters, page])

  useEffect(() => { loadLogs() }, [loadLogs])

  useEffect(() => {
    getAuditStats().then(setStats)
  }, [])

  const handleFilterChange = (key: keyof AuditFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ search: "", action: "", entity_type: "", dateFrom: "", dateTo: "" })
    setPage(1)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== "")

  return (
    <div className="space-y-6">

      {/* ── Page header ── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Shield className="w-6 h-6 text-purple-500" />
          Audit Log
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Immutable record of all system actions — who did what, and when.
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Actions",  value: stats.totalActions,  icon: Activity,   color: "text-primary",       bg: "bg-primary/10" },
          { label: "Today",          value: stats.todayActions,  icon: Clock,      color: "text-amber-500",     bg: "bg-amber-500/10" },
          { label: "File Actions",   value: stats.fileActions,   icon: FolderOpen, color: "text-blue-500",      bg: "bg-blue-500/10" },
          { label: "User Actions",   value: stats.userActions,   icon: Users,      color: "text-purple-500",    bg: "bg-purple-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${bg}`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground">{value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Log table ── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Activity History</CardTitle>
              <CardDescription>{totalCount} entries recorded</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-primary/10" : ""}>
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {Object.values(filters).filter(v => v !== "").length}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={loadLogs}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by actor, file reference, or action..."
              value={filters.search}
              onChange={e => handleFilterChange("search", e.target.value)}
              className="pl-9 bg-background" />
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filter Options</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    <X className="w-3 h-3 mr-1" />Clear all
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Select value={filters.action || "all"}
                  onValueChange={v => handleFilterChange("action", v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Action type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="file.created">File Created</SelectItem>
                    <SelectItem value="file.metadata_updated">Metadata Updated</SelectItem>
                    <SelectItem value="file.status_changed">Status Changed</SelectItem>
                    <SelectItem value="file.officer_reassigned">Officer Reassigned</SelectItem>
                    <SelectItem value="file.deleted">File Deleted</SelectItem>
                    <SelectItem value="movement.check_out">Checked Out</SelectItem>
                    <SelectItem value="movement.check_in">Checked In</SelectItem>
                    <SelectItem value="movement.transfer">Transferred</SelectItem>
                    <SelectItem value="user.role_changed">Role Changed</SelectItem>
                    <SelectItem value="user.activated">User Activated</SelectItem>
                    <SelectItem value="user.deactivated">User Deactivated</SelectItem>
                    <SelectItem value="user.supervisor_created">Supervisor Created</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.entity_type || "all"}
                  onValueChange={v => handleFilterChange("entity_type", v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Entity type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="file">Files</SelectItem>
                    <SelectItem value="user">Users</SelectItem>
                    <SelectItem value="movement">Movements</SelectItem>
                  </SelectContent>
                </Select>

                <Input type="date" value={filters.dateFrom}
                  onChange={e => handleFilterChange("dateFrom", e.target.value)}
                  className="bg-background" placeholder="From date" />

                <Input type="date" value={filters.dateTo}
                  onChange={e => handleFilterChange("dateTo", e.target.value)}
                  className="bg-background" placeholder="To date" />
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Action</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Entity</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Change</TableHead>
                  <TableHead className="font-semibold">Performed By</TableHead>
                  <TableHead className="font-semibold text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32">
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading audit logs...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Activity className="w-10 h-10 mb-2 opacity-40" />
                        <p className="text-sm">No audit entries found</p>
                        {hasActiveFilters && (
                          <Button variant="link" size="sm" onClick={clearFilters}>Clear filters</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.map(log => {
                  const actionMeta  = ACTION_LABELS[log.action] ?? { label: log.action, color: "bg-muted text-muted-foreground border-border" }
                  const EntityIcon  = ENTITY_ICON[log.entity_type] ?? Activity

                  return (
                    <TableRow key={log.id} className="hover:bg-muted/30 align-top">
                      {/* Action badge */}
                      <TableCell className="py-3">
                        <Badge className={`text-xs border whitespace-nowrap ${actionMeta.color}`}>
                          {actionMeta.label}
                        </Badge>
                      </TableCell>

                      {/* Entity */}
                      <TableCell className="hidden md:table-cell py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                            <EntityIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground leading-tight">
                              {log.entity_label || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">{log.entity_type}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Change: old → new */}
                      <TableCell className="hidden lg:table-cell py-3">
                        {log.old_value || log.new_value ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs">
                              {log.old_value && (
                                <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-500 font-mono">
                                  {log.old_value}
                                </span>
                              )}
                              {log.old_value && log.new_value && (
                                <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                              )}
                              {log.new_value && (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono">
                                  {log.new_value}
                                </span>
                              )}
                            </div>
                            {/* Show purpose/recipient for movement entries */}
                            {log.entity_type === "movement" && typeof log.metadata?.purpose === "string" && (
                              <p className="text-[11px] text-muted-foreground">
                                Purpose: {log.metadata.purpose}
                              </p>
                            )}
                            {log.entity_type === "movement" && typeof log.metadata?.checked_out_to === "string" && (
                              <p className="text-[11px] text-muted-foreground">
                                To: {log.metadata.checked_out_to}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Actor */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <User className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <p className="text-sm text-foreground">{log.actor_name || "System"}</p>
                        </div>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell className="py-3 text-right">
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatTimeAgo(log.created_at)}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5 hidden sm:block">
                          {formatDateTime(log.created_at)}
                        </p>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}