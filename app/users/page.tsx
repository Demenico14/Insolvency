import { Sidebar } from "@/components/dashboard/sidebar"
import { UsersContent } from "@/components/users/users-content"
import { getCurrentUserWithRole } from "@/lib/rbac/server"
import { redirect } from "next/navigation"

export default async function UsersPage() {
  // Server-side role check
  const user = await getCurrentUserWithRole()
  
  if (!user || user.role !== 'supervisor') {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6">
        <UsersContent />
      </main>
    </div>
  )
}
