"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  FolderOpen,
  Archive,
  AlertTriangle,
  ArrowRightLeft,
  Download,
  RefreshCw,
  Users,
  TrendingUp,
  FileSpreadsheet,
  Lock,
} from "lucide-react"
import { getReportData, type ReportPeriod, type ReportData } from "@/app/reports/actions"
import { useUserWithRole } from "@/lib/rbac/use-user-role"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts"

const COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"]

const statusColors: Record<string, string> = {
  "Active":   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  "Archived": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "Missing":  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  week: "Last Week", month: "Last Month", quarter: "Last Quarter",
  year: "Last Year", all: "All Time",
}

export function ReportsContent() {
  const [period,    setPeriod]    = useState<ReportPeriod>("all")
  const [data,      setData]      = useState<ReportData | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [exportingPdf,   setExportingPdf]   = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  const { isSupervisor, permissions } = useUserWithRole()
  const canViewAll    = permissions.includes('reports:read_all') || isSupervisor
  const canExport     = permissions.includes('reports:export')   || isSupervisor
  const hasRestricted = !canViewAll

  const loadData = useCallback(async () => {
    setLoading(true)
    const result = await getReportData(period)
    if (result.data) setData(result.data)
    setLoading(false)
  }, [period])

  useEffect(() => { loadData() }, [loadData])

  // ── PDF Export ─────────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    if (!data) return
    setExportingPdf(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const dateStr = new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })

      // ── Header ──
      doc.setFillColor(12, 20, 38)
      doc.rect(0, 0, pageW, 28, 'F')
      doc.setTextColor(240, 237, 230)
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('OFFICE OF THE MASTER OF HIGH COURT', pageW / 2, 11, { align: 'center' })
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Insolvency File & Records Management System', pageW / 2, 18, { align: 'center' })
      doc.setFontSize(8)
      doc.text(`Report Period: ${PERIOD_LABEL[period]}   |   Generated: ${dateStr}`, pageW / 2, 24, { align: 'center' })

      doc.setTextColor(30, 30, 30)
      let y = 36

      // ── Summary ──
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('SUMMARY', 14, y); y += 6

      autoTable(doc, {
        startY: y,
        head: [['Metric', 'Count']],
        body: [
          ['Total Files',           String(data.summary.totalFiles)],
          ['Active Files',          String(data.summary.activeFiles)],
          ['Archived Files',        String(data.summary.archivedFiles)],
          ['Missing Files',         String(data.summary.missingFiles)],
          ['Total Movements',       String(data.summary.totalMovements)],
          ['Currently Checked Out', String(data.summary.checkedOutFiles)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [12, 20, 38], textColor: [240, 237, 230], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
      })
      y = (doc as any).lastAutoTable.finalY + 10

      // ── Files by Category ──
      doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text('FILES BY CATEGORY', 14, y); y += 6

      autoTable(doc, {
        startY: y,
        head: [['Category', 'Code', 'Count']],
        body: data.filesByCategory.map(c => [c.category, c.code, String(c.count)]),
        theme: 'grid',
        headStyles: { fillColor: [12, 20, 38], textColor: [240, 237, 230], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
      })
      y = (doc as any).lastAutoTable.finalY + 10

      // ── Files by Officer ──
      doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text('FILES BY ASSIGNED OFFICER', 14, y); y += 6

      autoTable(doc, {
        startY: y,
        head: [['Officer', 'Department', 'Files Assigned']],
        body: data.filesByOfficer.map(o => [o.officer, o.department, String(o.count)]),
        theme: 'grid',
        headStyles: { fillColor: [12, 20, 38], textColor: [240, 237, 230], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
      })
      y = (doc as any).lastAutoTable.finalY + 10

      // ── Recent Files ── (new page if needed)
      if (y > 220) { doc.addPage(); y = 20 }
      doc.setFontSize(11); doc.setFont('helvetica', 'bold')
      doc.text('RECENTLY REGISTERED FILES', 14, y); y += 6

      autoTable(doc, {
        startY: y,
        head: [['File Reference', 'Client Name', 'Category', 'Date Received', 'Status']],
        body: data.recentFiles.map(f => [
          f.file_reference, f.client_name, f.category,
          new Date(f.date_received).toLocaleDateString('en-ZA'), f.status,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [12, 20, 38], textColor: [240, 237, 230], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        margin: { left: 14, right: 14 },
      })

      // ── Footer on every page ──
      const pageCount = (doc.internal as any).getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setTextColor(150)
        doc.text(
          `Insolvency File & Records Management System  |  Page ${i} of ${pageCount}  |  CONFIDENTIAL`,
          pageW / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        )
      }

      doc.save(`insolvency-report-${period}-${new Date().toISOString().split('T')[0]}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
    }
    setExportingPdf(false)
  }

  // ── Excel Export ───────────────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (!data) return
    setExportingExcel(true)
    try {
      const XLSX = await import('xlsx')

      const wb = XLSX.utils.book_new()

      // Summary sheet
      const summaryRows = [
        ['INSOLVENCY FILE & RECORDS MANAGEMENT SYSTEM'],
        [`Report Period: ${PERIOD_LABEL[period]}`],
        [`Generated: ${new Date().toLocaleDateString('en-ZA')}`],
        [],
        ['SUMMARY'],
        ['Metric', 'Count'],
        ['Total Files',           data.summary.totalFiles],
        ['Active Files',          data.summary.activeFiles],
        ['Archived Files',        data.summary.archivedFiles],
        ['Missing Files',         data.summary.missingFiles],
        ['Total Movements',       data.summary.totalMovements],
        ['Currently Checked Out', data.summary.checkedOutFiles],
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), 'Summary')

      // Files by Category
      const catRows = [
        ['FILES BY CATEGORY'],
        ['Category', 'Code', 'Count'],
        ...data.filesByCategory.map(c => [c.category, c.code, c.count]),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), 'By Category')

      // Files by Status
      const statusRows = [
        ['FILES BY STATUS'],
        ['Status', 'Count'],
        ...data.filesByStatus.map(s => [s.status, s.count]),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(statusRows), 'By Status')

      // Files by Officer
      const officerRows = [
        ['FILES BY ASSIGNED OFFICER'],
        ['Officer', 'Department', 'Files Assigned'],
        ...data.filesByOfficer.map(o => [o.officer, o.department, o.count]),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(officerRows), 'By Officer')

      // Movement Activity
      const movRows = [
        ['MOVEMENT ACTIVITY'],
        ['Action', 'Count'],
        ...data.movementsByAction.map(m => [m.action, m.count]),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(movRows), 'Movements')

      // Monthly Trends
      const trendRows = [
        ['MONTHLY TRENDS (LAST 6 MONTHS)'],
        ['Month', 'Files Registered', 'Movements'],
        ...data.monthlyTrends.map(t => [t.month, t.registered, t.movements]),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(trendRows), 'Monthly Trends')

      // Recent Files
      const recentRows = [
        ['RECENTLY REGISTERED FILES'],
        ['File Reference', 'Client Name', 'Category', 'Date Received', 'Status'],
        ...data.recentFiles.map(f => [
          f.file_reference, f.client_name, f.category,
          new Date(f.date_received).toLocaleDateString('en-ZA'), f.status,
        ]),
      ]
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recentRows), 'Recent Files')

      XLSX.writeFile(wb, `insolvency-report-${period}-${new Date().toISOString().split('T')[0]}.xlsx`)
    } catch (err) {
      console.error('Excel export failed:', err)
    }
    setExportingExcel(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground mt-1">Analytics and statistics overview</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as ReportPeriod)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {canExport ? (
            <div className="flex items-center gap-2">
              <Button onClick={handleExportPdf} disabled={exportingPdf || !data} variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                {exportingPdf ? "Generating..." : "Export PDF"}
              </Button>
              <Button onClick={handleExportExcel} disabled={exportingExcel || !data}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {exportingExcel ? "Generating..." : "Export Excel"}
              </Button>
            </div>
          ) : (
            <Button variant="outline" disabled className="cursor-not-allowed">
              <Lock className="w-4 h-4 mr-2" />
              Export (Supervisor Only)
            </Button>
          )}
        </div>
      </div>

      {/* Restricted Access Banner for General Users */}
      {hasRestricted && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Lock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Limited Report Access</p>
                <p className="text-xs text-muted-foreground">
                  You have access to basic statistics. Contact a supervisor for comprehensive reports and export capabilities.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-primary/10">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Files</p>
                    <p className="text-2xl font-bold text-foreground">{data.summary.totalFiles}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-emerald-500/10">
                    <FolderOpen className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Files</p>
                    <p className="text-2xl font-bold text-foreground">{data.summary.activeFiles}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-amber-500/10">
                    <Archive className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Archived Files</p>
                    <p className="text-2xl font-bold text-foreground">{data.summary.archivedFiles}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-red-500/10">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Missing Files</p>
                    <p className="text-2xl font-bold text-foreground">{data.summary.missingFiles}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <ArrowRightLeft className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Movements</p>
                    <p className="text-2xl font-bold text-foreground">{data.summary.totalMovements}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/10">
                    <Users className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Currently Checked Out</p>
                    <p className="text-2xl font-bold text-foreground">{data.summary.checkedOutFiles}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Files by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Files by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {data.filesByCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={data.filesByCategory} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="code" type="category" width={60} className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        formatter={(value, name, props) => [value, props.payload.category]}
                      />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Files by Status - Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Files by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {data.filesByStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.filesByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ status, percent }) => `${status} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {data.filesByStatus.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.status === "Active" ? "#22c55e" : 
                              entry.status === "Archived" ? "#f59e0b" : 
                              entry.status === "Missing" ? "#ef4444" : 
                              COLORS[index % COLORS.length]
                            } 
                          />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trends */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Monthly Trends (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.monthlyTrends.some(t => t.registered > 0 || t.movements > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.monthlyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "hsl(var(--card))", 
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px"
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="registered" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--primary))" }}
                      name="Files Registered"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="movements" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: "#3b82f6" }}
                      name="File Movements"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Files by Officer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Files by Assigned Officer</CardTitle>
              </CardHeader>
              <CardContent>
                {data.filesByOfficer.length > 0 ? (
                  <div className="space-y-3">
                    {data.filesByOfficer.slice(0, 8).map((officer, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{officer.officer}</p>
                          <p className="text-xs text-muted-foreground">{officer.department}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${(officer.count / data.summary.totalFiles) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground w-8 text-right">{officer.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                    No officer data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Movement Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Movement Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {data.movementsByAction.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.movementsByAction}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="action" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))", 
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {data.movementsByAction.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={
                              entry.action === "Check In" ? "#22c55e" : 
                              entry.action === "Check Out" ? "#f59e0b" : 
                              "#3b82f6"
                            } 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    No movement data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Files Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recently Registered Files</CardTitle>
            </CardHeader>
            <CardContent>
              {data.recentFiles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Reference</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead className="hidden md:table-cell">Category</TableHead>
                      <TableHead className="hidden sm:table-cell">Date Received</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentFiles.map((file, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{file.file_reference}</TableCell>
                        <TableCell>{file.client_name}</TableCell>
                        <TableCell className="hidden md:table-cell">{file.category}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {new Date(file.date_received).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={statusColors[file.status] || ""}>
                            {file.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No files registered yet
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Failed to load report data. Please try again.
          </CardContent>
        </Card>
      )}
    </div>
  )
}