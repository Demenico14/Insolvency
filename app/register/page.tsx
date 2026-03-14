import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RegisterFileForm } from "@/components/register/register-file-form"

export default function RegisterFilePage() {
  return (
    <DashboardLayout>
      <div className="max-w-4xl">
        <RegisterFileForm />
      </div>
    </DashboardLayout>
  )
}