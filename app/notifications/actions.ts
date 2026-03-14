"use server"

import { createClient } from "@/lib/supabase/server"

export interface Notification {
  id: string
  user_id: string
  type: "file_assignment" | "file_update" | "status_change" | "deadline" | "system"
  title: string
  message: string
  file_id: string | null
  file_reference: string | null
  is_read: boolean
  created_at: string
  read_at: string | null
}

export interface NotificationsResult {
  notifications: Notification[]
  unreadCount: number
}

export async function getNotifications(
  limit: number = 20
): Promise<NotificationsResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { notifications: [], unreadCount: 0 }
  }

  // Get notifications for the current user
  const { data: notifications, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("Error fetching notifications:", error)
    return { notifications: [], unreadCount: 0 }
  }

  // Get unread count
  const { count, error: countError } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)

  if (countError) {
    console.error("Error fetching unread count:", countError)
  }

  return {
    notifications: (notifications || []) as Notification[],
    unreadCount: count || 0,
  }
}

export async function markNotificationAsRead(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)

  if (error) {
    console.error("Error marking notification as read:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function markAllNotificationsAsRead(): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("is_read", false)

  if (error) {
    console.error("Error marking all notifications as read:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function deleteNotification(
  notificationId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: "Not authenticated" }
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId)
    .eq("user_id", user.id)

  if (error) {
    console.error("Error deleting notification:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return 0
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false)

  if (error) {
    console.error("Error fetching unread count:", error)
    return 0
  }

  return count || 0
}
