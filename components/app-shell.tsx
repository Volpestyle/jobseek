"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { ScraperSidebar } from "@/components/scraper-sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="dark" disableTransitionOnChange>
      <SidebarProvider>
        <ScraperSidebar />
        <SidebarInset>
          <DashboardHeader />
          <div className="flex-1 p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}
