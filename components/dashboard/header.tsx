"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Bell, FileText, AlertCircle, CheckCircle2, Clock, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MobileNav } from "./mobile-nav"
import { createClient } from "@/lib/supabase/client"

interface Notification {
  id: string
  type: "file_update" | "status_change" | "deadline" | "system"
  title: string
  message: string
  timestamp: Date
  read: boolean
  fileRef?: string
}

// Generate context-aware notifications based on insolvency file management
const generateNotifications = (): Notification[] => {
  const now = new Date()
  return [
    {
      id: "1",
      type: "status_change",
      title: "File Status Updated",
      message: "INS-2024-0042 has been moved to 'Active' status",
      timestamp: new Date(now.getTime() - 1000 * 60 * 15), // 15 mins ago
      read: false,
      fileRef: "INS-2024-0042"
    },
    {
      id: "2",
      type: "deadline",
      title: "Upcoming Deadline",
      message: "Review deadline for INS-2024-0038 is in 2 days",
      timestamp: new Date(now.getTime() - 1000 * 60 * 45), // 45 mins ago
      read: false,
      fileRef: "INS-2024-0038"
    },
    {
      id: "3",
      type: "file_update",
      title: "Document Uploaded",
      message: "New document added to INS-2024-0035",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
      read: false,
      fileRef: "INS-2024-0035"
    },
    {
      id: "4",
      type: "system",
      title: "Weekly Report Ready",
      message: "Your weekly insolvency summary is now available",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 5), // 5 hours ago
      read: true
    },
    {
      id: "5",
      type: "status_change",
      title: "File Closed",
      message: "INS-2024-0029 has been marked as 'Closed'",
      timestamp: new Date(now.getTime() - 1000 * 60 * 60 * 24), // 1 day ago
      read: true,
      fileRef: "INS-2024-0029"
    }
  ]
}

export function Header() {
  const supabase = createClient()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

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
    
    // Load notifications
    setNotifications(generateNotifications())
  }, [])

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  const unreadCount = notifications.filter(n => !n.read).length

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }, [])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const formatTimeAgo = (date: Date): string => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "file_update":
        return <FileText className="w-4 h-4 text-primary" />
      case "status_change":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      case "deadline":
        return <Clock className="w-4 h-4 text-amber-500" />
      case "system":
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />
    }
  }

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
        <Popover open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
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
                  variant="ghost" 
                  size="sm" 
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
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`group relative p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                        !notification.read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-tight ${!notification.read ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                              {notification.title}
                            </p>
                            <button 
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                              onClick={(e) => {
                                e.stopPropagation()
                                dismissNotification(notification.id)
                              }}
                            >
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-1.5">
                            {formatTimeAgo(notification.timestamp)}
                          </p>
                        </div>
                        {!notification.read && (
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
                  variant="outline" 
                  size="sm" 
                  className="w-full text-sm"
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  View all notifications
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

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
