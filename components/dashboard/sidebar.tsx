"use client"

import { LayoutDashboard, FolderOpen, FilePlus, ArrowRightLeft, FileBarChart, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: FolderOpen, label: "Files", href: "/files" },
  { icon: FilePlus, label: "Register File", href: "/register" },
  { icon: ArrowRightLeft, label: "File Tracking", href: "/tracking" },
  { icon: FileBarChart, label: "Reports", href: "/reports" },
]

const generalItems = [
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: LogOut, label: "Logout", href: "/logout" },
]

export function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 w-64 bg-card border-r border-border p-4 h-screen overflow-y-auto lg:block">
      <div className="flex items-center gap-2 mb-6 group cursor-pointer">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center transition-transform group-hover:scale-110 duration-300">
            <FolderOpen className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight">Insolvency</span>
            <span className="text-[10px] text-muted-foreground leading-tight">File & Records</span>
          </div>
        </Link>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">Menu</p>
          <nav className="space-y-0.5">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    hoveredItem === item.label && !isActive && "translate-x-1",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div>
          <p className="text-[10px] font-medium text-muted-foreground mb-2 uppercase tracking-wider">General</p>
          <nav className="space-y-0.5">
            {generalItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    hoveredItem === item.label && !isActive && "translate-x-1",
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </aside>
  )
}
