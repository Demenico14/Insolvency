import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { RegisterFileForm } from "@/components/register/register-file-form"

export default function RegisterFilePage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header />
        <div className="max-w-4xl">
          <RegisterFileForm />
        </div>
      </main>
    </div>
  )
}
