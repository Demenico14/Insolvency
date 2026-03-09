"use client"

import { useEffect, useState } from "react"
import { Search, Bell } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MobileNav } from "./mobile-nav"
import { createClient } from "@/lib/supabase/client"

export function Header() {
  const supabase = createClient()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setFullName(user.user_metadata?.full_name ?? "")
        setEmail(user.email ?? "")
        setAvatarUrl(user.user_metadata?.avatar_url ?? "")
      }
    }
    loadUser()
  }, [])

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

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
          <Avatar className="w-9 h-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all duration-300 cursor-pointer">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
            <AvatarFallback className="text-sm font-semibold">{initials}</AvatarFallback>
          </Avatar>

          <div className="hidden sm:block">
            <p className="text-sm font-medium text-foreground leading-none">
              {fullName || "—"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {email || "Loading…"}
            </p>
          </div>
        </div>
      </div>
    </header>
  )
}