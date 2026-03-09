"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { FolderOpen, Search, Filter, MoreHorizontal, Eye, Pencil, Trash2, ChevronLeft, ChevronRight, Loader2, X, RefreshCw } from "lucide-react"
import { getFiles, deleteFile, updateFileStatus, type FileRecord, type FilesFilter } from "@/app/files/actions"
import { getCategories, getOfficers } from "@/app/register/actions"
import Link from "next/link"

const statusColors: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  Archived: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  Missing: "bg-red-500/10 text-red-500 border-red-500/20",
}

interface Category {
  id: string
  code: string
  name: string
}

interface Officer {
  id: string
  name: string
}

export function FilesList() {
  const [files, setFiles] = useState<FileRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [officers, setOfficers] = useState<Officer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [fileToDelete, setFileToDelete] = useState<FileRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const [filters, setFilters] = useState<FilesFilter>({
    search: "",
    category: "",
    status: "",
    officer: "",
    dateFrom: "",
    dateTo: "",
  })

  const pageSize = 10

  const loadFiles = useCallback(async () => {
    setIsLoading(true)
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "")
    ) as FilesFilter
    
    const result = await getFiles(cleanFilters, page, pageSize)
    setFiles(result.files)
    setTotalCount(result.totalCount)
    setTotalPages(result.totalPages)
    setIsLoading(false)
  }, [filters, page])

  useEffect(() => {
    async function loadInitialData() {
      const [categoriesData, officersData] = await Promise.all([
        getCategories(),
        getOfficers(),
      ])
      setCategories(categoriesData)
      setOfficers(officersData)
    }
    loadInitialData()
  }, [])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }))
    setPage(1)
  }

  const handleFilterChange = (key: keyof FilesFilter, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      category: "",
      status: "",
      officer: "",
      dateFrom: "",
      dateTo: "",
    })
    setPage(1)
  }

  const hasActiveFilters = Object.values(filters).some(v => v !== "")

  const handleDeleteClick = (file: FileRecord) => {
    setFileToDelete(file)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return
    
    setIsDeleting(true)
    const result = await deleteFile(fileToDelete.id)
    setIsDeleting(false)
    
    if (result.success) {
      setDeleteDialogOpen(false)
      setFileToDelete(null)
      loadFiles()
    }
  }

  const handleStatusChange = async (fileId: string, newStatus: string) => {
    await updateFileStatus(fileId, newStatus)
    loadFiles()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">Files Registry</CardTitle>
                <CardDescription className="text-muted-foreground">
                  {totalCount} {totalCount === 1 ? "file" : "files"} registered
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? "bg-primary/10" : ""}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {Object.values(filters).filter(v => v !== "").length}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={loadFiles}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Add File</Link>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by file reference, client name, or ID..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-background border-input"
            />
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4 animate-slide-in-up">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Filter Options</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Select
                  value={filters.category || "all"}
                  onValueChange={(v) => handleFilterChange("category", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.code} - {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.status || "all"}
                  onValueChange={(v) => handleFilterChange("status", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Archived">Archived</SelectItem>
                    <SelectItem value="Missing">Missing</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.officer || "all"}
                  onValueChange={(v) => handleFilterChange("officer", v === "all" ? "" : v)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Officer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Officers</SelectItem>
                    {officers.map((officer) => (
                      <SelectItem key={officer.id} value={officer.id}>
                        {officer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                    className="bg-background"
                    placeholder="From"
                  />
                  <Input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                    className="bg-background"
                    placeholder="To"
                  />
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
                  <TableHead className="font-semibold hidden lg:table-cell">Location</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Date Received</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32">
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading files...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : files.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <FolderOpen className="w-10 h-10 mb-2 opacity-50" />
                        <span>No files found</span>
                        {hasActiveFilters && (
                          <Button variant="link" size="sm" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  files.map((file) => (
                    <TableRow key={file.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium text-foreground">
                        {file.file_reference}
                      </TableCell>
                      <TableCell className="text-foreground">{file.client_name}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {file.category && (
                          <Badge variant="outline" className="font-normal">
                            {file.category.code}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {file.physical_location || "-"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">
                        {formatDate(file.date_received)}
                      </TableCell>
                      <TableCell>
                        <Badge className={`capitalize border ${statusColors[file.status] || ""}`}>
                          {file.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/files/${file.id}`} className="flex items-center">
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/files/${file.id}/edit`} className="flex items-center">
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(file.id, "Active")}
                              disabled={file.status === "Active"}
                            >
                              Mark as Active
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(file.id, "Archived")}
                              disabled={file.status === "Archived"}
                            >
                              Mark as Archived
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(file.id, "Missing")}
                              disabled={file.status === "Missing"}
                            >
                              Mark as Missing
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(file)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} files
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the file &quot;{fileToDelete?.file_reference}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}