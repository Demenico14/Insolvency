import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"

export default function FileTrackingPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header />
      </main>
    </div>
  )
}
