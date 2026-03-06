"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowRightLeft,
  Search,
  LogOut,
  LogIn,
  MoveRight,
  History,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FolderOpen,
  Calendar,
  MapPin,
  User,
} from "lucide-react"
import {
  getFileMovements,
  getFilesForTracking,
  getFileMovementHistory,
  checkOutFile,
  checkInFile,
  transferFile,
  type FileMovement,
  type FileForTracking,
  type MovementsFilter,
} from "@/app/tracking/actions"

const actionLabels: Record<string, { label: string; color: string }> = {
  check_out: { label: "Check Out", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  check_in: { label: "Check In", color: "bg-green-500/10 text-green-600 border-green-200" },
  transfer: { label: "Transfer", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
}

export function FileTracking() {
  const [movements, setMovements] = useState<FileMovement[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [files, setFiles] = useState<FileForTracking[]>([])
  const [fileSearch, setFileSearch] = useState("")

  // Filters
  const [filters, setFilters] = useState<MovementsFilter>({})
  const [showFilters, setShowFilters] = useState(false)

  // Dialogs
  const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false)
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false)

  // Selected file for actions
  const [selectedFile, setSelectedFile] = useState<FileForTracking | null>(null)
  const [fileHistory, setFileHistory] = useState<FileMovement[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [checkOutForm, setCheckOutForm] = useState({
    checkedOutTo: "",
    purpose: "",
    notes: "",
  })
  const [checkInForm, setCheckInForm] = useState({
    returnLocation: "",
    notes: "",
  })
  const [transferForm, setTransferForm] = useState({
    toLocation: "",
    purpose: "",
    notes: "",
  })

  const loadMovements = useCallback(async () => {
    setIsLoading(true)
    const result = await getFileMovements(filters, currentPage, 10)
    setMovements(result.movements)
    setTotalCount(result.totalCount)
    setTotalPages(result.totalPages)
    setIsLoading(false)
  }, [filters, currentPage])

  const loadFiles = useCallback(async () => {
    const result = await getFilesForTracking(fileSearch || undefined)
    setFiles(result)
  }, [fileSearch])

  useEffect(() => {
    loadMovements()
  }, [loadMovements])

  useEffect(() => {
    loadFiles()
  }, [loadFiles])

  const handleCheckOut = async () => {
    if (!selectedFile || !checkOutForm.checkedOutTo || !checkOutForm.purpose) return

    setIsSubmitting(true)
    const result = await checkOutFile(selectedFile.id, checkOutForm)

    if (result.success) {
      setCheckOutDialogOpen(false)
      setSelectedFile(null)
      setCheckOutForm({ checkedOutTo: "", purpose: "", notes: "" })
      loadMovements()
      loadFiles()
    } else {
      alert(result.error || "Failed to check out file")
    }
    setIsSubmitting(false)
  }

  const handleCheckIn = async () => {
    if (!selectedFile || !checkInForm.returnLocation) return

    setIsSubmitting(true)
    const result = await checkInFile(selectedFile.id, checkInForm)

    if (result.success) {
      setCheckInDialogOpen(false)
      setSelectedFile(null)
      setCheckInForm({ returnLocation: "", notes: "" })
      loadMovements()
      loadFiles()
    } else {
      alert(result.error || "Failed to check in file")
    }
    setIsSubmitting(false)
  }

  const handleTransfer = async () => {
    if (!selectedFile || !transferForm.toLocation || !transferForm.purpose) return

    setIsSubmitting(true)
    const result = await transferFile(selectedFile.id, transferForm)

    if (result.success) {
      setTransferDialogOpen(false)
      setSelectedFile(null)
      setTransferForm({ toLocation: "", purpose: "", notes: "" })
      loadMovements()
      loadFiles()
    } else {
      alert(result.error || "Failed to transfer file")
    }
    setIsSubmitting(false)
  }

  const openHistory = async (file: FileForTracking) => {
    setSelectedFile(file)
    const history = await getFileMovementHistory(file.id)
    setFileHistory(history)
    setHistoryDialogOpen(true)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">File Tracking</h1>
          <p className="text-muted-foreground">Track file movements, check-ins and check-outs</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={() => setCheckOutDialogOpen(true)}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <LogOut className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Check Out</h3>
              <p className="text-sm text-muted-foreground">Remove file from storage</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={() => setCheckInDialogOpen(true)}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <LogIn className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Check In</h3>
              <p className="text-sm text-muted-foreground">Return file to storage</p>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50" onClick={() => setTransferDialogOpen(true)}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <MoveRight className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Transfer</h3>
              <p className="text-sm text-muted-foreground">Move file to new location</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movement History */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Movement History
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search movements..."
                  value={filters.search || ""}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                    setCurrentPage(1)
                  }}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Select
                  value={filters.action || "all"}
                  onValueChange={(value) => {
                    setFilters((prev) => ({ ...prev, action: value === "all" ? undefined : value }))
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="check_out">Check Out</SelectItem>
                    <SelectItem value="check_in">Check In</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date From</Label>
                <Input
                  type="date"
                  value={filters.dateFrom || ""}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, dateFrom: e.target.value || undefined }))
                    setCurrentPage(1)
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Date To</Label>
                <Input
                  type="date"
                  value={filters.dateTo || ""}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, dateTo: e.target.value || undefined }))
                    setCurrentPage(1)
                  }}
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowRightLeft className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-foreground">No movements found</h3>
              <p className="text-sm text-muted-foreground">File movements will appear here</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>File Reference</TableHead>
                      <TableHead className="hidden sm:table-cell">Client</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead className="hidden md:table-cell">From</TableHead>
                      <TableHead className="hidden md:table-cell">To</TableHead>
                      <TableHead className="hidden lg:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((movement) => {
                      const actionInfo = actionLabels[movement.action] || { label: movement.action, color: "bg-muted" }
                      return (
                        <TableRow key={movement.id}>
                          <TableCell className="font-medium">
                            {movement.file?.file_reference || "N/A"}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {movement.file?.client_name || "N/A"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={actionInfo.color}>
                              {actionInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {movement.from_location || "-"}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">
                            {movement.to_location || "-"}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">
                            {formatDate(movement.performed_at)}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Files for Tracking */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Files
            </CardTitle>
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-foreground">No files found</h3>
              <p className="text-sm text-muted-foreground">Register files to track them here</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {files.slice(0, 12).map((file) => (
                <div
                  key={file.id}
                  className="rounded-lg border p-4 transition-all hover:shadow-md hover:border-primary/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-foreground">{file.file_reference}</p>
                      <p className="text-sm text-muted-foreground">{file.client_name}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        file.status === "Active"
                          ? "bg-green-500/10 text-green-600 border-green-200"
                          : file.status === "Archived"
                          ? "bg-amber-500/10 text-amber-600 border-amber-200"
                          : "bg-red-500/10 text-red-600 border-red-200"
                      }
                    >
                      {file.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                    <MapPin className="h-3 w-3" />
                    {file.physical_location || "No location"}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openHistory(file)}
                  >
                    <History className="h-4 w-4 mr-2" />
                    View History
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Check Out Dialog */}
      <Dialog open={checkOutDialogOpen} onOpenChange={setCheckOutDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-amber-600" />
              Check Out File
            </DialogTitle>
            <DialogDescription>
              Remove a file from storage for use
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select File</Label>
              <Select
                value={selectedFile?.id || ""}
                onValueChange={(value) => {
                  const file = files.find((f) => f.id === value)
                  setSelectedFile(file || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a file" />
                </SelectTrigger>
                <SelectContent>
                  {files.filter(f => f.status !== "Missing").map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.file_reference} - {file.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Checked Out To <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Person or department receiving the file"
                value={checkOutForm.checkedOutTo}
                onChange={(e) => setCheckOutForm((prev) => ({ ...prev, checkedOutTo: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Purpose <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Reason for checking out"
                value={checkOutForm.purpose}
                onChange={(e) => setCheckOutForm((prev) => ({ ...prev, purpose: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes (optional)"
                value={checkOutForm.notes}
                onChange={(e) => setCheckOutForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckOutDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckOut}
              disabled={!selectedFile || !checkOutForm.checkedOutTo || !checkOutForm.purpose || isSubmitting}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
              Check Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check In Dialog */}
      <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-green-600" />
              Check In File
            </DialogTitle>
            <DialogDescription>
              Return a file to storage
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select File</Label>
              <Select
                value={selectedFile?.id || ""}
                onValueChange={(value) => {
                  const file = files.find((f) => f.id === value)
                  setSelectedFile(file || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a file" />
                </SelectTrigger>
                <SelectContent>
                  {files.map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.file_reference} - {file.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Return Location <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Shelf A-123, Cabinet B-456"
                value={checkInForm.returnLocation}
                onChange={(e) => setCheckInForm((prev) => ({ ...prev, returnLocation: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes (optional)"
                value={checkInForm.notes}
                onChange={(e) => setCheckInForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckInDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCheckIn}
              disabled={!selectedFile || !checkInForm.returnLocation || isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
              Check In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveRight className="h-5 w-5 text-blue-600" />
              Transfer File
            </DialogTitle>
            <DialogDescription>
              Move a file to a new location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select File</Label>
              <Select
                value={selectedFile?.id || ""}
                onValueChange={(value) => {
                  const file = files.find((f) => f.id === value)
                  setSelectedFile(file || null)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a file" />
                </SelectTrigger>
                <SelectContent>
                  {files.filter(f => f.status !== "Missing").map((file) => (
                    <SelectItem key={file.id} value={file.id}>
                      {file.file_reference} - {file.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedFile && (
              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="text-muted-foreground">Current Location:</p>
                <p className="font-medium">{selectedFile.physical_location || "No location set"}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>New Location <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g., Shelf A-123, Cabinet B-456"
                value={transferForm.toLocation}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, toLocation: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Purpose <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Reason for transfer"
                value={transferForm.purpose}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, purpose: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes (optional)"
                value={transferForm.notes}
                onChange={(e) => setTransferForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={!selectedFile || !transferForm.toLocation || !transferForm.purpose || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <MoveRight className="h-4 w-4 mr-2" />}
              Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Movement History
            </DialogTitle>
            {selectedFile && (
              <DialogDescription>
                {selectedFile.file_reference} - {selectedFile.client_name}
              </DialogDescription>
            )}
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto">
            {fileHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <History className="h-10 w-10 text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">No movement history found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fileHistory.map((movement, index) => {
                  const actionInfo = actionLabels[movement.action] || { label: movement.action, color: "bg-muted" }
                  return (
                    <div key={movement.id} className="relative pl-6 pb-3">
                      {index < fileHistory.length - 1 && (
                        <div className="absolute left-2 top-3 bottom-0 w-px bg-border" />
                      )}
                      <div className="absolute left-0 top-1 h-4 w-4 rounded-full border-2 border-background bg-primary" />
                      <div className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className={actionInfo.color}>
                            {actionInfo.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(movement.performed_at)}
                          </span>
                        </div>
                        <div className="grid gap-1 text-sm">
                          {movement.from_location && (
                            <p><span className="text-muted-foreground">From:</span> {movement.from_location}</p>
                          )}
                          {movement.to_location && (
                            <p><span className="text-muted-foreground">To:</span> {movement.to_location}</p>
                          )}
                          {movement.checked_out_to && (
                            <p><span className="text-muted-foreground">Checked out to:</span> {movement.checked_out_to}</p>
                          )}
                          {movement.purpose && (
                            <p><span className="text-muted-foreground">Purpose:</span> {movement.purpose}</p>
                          )}
                          {movement.notes && (
                            <p className="text-muted-foreground italic">{movement.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
