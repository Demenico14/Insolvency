"use client"

import { useEffect, useState, useCallback } from "react"
import { Search, Bell, FileText, AlertCircle, CheckCircle2, Clock, X, FolderPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MobileNav } from "./mobile-nav"
import { createClient } from "@/lib/supabase/client"
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification,
  type Notification 
} from "@/app/notifications/actions"

export function Header() {
  const supabase = createClient()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadNotifications = useCallback(async () => {
    setIsLoading(true)
    const result = await getNotifications(20)
    setNotifications(result.notifications)
    setUnreadCount(result.unreadCount)
    setIsLoading(false)
  }, [])

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
    
    // Load real notifications from database
    loadNotifications()

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications' 
        }, 
        () => {
          loadNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadNotifications, supabase])

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  const handleMarkAsRead = useCallback(async (id: string) => {
    // Optimistically update UI
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))
    
    // Update in database
    await markNotificationAsRead(id)
  }, [])

  const handleMarkAllAsRead = useCallback(async () => {
    // Optimistically update UI
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
    
    // Update in database
    await markAllNotificationsAsRead()
  }, [])

  const handleDismissNotification = useCallback(async (id: string) => {
    const notification = notifications.find(n => n.id === id)
    
    // Optimistically update UI
    setNotifications(prev => prev.filter(n => n.id !== id))
    if (notification && !notification.is_read) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
    
    // Delete from database
    await deleteNotification(id)
  }, [notifications])

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return `${Math.floor(diffInSeconds / 86400)}d ago`
  }

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "file_assignment":
        return <FolderPlus className="w-4 h-4 text-blue-500" />
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
                  onClick={handleMarkAllAsRead}
                >
                  Mark all read
                </Button>
              )}
            </div>
            
            <ScrollArea className="h-[320px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3 animate-pulse">
                    <Bell className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No notifications</p>
                  <p className="text-xs text-muted-foreground mt-1">You&apos;ll be notified when files are assigned to you</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {notifications.map((notification) => (
                    <div 
                      key={notification.id}
                      className={`group relative p-4 hover:bg-muted/50 transition-colors cursor-pointer ${
                        !notification.is_read ? "bg-primary/5" : ""
                      }`}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-tight ${!notification.is_read ? "font-semibold text-foreground" : "font-medium text-foreground"}`}>
                              {notification.title}
                            </p>
                            <button 
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDismissNotification(notification.id)
                              }}
                            >
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {notification.message}
                          </p>
                          {notification.file_reference && (
                            <p className="text-xs text-primary mt-1">
                              Ref: {notification.file_reference}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground/70 mt-1.5">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
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
