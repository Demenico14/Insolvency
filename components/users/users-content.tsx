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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Users,
  Search,
  Filter,
  MoreHorizontal,
  Shield,
  User,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
  RefreshCw,
} from "lucide-react"
import {
  getUsers,
  updateUserRole,
  toggleUserStatus,
  getUserStats,
  getRoles,
  type UserRecord,
  type UsersFilter,
} from "@/app/users/actions"
import { RoleName } from "@/lib/rbac/types"
import { useUserWithRole } from "@/lib/rbac/use-user-role"

const roleColors: Record<string, string> = {
  supervisor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  general_user: "bg-blue-500/10 text-blue-500 border-blue-500/20",
}

const roleIcons: Record<string, React.ElementType> = {
  supervisor: Shield,
  general_user: User,
}

export function UsersContent() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [showFilters, setShowFilters] = useState(false)
  const [roles, setRoles] = useState<{ id: string; name: string; description: string }[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    supervisors: 0,
    generalUsers: 0,
  })

  const [filters, setFilters] = useState<UsersFilter>({
    search: "",
    role: "",
    status: "",
  })

  // Dialog states
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [newRole, setNewRole] = useState<RoleName>("general_user")
  const [isUpdating, setIsUpdating] = useState(false)

  const { user: currentUser } = useUserWithRole()
  const pageSize = 10

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "")
    ) as UsersFilter

    const [usersResult, statsResult] = await Promise.all([
      getUsers(cleanFilters, page, pageSize),
      getUserStats(),
    ])

    setUsers(usersResult.users)
    setTotalCount(usersResult.totalCount)
    setTotalPages(usersResult.totalPages)
    setStats(statsResult)
    setIsLoading(false)
  }, [filters, page])

  useEffect(() => {
    async function loadRoles() {
      const rolesData = await getRoles()
      setRoles(rolesData)
    }
    loadRoles()
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const handleSearch = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }))
    setPage(1)
  }

  const handleFilterChange = (key: keyof UsersFilter, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const clearFilters = () => {
    setFilters({ search: "", role: "", status: "" })
    setPage(1)
  }

  const hasActiveFilters = Object.values(filters).some((v) => v !== "")

  const handleRoleChangeClick = (user: UserRecord) => {
    setSelectedUser(user)
    setNewRole(user.role_name)
    setRoleDialogOpen(true)
  }

  const handleConfirmRoleChange = async () => {
    if (!selectedUser) return

    setIsUpdating(true)
    const result = await updateUserRole(selectedUser.id, newRole)
    setIsUpdating(false)

    if (result.success) {
      setRoleDialogOpen(false)
      setSelectedUser(null)
      loadUsers()
    }
  }

  const handleStatusToggleClick = (user: UserRecord) => {
    setSelectedUser(user)
    setStatusDialogOpen(true)
  }

  const handleConfirmStatusToggle = async () => {
    if (!selectedUser) return

    setIsUpdating(true)
    const result = await toggleUserStatus(selectedUser.id)
    setIsUpdating(false)

    if (result.success) {
      setStatusDialogOpen(false)
      setSelectedUser(null)
      loadUsers()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getRoleDisplayName = (role: RoleName) => {
    return role === "supervisor" ? "Supervisor" : "General User"
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <UserCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.activeUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Shield className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supervisors</p>
                <p className="text-2xl font-bold text-foreground">{stats.supervisors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <User className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">General Users</p>
                <p className="text-2xl font-bold text-foreground">{stats.generalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User List Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">User Management</CardTitle>
                <CardDescription className="text-muted-foreground">
                  Manage user roles and access permissions
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
                    {Object.values(filters).filter((v) => v !== "").length}
                  </Badge>
                )}
              </Button>
              <Button variant="outline" size="sm" onClick={loadUsers}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or department..."
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 bg-background border-input"
            />
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="p-4 rounded-lg border border-border bg-muted/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Filter Options</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select value={filters.role || "all"} onValueChange={(v) => handleFilterChange("role", v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="general_user">General User</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.status || "all"} onValueChange={(v) => handleFilterChange("status", v === "all" ? "" : v)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">User</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Department</TableHead>
                  <TableHead className="font-semibold">Role</TableHead>
                  <TableHead className="font-semibold hidden sm:table-cell">Status</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Joined</TableHead>
                  <TableHead className="font-semibold w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32">
                      <div className="flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="ml-2 text-muted-foreground">Loading users...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32">
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Users className="w-10 h-10 mb-2 opacity-50" />
                        <span>No users found</span>
                        {hasActiveFilters && (
                          <Button variant="link" size="sm" onClick={clearFilters}>
                            Clear filters
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const RoleIcon = roleIcons[user.role_name] || User
                    const isCurrentUser = currentUser?.id === user.id

                    return (
                      <TableRow key={user.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <RoleIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {user.first_name || user.last_name
                                  ? `${user.first_name || ""} ${user.last_name || ""}`.trim()
                                  : "Unnamed User"}
                                {isCurrentUser && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    You
                                  </Badge>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {user.department || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={`capitalize border ${roleColors[user.role_name] || ""}`}>
                            {getRoleDisplayName(user.role_name)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant={user.is_active ? "default" : "secondary"} className={user.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-gray-500/10 text-gray-500 border-gray-500/20"}>
                            {user.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">
                          {formatDate(user.created_at)}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isCurrentUser}>
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRoleChangeClick(user)}>
                                <Shield className="w-4 h-4 mr-2" />
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleStatusToggleClick(user)}>
                                {user.is_active ? (
                                  <>
                                    <UserX className="w-4 h-4 mr-2" />
                                    Deactivate User
                                  </>
                                ) : (
                                  <>
                                    <UserCheck className="w-4 h-4 mr-2" />
                                    Activate User
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} users
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {page} of {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Change the role for {selectedUser?.first_name || selectedUser?.last_name
                ? `${selectedUser?.first_name || ""} ${selectedUser?.last_name || ""}`.trim()
                : "this user"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select New Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as RoleName)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general_user">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      General User
                    </div>
                  </SelectItem>
                  <SelectItem value="supervisor">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Supervisor
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="font-medium mb-1">Role Permissions:</p>
              {newRole === "supervisor" ? (
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>View and manage all files</li>
                  <li>Edit and delete any file</li>
                  <li>Reassign files between users</li>
                  <li>Access comprehensive reports</li>
                  <li>Export reports</li>
                  <li>Manage user accounts</li>
                </ul>
              ) : (
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>Register new files</li>
                  <li>View assigned files only</li>
                  <li>Upload documents</li>
                  <li>Update own files (limited)</li>
                  <li>View restricted reports</li>
                </ul>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRoleChange} disabled={isUpdating || newRole === selectedUser?.role_name}>
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Role"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Dialog */}
      <AlertDialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedUser?.is_active ? "Deactivate User" : "Activate User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser?.is_active
                ? `Are you sure you want to deactivate ${selectedUser?.first_name || "this user"}? They will no longer be able to access the system.`
                : `Are you sure you want to activate ${selectedUser?.first_name || "this user"}? They will regain access to the system.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmStatusToggle}
              disabled={isUpdating}
              className={selectedUser?.is_active ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : selectedUser?.is_active ? (
                "Deactivate"
              ) : (
                "Activate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
