"use client"

import { LayoutDashboard, FolderOpen, FilePlus, ArrowRightLeft, FileBarChart, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: FolderOpen, label: "Files", href: "/files" },
  { icon: FilePlus, label: "Register File", href: "/register" },
  { icon: ArrowRightLeft, label: "File Tracking", href: "/tracking" },
  { icon: FileBarChart, label: "Reports", href: "/reports" },
]

const generalItems = [
  { icon: Settings, label: "Settings", href: "/settings" },
]

export function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push("/auth")
    router.refresh()
  }

  return (
    <aside className="fixed top-0 left-0 w-64 bg-card border-r border-border p-4 h-screen overflow-y-auto lg:block">
      <div className="flex items-center gap-2 mb-6 group cursor-pointer">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 relative flex-shrink-0 transition-transform group-hover:scale-110 duration-300">
            <Image
              src="/logo.png"
              alt="Insolvency Logo"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-tight">
              Insolvency
            </span>
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

            {/* Logout button */}
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              onMouseEnter={() => setHoveredItem("Logout")}
              onMouseLeave={() => setHoveredItem(null)}
              className={cn(
                "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                hoveredItem === "Logout" && "translate-x-1",
                loggingOut && "opacity-50 cursor-not-allowed",
              )}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">{loggingOut ? "Signing out…" : "Logout"}</span>
            </button>
          </nav>
        </div>
      </div>
    </aside>
  )
}