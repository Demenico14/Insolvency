"use client"

import { LayoutDashboard, FolderOpen, FilePlus, ArrowRightLeft, FileBarChart, Settings, LogOut, Users, Shield, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { useUserWithRole } from "@/lib/rbac/use-user-role"
import { useSidebar } from "@/lib/sidebar-context"
import { PermissionString } from "@/lib/rbac/types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

type MenuItem = {
  icon: React.ElementType
  label: string
  href: string
  permission?: PermissionString
  supervisorOnly?: boolean
}

const menuItems: MenuItem[] = [
  { icon: LayoutDashboard, label: "Dashboard",     href: "/" },
  { icon: FolderOpen,      label: "Files",          href: "/files" },
  { icon: FilePlus,        label: "Register File",  href: "/register", permission: "files:create" },
  { icon: ArrowRightLeft,  label: "File Tracking",  href: "/tracking" },
  { icon: FileBarChart,    label: "Reports",        href: "/reports" },
]

const supervisorItems: MenuItem[] = [
  { icon: Users,         label: "User Management", href: "/users",  supervisorOnly: true },
  { icon: ClipboardList, label: "Audit Log",        href: "/audit",  supervisorOnly: true },
]

const generalItems: MenuItem[] = [
  { icon: Settings, label: "Settings", href: "/settings" },
]

function NavItem({
  item, isActive, collapsed,
  onMouseEnter, onMouseLeave, hovered,
}: {
  item: MenuItem
  isActive: boolean
  collapsed: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  hovered: boolean
}) {
  const link = (
    <Link
      href={item.href}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
        isActive
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        hovered && !isActive && !collapsed && "translate-x-1",
        collapsed && "justify-center px-2",
      )}
    >
      <item.icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="text-sm truncate">{item.label}</span>}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">{item.label}</TooltipContent>
      </Tooltip>
    )
  }
  return link
}

export function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [loggingOut,  setLoggingOut]  = useState(false)
  const pathname  = usePathname()
  const router    = useRouter()
  const supabase  = createClient()
  const { user, isSupervisor, permissions } = useUserWithRole()
  const { collapsed, toggle } = useSidebar()

  const hasPermission = (permission?: PermissionString) =>
    !permission || permissions.includes(permission)

  const visibleMenuItems       = menuItems.filter(item => hasPermission(item.permission))
  const visibleSupervisorItems = isSupervisor ? supervisorItems : []

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/auth")
    router.refresh()
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed top-0 left-0 bg-card border-r border-border h-screen overflow-y-auto overflow-x-hidden",
          "flex flex-col transition-all duration-300 z-40",
          collapsed ? "w-16" : "w-64",
        )}
      >
        {/* ── Header row ── */}
        <div className={cn(
          "flex items-center h-14 px-3 flex-shrink-0 border-b border-border",
          collapsed ? "justify-center" : "justify-between",
        )}>
          {!collapsed && (
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 relative flex-shrink-0 transition-transform group-hover:scale-110 duration-300">
                <Image src="/logo.png" alt="Insolvency Logo" fill className="object-contain" />
              </div>
              <span className="text-sm font-semibold text-foreground leading-tight truncate">
                Insolvency
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/">
              <div className="w-7 h-7 relative">
                <Image src="/logo.png" alt="Insolvency Logo" fill className="object-contain" />
              </div>
            </Link>
          )}
          <button
            onClick={toggle}
            className={cn(
              "w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground",
              "hover:bg-muted hover:text-foreground transition-colors flex-shrink-0",
              collapsed && "mt-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed
              ? <ChevronRight className="w-4 h-4" />
              : <ChevronLeft  className="w-4 h-4" />
            }
          </button>
        </div>

        {/* ── User badge ── */}
        {user && (
          <div className={cn(
            "mx-2 mt-3 mb-1 rounded-lg bg-muted/50 border border-border flex items-center gap-2 flex-shrink-0",
            collapsed ? "p-1.5 justify-center" : "p-2.5",
          )}>
            <div className={cn(
              "rounded-full flex items-center justify-center flex-shrink-0",
              "w-7 h-7",
              isSupervisor ? "bg-purple-500/10" : "bg-blue-500/10",
            )}>
              {isSupervisor
                ? <Shield className="w-3.5 h-3.5 text-purple-500" />
                : <Users   className="w-3.5 h-3.5 text-blue-500" />
              }
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {user.profile?.first_name || user.email?.split("@")[0] || "User"}
                </p>
                <p className={cn(
                  "text-[10px] font-medium",
                  isSupervisor ? "text-purple-500" : "text-blue-500",
                )}>
                  {isSupervisor ? "Supervisor" : "General User"}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Nav ── */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">

          {/* Main menu */}
          <div>
            {!collapsed && (
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1 uppercase tracking-wider">
                Menu
              </p>
            )}
            <nav className="space-y-0.5">
              {visibleMenuItems.map(item => (
                <NavItem
                  key={item.label}
                  item={item}
                  isActive={pathname === item.href}
                  collapsed={collapsed}
                  hovered={hoveredItem === item.label}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                />
              ))}
            </nav>
          </div>

          {/* Supervisor section */}
          {isSupervisor && visibleSupervisorItems.length > 0 && (
            <div>
              {!collapsed && (
                <p className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1 uppercase tracking-wider flex items-center gap-1">
                  <Shield className="w-3 h-3" />Supervisor
                </p>
              )}
              {collapsed && <div className="border-t border-border mx-1 mb-1.5" />}
              <nav className="space-y-0.5">
                {visibleSupervisorItems.map(item => (
                  <NavItem
                    key={item.label}
                    item={item}
                    isActive={pathname === item.href}
                    collapsed={collapsed}
                    hovered={hoveredItem === item.label}
                    onMouseEnter={() => setHoveredItem(item.label)}
                    onMouseLeave={() => setHoveredItem(null)}
                  />
                ))}
              </nav>
            </div>
          )}

          {/* General */}
          <div>
            {!collapsed && (
              <p className="text-[10px] font-medium text-muted-foreground mb-1.5 px-1 uppercase tracking-wider">
                General
              </p>
            )}
            {collapsed && <div className="border-t border-border mx-1 mb-1.5" />}
            <nav className="space-y-0.5">
              {generalItems.map(item => (
                <NavItem
                  key={item.label}
                  item={item}
                  isActive={pathname === item.href}
                  collapsed={collapsed}
                  hovered={hoveredItem === item.label}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                />
              ))}

              {/* Logout */}
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className={cn(
                        "w-full flex items-center justify-center p-2 rounded-lg text-sm font-medium transition-colors",
                        "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                        loggingOut && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Logout</TooltipContent>
                </Tooltip>
              ) : (
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  onMouseEnter={() => setHoveredItem("Logout")}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                    hoveredItem === "Logout" && "translate-x-1",
                    loggingOut && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loggingOut ? "Signing out…" : "Logout"}</span>
                </button>
              )}
            </nav>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}