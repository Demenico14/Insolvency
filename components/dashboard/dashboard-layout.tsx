"use client"

import { SidebarProvider, useSidebar } from "@/lib/sidebar-context"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { type ReactNode } from "react"

function Inner({ children }: { children: ReactNode }) {
  const { collapsed } = useSidebar()
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main
        className={[
          "flex-1 p-4 lg:p-6 transition-all duration-300",
          collapsed ? "lg:ml-16" : "lg:ml-64",
        ].join(" ")}
      >
        <Header />
        {children}
      </main>
    </div>
  )
}

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Inner>{children}</Inner>
    </SidebarProvider>
  )
}