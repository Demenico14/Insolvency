"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FolderOpen, Search, Filter, MoreHorizontal, Eye, Pencil, Trash2,
  ChevronLeft, ChevronRight, Loader2, X, RefreshCw, Download,
  FileText, FileIcon, ExternalLink, UserPlus, Lock,
} from "lucide-react"
import {
  getFiles, deleteFile, updateFileStatus, updateFileMetadata, reassignFileOfficer,
  removeFileDocument,
  type FileRecord, type FilesFilter, type FileMetadataUpdate,
} from "@/app/files/actions"
import { getCategories, getOfficers } from "@/app/register/actions"
import Link from "next/link"
import { useUserWithRole } from "@/lib/rbac/use-user-role"

// ─── Constants ────────────────────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  Active:   "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  Archived: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Missing:  "bg-red-500/10 text-red-500 border-red-500/20",
  Complete: "bg-blue-500/10 text-blue-500 border-blue-500/20",
}

// Category-specific field definitions: key → label
const CATEGORY_FIELDS: Record<string, { key: string; label: string; type?: string }[]> = {
  ADM: [
    { key: "nameOfDeceased",       label: "Name of Deceased" },
    { key: "referenceDetails",     label: "Reference Details" },
    { key: "sourcesOfFunds",       label: "Sources of Funds" },
    { key: "guardianName",         label: "Guardian Name" },
    { key: "guardianId",           label: "Guardian ID Number" },
    { key: "guardianContact",      label: "Guardian Contact Details" },
    { key: "dateOfFinalInheritance", label: "Date of Final Inheritance", type: "date" },
  ],
  CR: [
    { key: "companyName",          label: "Company Name" },
    { key: "registrationNumber",   label: "Registration Number" },
    { key: "practitionerDetails",  label: "Practitioner Details" },
    { key: "activity",             label: "Activity / Notes" },
  ],
  LC: [
    { key: "companyName",          label: "Company Name" },
    { key: "registrationNumber",   label: "Registration Number" },
    { key: "practitionerDetails",  label: "Practitioner Details" },
    { key: "activity",             label: "Activity / Notes" },
  ],
  LN: [
    { key: "personName",           label: "Name of Person" },
    { key: "idNumber",             label: "ID Number" },
    { key: "practitionerDetails",  label: "Practitioner Details" },
    { key: "activity",             label: "Activity / Notes" },
  ],
  CB: [
    { key: "hcNumber",             label: "HC Number" },
    { key: "dateOfApplication",    label: "Date of Receipt of Application", type: "date" },
    { key: "applicantName",        label: "Name of Applicant" },
    { key: "incapacitatedPerson",  label: "Name of Incapacitated Person" },
    { key: "proposedCurator",      label: "Proposed Curator" },
    { key: "mastersReportDate",    label: "Date of Master's Report Issuance", type: "date" },
    { key: "outcomeOfApplication", label: "Outcome of Application" },
    { key: "dateOfOutcome",        label: "Date of Outcome", type: "date" },
  ],
  CL: [
    { key: "hcNumber",             label: "HC Number" },
    { key: "dateOfApplication",    label: "Date of Receipt of Application", type: "date" },
    { key: "applicantName",        label: "Name of Applicant" },
    { key: "incapacitatedPerson",  label: "Name of Incapacitated Person" },
    { key: "proposedCurator",      label: "Proposed Curator" },
    { key: "mastersReportDate",    label: "Date of Master's Report Issuance", type: "date" },
    { key: "outcomeOfApplication", label: "Outcome of Application" },
    { key: "dateOfCollection",     label: "Date of Collection", type: "date" },
  ],
  MISC: [
    { key: "miscNumber",           label: "Misc Number" },
    { key: "documentType",         label: "Type of Document" },
    { key: "receivedFrom",         label: "Received From" },
    { key: "nameOfDeceased",       label: "Name of Deceased (if applicable)" },
    { key: "registrationNumber",   label: "Registration Number" },
    { key: "recordedBy",           label: "Details Recorded By" },
    { key: "subjectMatter",        label: "Subject Matter" },
    { key: "drNumber",             label: "DR Number" },
  ],
}

interface Category { id: string; code: string; name: string }
interface Officer  { id: string; name: string }

// ─── Document preview helper ───────────────────────────────────────────────────
function getFileType(url: string | null, filename: string | null) {
  const name = filename || url || ""
  const ext  = name.split(".").pop()?.toLowerCase() || ""
  if (ext === "pdf")                       return "pdf"
  if (["doc", "docx"].includes(ext))      return "word"
  if (["jpg","jpeg","png","gif","webp"].includes(ext)) return "image"
  return "other"
}

function DocumentViewer({ url, name }: { url: string; name: string | null }) {
  const type = getFileType(url, name)

  if (type === "pdf") return (
    <div className="w-full h-[600px]">
      <iframe
        src={`${url}#toolbar=1&navpanes=0`}
        className="w-full h-full border-0 rounded-lg"
        title={name || "Document"}
      />
    </div>
  )

  if (type === "image") return (
    <div className="flex items-center justify-center p-4 bg-muted/20 rounded-lg min-h-[300px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name || "Document"}
        className="max-w-full max-h-[560px] object-contain rounded-lg shadow"
      />
    </div>
  )

  if (type === "word") return (
    <div className="w-full h-[600px]">
      <iframe
        src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
        className="w-full h-full border-0 rounded-lg"
        title={name || "Document"}
      />
    </div>
  )

  // other / unknown
  return (
    <div className="p-10 text-center bg-muted/20 rounded-lg">
      <FileIcon className="w-12 h-12 mx-auto text-primary mb-3" />
      <p className="text-sm font-medium mb-1">{name}</p>
      <p className="text-xs text-muted-foreground">
        Preview not available for this file type — use Download or Open.
      </p>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FilesList() {
  const { isSupervisor, permissions } = useUserWithRole()

  const canEditAll  = permissions.includes("files:update_all") || isSupervisor
  const canDelete   = permissions.includes("files:delete")
  const canReassign = permissions.includes("files:reassign") || isSupervisor
  const canCreate   = permissions.includes("files:create")

  // ── Data ──────────────────────────────────────────────────────────────────
  const [files,      setFiles]      = useState<FileRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [officers,   setOfficers]   = useState<Officer[]>([])
  const [isLoading,  setIsLoading]  = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page,       setPage]       = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState<FilesFilter>({
    search: "", category: "", status: "", officer: "", dateFrom: "", dateTo: "",
  })
  const pageSize = 10

  // ── Sheet / Dialog states ──────────────────────────────────────────────────
  const [selectedFile,     setSelectedFile]     = useState<FileRecord | null>(null)
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete,     setFileToDelete]     = useState<FileRecord | null>(null)
  const [isDeleting,       setIsDeleting]       = useState(false)

  // Edit
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editFile,       setEditFile]       = useState<FileRecord | null>(null)
  const [editForm,       setEditForm]       = useState<FileMetadataUpdate>({
    client_name: "", registration_id: "", date_received: "",
    physical_location: "", status: "Active", category_id: "", notes: "",
    category_details: {},
  })
  const [isSaving,   setIsSaving]   = useState(false)
  const [editError,  setEditError]  = useState<string | null>(null)

  // Reassign
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [reassignFile,       setReassignFile]       = useState<FileRecord | null>(null)
  const [newOfficerId,       setNewOfficerId]       = useState("")
  const [isReassigning,      setIsReassigning]      = useState(false)
  const [reassignError,      setReassignError]      = useState<string | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────────
  const loadFiles = useCallback(async () => {
    setIsLoading(true)
    const clean = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== "")) as FilesFilter
    const result = await getFiles(clean, page, pageSize)
    setFiles(result.files)
    setTotalCount(result.totalCount)
    setTotalPages(result.totalPages)
    setIsLoading(false)
  }, [filters, page])

  useEffect(() => {
    Promise.all([getCategories(), getOfficers()]).then(([cats, offs]) => {
      setCategories(cats)
      setOfficers(offs)
    })
  }, [])

  useEffect(() => { loadFiles() }, [loadFiles])

  // ── Filters ────────────────────────────────────────────────────────────────
  const handleFilterChange = (key: keyof FilesFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }
  const clearFilters = () => {
    setFilters({ search: "", category: "", status: "", officer: "", dateFrom: "", dateTo: "" })
    setPage(1)
  }
  const hasActiveFilters = Object.values(filters).some(v => v !== "")

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return
    setIsDeleting(true)
    const result = await deleteFile(fileToDelete.id)
    setIsDeleting(false)
    if (result.success) { setDeleteDialogOpen(false); setFileToDelete(null); loadFiles() }
  }

  // ── Edit ───────────────────────────────────────────────────────────────────
  const openEditDialog = (file: FileRecord) => {
    setEditFile(file)
    setEditForm({
      client_name:       file.client_name,
      registration_id:   file.registration_id  ?? "",
      date_received:     file.date_received,
      physical_location: file.physical_location ?? "",
      status:            file.status,
      category_id:       file.category?.id     ?? "",
      notes:             file.notes            ?? "",
      category_details:  { ...(file.category_details ?? {}) },
    })
    setEditError(null)
    setEditDialogOpen(true)
  }

  const updateCategoryDetail = (key: string, value: string) => {
    setEditForm(prev => ({
      ...prev,
      category_details: { ...(prev.category_details ?? {}), [key]: value },
    }))
  }

  const handleSaveEdit = async () => {
    if (!editFile) return
    if (!editForm.client_name.trim()) { setEditError("Client name is required."); return }
    if (!editForm.date_received)      { setEditError("Date received is required."); return }
    setIsSaving(true)
    const result = await updateFileMetadata(editFile.id, editForm)
    setIsSaving(false)
    if (!result.success) { setEditError(result.error ?? "Failed to save."); return }
    setEditDialogOpen(false)
    if (detailsSheetOpen && selectedFile?.id === editFile.id) {
      setSelectedFile(prev => prev ? {
        ...prev,
        client_name:       editForm.client_name,
        registration_id:   editForm.registration_id   || null,
        date_received:     editForm.date_received,
        physical_location: editForm.physical_location || null,
        status:            editForm.status,
        notes:             editForm.notes             || null,
        category_details:  editForm.category_details  ?? null,
        category: categories.find(c => c.id === editForm.category_id) ?? prev.category,
      } : prev)
    }
    loadFiles()
  }

  // ── Reassign ───────────────────────────────────────────────────────────────
  const openReassignDialog = (file: FileRecord) => {
    setReassignFile(file)
    setNewOfficerId(file.officer?.id ?? "")
    setReassignError(null)
    setReassignDialogOpen(true)
  }

  const handleConfirmReassign = async () => {
    if (!reassignFile) return
    if (!newOfficerId) { setReassignError("Please select an officer."); return }
    setIsReassigning(true)
    const result = await reassignFileOfficer(reassignFile.id, newOfficerId)
    setIsReassigning(false)
    if (!result.success) { setReassignError(result.error ?? "Failed to reassign."); return }
    setReassignDialogOpen(false)
    loadFiles()
  }

  // ── Misc helpers ───────────────────────────────────────────────────────────
  const handleStatusChange = async (fileId: string, status: string) => {
    await updateFileStatus(fileId, status)
    loadFiles()
  }

  const formatDate = (s: string) =>
    new Date(s).toLocaleDateString("en-ZA", { year: "numeric", month: "short", day: "numeric" })

  const handleDownload = async (url: string, filename: string) => {
    try {
      const blob = await fetch(url).then(r => r.blob())
      const a = Object.assign(document.createElement("a"), {
        href: URL.createObjectURL(blob), download: filename,
      })
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(a.href)
    } catch (e) { console.error("Download failed", e) }
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header Card ── */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">Files Registry</CardTitle>
                <CardDescription>{totalCount} {totalCount === 1 ? "file" : "files"} registered</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-primary/10" : ""}>
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {Object.values(filters).filter(v => v !== "").length}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={loadFiles}><RefreshCw className="w-4 h-4" /></Button>
              {canCreate && <Button asChild size="sm"><Link href="/register">Add File</Link></Button>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by file reference, client name, or ID..."
              value={filters.search}
              onChange={e => handleFilterChange("search", e.target.value)}
              className="pl-9 bg-background border-input" />
          </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select value={filters.category || "all"} onValueChange={v => handleFilterChange("category", v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filters.status || "all"} onValueChange={v => handleFilterChange("status", v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                    <SelectItem value="Missing">Missing</SelectItem>
                    <SelectItem value="Complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.officer || "all"} onValueChange={v => handleFilterChange("officer", v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder="Officer" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Officers</SelectItem>
                    {officers.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input type="date" value={filters.dateFrom} onChange={e => handleFilterChange("dateFrom", e.target.value)} className="bg-background" />
                  <Input type="date" value={filters.dateTo}   onChange={e => handleFilterChange("dateTo",   e.target.value)} className="bg-background" />
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">File Reference</TableHead>
                  <TableHead className="font-semibold">Client Name</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Category</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Assigned Officer</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Date Received</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-32">
                    <div className="flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      <span className="ml-2 text-muted-foreground">Loading files...</span>
                    </div>
                  </TableCell></TableRow>
                ) : files.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-32">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <FolderOpen className="w-10 h-10 mb-2 opacity-50" />
                      <span>No files found</span>
                      {hasActiveFilters && <Button variant="link" size="sm" onClick={clearFilters}>Clear filters</Button>}
                    </div>
                  </TableCell></TableRow>
                ) : files.map(file => (
                  <TableRow key={file.id} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">{file.file_reference}</TableCell>
                    <TableCell className="text-foreground">{file.client_name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {file.category && <Badge variant="outline" className="font-normal">{file.category.code}</Badge>}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {file.officer?.name || <span className="italic text-muted-foreground/60">Unassigned</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{formatDate(file.date_received)}</TableCell>
                    <TableCell>
                      <Badge className={`capitalize border ${statusColors[file.status] || ""}`}>{file.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => { setSelectedFile(file); setDetailsSheetOpen(true) }}>
                            <Eye className="w-4 h-4 mr-2" />View Details
                          </DropdownMenuItem>
                          {canEditAll && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEditDialog(file)}>
                                <Pencil className="w-4 h-4 mr-2" />Edit Metadata
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(file.id, "Active")}   disabled={file.status === "Active"}>Mark as Active</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(file.id, "Archived")} disabled={file.status === "Archived"}>Mark as Archived</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(file.id, "Missing")}  disabled={file.status === "Missing"}>Mark as Missing</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(file.id, "Complete")} disabled={file.status === "Complete"}
                                className="text-blue-500 focus:text-blue-500">
                                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2 inline-block" />Mark as Complete
                              </DropdownMenuItem>
                            </>
                          )}
                          {canReassign && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openReassignDialog(file)}>
                                <UserPlus className="w-4 h-4 mr-2" />Reassign Officer
                              </DropdownMenuItem>
                            </>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => { setFileToDelete(file); setDeleteDialogOpen(true) }}
                                className="text-destructive focus:text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />Delete
                              </DropdownMenuItem>
                            </>
                          )}
                          {!canEditAll && !canDelete && !canReassign && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                <Lock className="w-4 h-4 mr-2" />Limited access
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="w-4 h-4" /></Button>
                <span className="text-sm text-muted-foreground px-2">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          VIEW DETAILS SHEET — tabbed: Details / Document
      ══════════════════════════════════════════════════════════════════════ */}
      <Sheet open={detailsSheetOpen} onOpenChange={setDetailsSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b border-border flex-shrink-0">
            <SheetTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <span className="text-lg">{selectedFile?.file_reference}</span>
                {selectedFile && (
                  <Badge className={`ml-3 capitalize border ${statusColors[selectedFile.status] || ""}`}>
                    {selectedFile.status}
                  </Badge>
                )}
              </div>
            </SheetTitle>
            <SheetDescription>{selectedFile?.client_name}</SheetDescription>
          </SheetHeader>

          <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
            <TabsList className="mx-6 mt-4 w-fit flex-shrink-0">
              <TabsTrigger value="details">File Details</TabsTrigger>
              <TabsTrigger value="document">
                Document
                {selectedFile?.document_url && (
                  <span className="ml-1.5 w-2 h-2 rounded-full bg-primary inline-block" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* ── Details Tab ── */}
            <TabsContent value="details" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-6">

                  {/* Core info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">File Information</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {([
                        ["File Reference",   selectedFile?.file_reference || "—"],
                        ["Client / Entity",  selectedFile?.client_name || "—"],
                        ["Category",         selectedFile?.category ? `${selectedFile.category.code} — ${selectedFile.category.name}` : "—"],
                        ["Registration ID",  selectedFile?.registration_id || "—"],
                        ["Date Received",    selectedFile?.date_received ? formatDate(selectedFile.date_received) : "—"],
                        ["Status",           selectedFile?.status || "—"],
                        ["Physical Location",selectedFile?.physical_location || "—"],
                        ["Assigned Officer", selectedFile?.officer?.name || "Unassigned"],
                        ["Registered On",    selectedFile?.created_at ? formatDate(selectedFile.created_at) : "—"],
                      ] as [string, string][]).map(([label, value]) => (
                        <div key={label} className="space-y-0.5">
                          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
                          <p className="text-sm text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedFile?.notes && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</h3>
                        <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/40 rounded-lg px-3 py-2">
                          {selectedFile.notes}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Category-specific details */}
                  {(() => {
                    const code = selectedFile?.category?.code
                    const fields = code ? CATEGORY_FIELDS[code] : null
                    const details = selectedFile?.category_details
                    if (!fields || !details) return null
                    const populated = fields.filter(f => details[f.key])
                    if (!populated.length) return null
                    return (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {selectedFile?.category?.name} Details
                          </h3>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                            {populated.map(f => (
                              <div key={f.key} className="space-y-0.5">
                                <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">{f.label}</p>
                                <p className="text-sm text-foreground">{details[f.key]}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Document Tab ── */}
            <TabsContent value="document" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-full">
                <div className="p-6 space-y-4">
                  {selectedFile?.document_url ? (
                    <>
                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm"
                          onClick={() => handleDownload(selectedFile.document_url!, selectedFile.document_name!)}>
                          <Download className="w-4 h-4 mr-2" />Download
                        </Button>
                        <Button variant="outline" size="sm"
                          onClick={() => window.open(selectedFile.document_url!, "_blank")}>
                          <ExternalLink className="w-4 h-4 mr-2" />Open in new tab
                        </Button>
                        {canEditAll && (
                          <Button variant="outline" size="sm"
                            className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={async () => {
                              if (!confirm(`Remove "${selectedFile.document_name}"? This cannot be undone.`)) return
                              const result = await removeFileDocument(selectedFile.id)
                              if (result.success) {
                                setSelectedFile(prev => prev ? { ...prev, document_url: null, document_name: null } : prev)
                                loadFiles()
                              }
                            }}>
                            <Trash2 className="w-4 h-4 mr-1" />Remove Document
                          </Button>
                        )}
                      </div>

                      {/* File name label */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 rounded-lg">
                        <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground truncate">{selectedFile.document_name}</span>
                        <Badge variant="outline" className="ml-auto text-xs flex-shrink-0">
                          {getFileType(selectedFile.document_url, selectedFile.document_name).toUpperCase()}
                        </Badge>
                      </div>

                      {/* Viewer */}
                      <DocumentViewer url={selectedFile.document_url} name={selectedFile.document_name} />
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                      <FileIcon className="w-14 h-14 text-muted-foreground/30 mb-4" />
                      <p className="text-sm font-medium text-foreground mb-1">No document attached</p>
                      <p className="text-xs text-muted-foreground">
                        Use Edit Metadata to upload a document to this file.
                      </p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="p-4 border-t border-border flex items-center justify-between bg-background flex-shrink-0">
            <div className="flex gap-2">
              {canEditAll && (
                <Button variant="outline" onClick={() => {
                  setDetailsSheetOpen(false)
                  if (selectedFile) openEditDialog(selectedFile)
                }}>
                  <Pencil className="w-4 h-4 mr-2" />Edit Metadata
                </Button>
              )}
              {canReassign && (
                <Button variant="outline" onClick={() => {
                  setDetailsSheetOpen(false)
                  if (selectedFile) openReassignDialog(selectedFile)
                }}>
                  <UserPlus className="w-4 h-4 mr-2" />Reassign
                </Button>
              )}
            </div>
            <Button variant="ghost" onClick={() => setDetailsSheetOpen(false)}>Close</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ══════════════════════════════════════════════════════════════════════
          EDIT METADATA DIALOG — core fields + category-specific fields
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-primary" />
              Edit File — {editFile?.file_reference}
            </DialogTitle>
            <DialogDescription>
              Edit all metadata for this file. Changes are saved immediately.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-2">
            <div className="space-y-5 py-2 px-1">

              {/* ── Core Fields ── */}
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Core Information</p>

                <div className="space-y-1.5">
                  <Label>Client / Entity Name <span className="text-destructive">*</span></Label>
                  <Input value={editForm.client_name}
                    onChange={e => setEditForm(p => ({ ...p, client_name: e.target.value }))}
                    placeholder="Client or company name" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Registration ID</Label>
                    <Input value={editForm.registration_id}
                      onChange={e => setEditForm(p => ({ ...p, registration_id: e.target.value }))}
                      placeholder="Optional" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date Received <span className="text-destructive">*</span></Label>
                    <Input type="date" value={editForm.date_received}
                      onChange={e => setEditForm(p => ({ ...p, date_received: e.target.value }))} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Select value={editForm.category_id || "none"}
                      onValueChange={v => setEditForm(p => ({ ...p, category_id: v === "none" ? "" : v }))}>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    <Select value={editForm.status}
                      onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Active">Active</SelectItem>
                        <SelectItem value="Archived">Archived</SelectItem>
                        <SelectItem value="Missing">Missing</SelectItem>
                        <SelectItem value="Complete">Complete</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Physical Location</Label>
                  <Input value={editForm.physical_location}
                    onChange={e => setEditForm(p => ({ ...p, physical_location: e.target.value }))}
                    placeholder="e.g. Shelf B-3, Cabinet 4" />
                </div>

                <div className="space-y-1.5">
                  <Label>Notes</Label>
                  <textarea value={editForm.notes}
                    onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Optional notes or remarks"
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
              </div>

              {/* ── Category-Specific Fields ── */}
              {(() => {
                const code = editFile?.category?.code
                const fields = code ? CATEGORY_FIELDS[code] : null
                if (!fields?.length) return null
                return (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        {editFile?.category?.name} Details
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        {fields.map(f => (
                          <div key={f.key} className="space-y-1.5">
                            <Label>{f.label}</Label>
                            <Input
                              type={f.type || "text"}
                              value={editForm.category_details?.[f.key] ?? ""}
                              onChange={e => updateCategoryDetail(f.key, e.target.value)}
                              placeholder={f.label}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )
              })()}

              {editError && (
                <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {editError}
                </p>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save All Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          REASSIGN OFFICER DIALOG
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />Reassign Officer
            </DialogTitle>
            <DialogDescription>
              Reassign <span className="font-medium text-foreground">{reassignFile?.file_reference}</span> to a different officer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {reassignFile?.officer && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 text-sm">
                <span className="text-muted-foreground">Currently assigned to</span>
                <span className="font-medium text-foreground">{reassignFile.officer.name}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>New Officer <span className="text-destructive">*</span></Label>
              <Select value={newOfficerId || "none"} onValueChange={v => setNewOfficerId(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select officer..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassign —</SelectItem>
                  {officers.map(o => (
                    <SelectItem key={o.id} value={o.id} disabled={o.id === reassignFile?.officer?.id}>
                      {o.name}{o.id === reassignFile?.officer?.id ? " (current)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {reassignError && (
              <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{reassignError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)} disabled={isReassigning}>Cancel</Button>
            <Button onClick={handleConfirmReassign} disabled={isReassigning || newOfficerId === reassignFile?.officer?.id}>
              {isReassigning ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reassigning...</> : "Confirm Reassign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION
      ══════════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{fileToDelete?.file_reference}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  )
}