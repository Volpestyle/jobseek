"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Sidebar, 
  SidebarContent, 
  SidebarFooter, 
  SidebarHeader, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail 
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  Search, 
  Activity, 
  Briefcase, 
  User, 
  Settings, 
  LogOut,
  Home,
  PlayCircle,
  LogIn,
  UserCircle
} from "lucide-react"
import { signOut } from "next-auth/react"
import { useAuth } from "@/contexts/auth-context"
import { useRouter } from "next/navigation"

interface DashboardSidebarProps {
  user: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  const menuItems = [
    { id: "overview", label: "Overview", icon: Home, href: "/dashboard" },
    { id: "job-search", label: "Job Search", icon: Search, href: "/dashboard/job-search" },
    { id: "active-searches", label: "Active Searches", icon: PlayCircle, href: "/dashboard/active-searches", badge: 3 },
    { id: "job-management", label: "Job Management", icon: Briefcase, href: "/dashboard/job-management" },
    { id: "profile", label: "Profile", icon: User, href: "/dashboard/profile" },
    { id: "settings", label: "Settings", icon: Settings, href: "/dashboard/settings" },
  ]

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" })
  }

  const handleSignIn = () => {
    router.push("/auth/signin")
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon" side="left">
      <SidebarHeader>
        <Link href="/dashboard" className="relative flex items-center gap-2 px-2 py-1 transition-[justify-content] duration-200 ease-out group-data-[state=collapsed]:justify-center group-data-[state=expanded]:justify-start">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight transition-all duration-300 ease-out group-data-[state=collapsed]:absolute group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none group-data-[state=expanded]:relative group-data-[state=expanded]:opacity-100">
            jobseek
          </span>
        </Link>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton 
                asChild
                isActive={pathname === item.href}
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="h-4 w-4" />
                  <span className="transition-[opacity] duration-300 ease-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none group-data-[state=expanded]:opacity-100">{item.label}</span>
                  {item.badge && (
                    <SidebarMenuBadge>
                      {item.badge}
                    </SidebarMenuBadge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      
      <SidebarFooter className="mt-auto">
        <SidebarMenu>
          {isAuthenticated ? (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip={user.name || user.email || "User"}>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={user.image || undefined} />
                    <AvatarFallback>
                      {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="transition-[opacity] duration-300 ease-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none group-data-[state=expanded]:opacity-100">
                    {user.name || user.email || "User"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignOut} tooltip="Logout">
                  <LogOut className="h-4 w-4" />
                  <span className="transition-[opacity] duration-300 ease-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none group-data-[state=expanded]:opacity-100">Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          ) : (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Anonymous User">
                  <UserCircle className="h-5 w-5" />
                  <span className="transition-[opacity] duration-300 ease-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none group-data-[state=expanded]:opacity-100">
                    Anonymous User
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleSignIn} tooltip="Sign In">
                  <LogIn className="h-4 w-4" />
                  <span className="transition-[opacity] duration-300 ease-out group-data-[state=collapsed]:opacity-0 group-data-[state=collapsed]:pointer-events-none group-data-[state=expanded]:opacity-100">Sign In</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
        {!isAuthenticated && (
          <div className="h-[2.75rem] px-2 py-2 text-xs text-muted-foreground overflow-hidden">
            <div className="transition-[opacity] duration-300 ease-out group-data-[state=collapsed]:opacity-0 group-data-[state=expanded]:opacity-100">
              <p>Data stored locally</p>
              <p>Sign in to sync across devices</p>
            </div>
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}