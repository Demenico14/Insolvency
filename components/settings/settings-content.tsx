"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"
import { createClient } from "@/lib/supabase/client"

export function SettingsContent() {
  const { theme, setTheme } = useTheme()
  const supabase = createClient()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Derive initials from name
  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?"

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email ?? "")
        setFullName(user.user_metadata?.full_name ?? "")
        setAvatarUrl(user.user_metadata?.avatar_url ?? "")
      }
      setLoading(false)
    }
    loadUser()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg(null)

    try {
      const updates: { data: { full_name: string }; email?: string } = {
        data: { full_name: fullName },
      }

      // Only include email in update if it changed
      const { data: { user } } = await supabase.auth.getUser()
      if (user && email !== user.email) {
        const { error } = await supabase.auth.updateUser({ email, ...updates })
        if (error) throw error
        setSaveMsg({ type: "success", text: "Changes saved. Check your new email to confirm the change." })
      } else {
        const { error } = await supabase.auth.updateUser(updates)
        if (error) throw error
        setSaveMsg({ type: "success", text: "Profile updated successfully." })
      }
    } catch (err: any) {
      setSaveMsg({ type: "error", text: err.message || "Failed to save changes." })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-6">Profile Information</h3>

        {loading ? (
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
            Loading profile…
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-20 h-20">
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
                <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{fullName || "—"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            </div>

            {saveMsg && (
              <p className={`text-sm ${saveMsg.type === "success" ? "text-green-500" : "text-destructive"}`}>
                {saveMsg.text}
              </p>
            )}

            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-6">Notifications</h3>
        <div className="space-y-4">
          {[
            { label: "Email notifications", description: "Receive email about your account activity" },
            { label: "Push notifications", description: "Receive push notifications in your browser" },
            { label: "Task reminders", description: "Get reminded about upcoming task deadlines" },
            { label: "Team updates", description: "Notifications about team member activities" },
          ].map((item, index) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-3 border-b border-border last:border-0"
            >
              <div>
                <p className="font-medium">{item.label}</p>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
              <Switch defaultChecked={index < 2} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-6">Appearance</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Dark Mode</p>
            <p className="text-sm text-muted-foreground">Enable dark mode theme</p>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
          />
        </div>
      </Card>
    </div>
  )
}