import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { FilesList } from "@/components/files/files-list"

export default function FilesPage() {
  return (
    <DashboardLayout>
      <FilesList />
    </DashboardLayout>
  )
}