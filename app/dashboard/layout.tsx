import { auth } from "@/lib/auth/auth.config"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { MigrationCheck } from "@/components/migration-check"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Allow anonymous access - no redirect
  const user = session?.user || {
    name: null,
    email: null,
    image: null,
  }

  return (
    <SidebarProvider>
      <DashboardSidebar user={user} />
      <SidebarInset>
        <DashboardHeader />
        <div className="flex-1 p-6">
          {children}
        </div>
      </SidebarInset>
      <MigrationCheck />
    </SidebarProvider>
  )
}