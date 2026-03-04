"use client"

import { Search, Bell } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { MobileNav } from "./mobile-nav"
import Image from "next/image"

export function Header() {
  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      <div className="lg:hidden">
        <MobileNav />
      </div>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search files, references..."
          className="pl-9 bg-card border-border"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          <span className="sr-only">Notifications</span>
        </Button>

        <div className="flex items-center gap-3 pl-2 border-l border-border">
          <div className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-primary/20 transition-all duration-300 hover:ring-primary/40 cursor-pointer">
            <Image
              src="/profile.jpg"
              alt="User profile"
              fill
              className="object-cover"
            />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">Alex Johnson</p>
            <p className="text-xs text-muted-foreground mt-0.5">Product Manager</p>
          </div>
        </div>
      </div>
    </header>
  )
}
