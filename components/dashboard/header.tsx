"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  Search, Bell, FileText, CheckCircle2, Clock, X,
  FolderOpen, Loader2,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MobileNav } from "./mobile-nav"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

// ─── Types ────────────────────────────────────────────────────────────────────

interface DBNotification {
  id: string
  type: "file_assigned" | "file_updated" | "status_change" | "system"
  title: string
  message: string
  file_id: string | null
  file_ref: string | null
  read: boolean
  created_at: string
}

interface SearchResult {
  id: string
  file_reference: string
  client_name: string
  status: string
  category: { code: string; name: string } | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Header() {
  const supabase = createClient()
  const router = useRouter()

  // User
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [userId, setUserId] = useState<string | null>(null)

  // Notifications
  const [notifications, setNotifications] = useState<DBNotification[]>([])
  const [notifOpen, setNotifOpen] = useState(false)

  // Search
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Load user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setFullName(user.user_metadata?.full_name ?? "")
        setEmail(user.email ?? "")
        setAvatarUrl(user.user_metadata?.avatar_url ?? "")
        setUserId(user.id)
      }
    }
    loadUser()
  }, [])

  // ── Load + subscribe to notifications ─────────────────────────────────────
  useEffect(() => {
    if (!userId) return

    const loadNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30)
      if (data) setNotifications(data as DBNotification[])
    }

    loadNotifications()

    // Realtime subscription — new notifications appear instantly
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as DBNotification, ...prev])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  // ── Search (debounced 300ms) ───────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const trimmed = query.trim()
    if (!trimmed) {
      setSearchResults([])
      setSearchOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const { data } = await supabase
        .from("files")
        .select("id, file_reference, client_name, status, category:categories(code, name)")
        .or(
          `file_reference.ilike.%${trimmed}%,client_name.ilike.%${trimmed}%,registration_id.ilike.%${trimmed}%`
        )
        .limit(6)

      setSearchResults(
        (data || []).map((f) => ({
          ...f,
          category: Array.isArray(f.category) ? f.category[0] : f.category,
        })) as SearchResult[]
      )
      setSearchOpen(true)
      setSearching(false)
    }, 300)
  }, [query])

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ── Notification actions ───────────────────────────────────────────────────
  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    await supabase.from("notifications").update({ read: true }).eq("id", id)
  }, [])

  const markAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    if (!unreadIds.length) return
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds)
  }, [notifications])

  const dismiss = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await supabase.from("notifications").delete().eq("id", id)
  }, [])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.read).length

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (diff < 60) return "Just now"
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  const getNotifIcon = (type: DBNotification["type"]) => {
    switch (type) {
      case "file_assigned": return <FileText className="w-4 h-4 text-primary" />
      case "file_updated":  return <FolderOpen className="w-4 h-4 text-blue-500" />
      case "status_change": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      default:              return <Clock className="w-4 h-4 text-muted-foreground" />
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "Active":   return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      case "Archived": return "bg-amber-500/10 text-amber-600 border-amber-500/20"
      case "Missing":  return "bg-red-500/10 text-red-600 border-red-500/20"
      default:         return "bg-muted text-muted-foreground"
    }
  }

  const initials = fullName
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?"

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <header className="flex items-center justify-between gap-4 mb-6">
      <div className="lg:hidden">
        <MobileNav />
      </div>

      {/* ── Search ── */}
      <div ref={searchRef} className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
        <Input
          placeholder="Search files, references, clients..."
          className="pl-9 pr-9 bg-card border-border"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
        />

        {/* Search dropdown */}
        {searchOpen && (
          <div className="absolute top-full mt-1.5 w-full bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
            {searchResults.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                No files found for "{query}"
              </div>
            ) : (
              <>
                <div className="px-3 py-2 border-b border-border">
                  <span className="text-xs text-muted-foreground font-medium">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="divide-y divide-border">
                  {searchResults.map((file) => (
                    <button
                      key={file.id}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 text-left transition-colors"
                      onClick={() => {
                        setSearchOpen(false)
                        setQuery("")
                        router.push(`/files?search=${encodeURIComponent(file.file_reference)}`)
                      }}
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {file.file_reference}
                          </span>
                          {file.category && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0">
                              {file.category.code}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {file.client_name}
                        </p>
                      </div>
                      <Badge className={`text-xs flex-shrink-0 border ${statusColor(file.status)}`}>
                        {file.status}
                      </Badge>
                    </button>
                  ))}
                </div>
                <div className="px-3 py-2 border-t border-border">
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      setSearchOpen(false)
                      router.push(`/files?search=${encodeURIComponent(query)}`)
                    }}
                  >
                    See all results for "{query}"
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* ── Notifications ── */}
        <Popover open={notifOpen} onOpenChange={setNotifOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="sr-only">Notifications</span>
            </Button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost" size="sm"
                  className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  onClick={markAllAsRead}
                >
                  Mark all read
                </Button>
              )}
            </div>

            <ScrollArea className="h-[320px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No notifications</p>
                  <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`group relative p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!n.read ? "bg-primary/5" : ""}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {getNotifIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-tight ${!n.read ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                              {n.title}
                            </p>
                            <button
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                              onClick={(e) => { e.stopPropagation(); dismiss(n.id) }}
                            >
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {n.message}
                          </p>
                          {n.file_ref && (
                            <button
                              className="text-xs text-primary hover:underline mt-1"
                              onClick={(e) => {
                                e.stopPropagation()
                                setNotifOpen(false)
                                router.push(`/files?search=${encodeURIComponent(n.file_ref!)}`)
                              }}
                            >
                              View {n.file_ref}
                            </button>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1">
                            {formatTimeAgo(n.created_at)}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-border">
                <Button
                  variant="outline" size="sm" className="w-full text-sm"
                  onClick={() => setNotifOpen(false)}
                >
                  Close
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* ── Avatar ── */}
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