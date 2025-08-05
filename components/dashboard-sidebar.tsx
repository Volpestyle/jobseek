"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MotionSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
} from "@/components/motion-sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
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
  UserCircle,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useSidebar } from "@/components/ui/sidebar";

interface DashboardSidebarProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const menuItems = [
    { id: "overview", label: "Overview", icon: Home, href: "/dashboard" },
    {
      id: "job-search",
      label: "Job Search",
      icon: Search,
      href: "/dashboard/job-search",
    },
    {
      id: "active-searches",
      label: "Active Searches",
      icon: PlayCircle,
      href: "/dashboard/active-searches",
      badge: 3,
    },
    {
      id: "job-management",
      label: "Job Management",
      icon: Briefcase,
      href: "/dashboard/job-management",
    },
    { id: "profile", label: "Profile", icon: User, href: "/dashboard/profile" },
    {
      id: "settings",
      label: "Settings",
      icon: Settings,
      href: "/dashboard/settings",
    },
  ];

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/" });
  };

  const handleSignIn = () => {
    router.push("/auth/signin");
  };

  // Animation variants for consistent timing
  const textVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: {
        opacity: { duration: 0.3, delay: 0.1 },
        x: { duration: 0.3, ease: "easeOut" },
      },
    },
    collapsed: {
      opacity: 0,
      x: -10,
      transition: {
        opacity: { duration: 0.2 },
        x: { duration: 0.2, ease: "easeIn" },
      },
    },
  };

  return (
    <MotionSidebar variant="sidebar" collapsible="icon" side="left">
      <SidebarHeader>
        <Link
          href="/dashboard"
          className="relative flex items-center px-2 py-1"
        >
          <motion.div className="flex items-center w-full justify-start">
            {/* Logo container with layout animation */}
            <motion.div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
              animate={{
                x: isCollapsed ? -10 : 0,
              }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Activity className="h-4 w-4" />
            </motion.div>

            {/* Text container */}
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -10, width: 0 }}
                  animate={{
                    opacity: 1,
                    x: 0,
                    width: "auto",
                    transition: {
                      opacity: { duration: 0.3, delay: 0.1 },
                      x: { duration: 0.3, ease: "easeOut" },
                      width: { duration: 0.3, ease: "easeOut" },
                    },
                  }}
                  exit={{
                    opacity: 0,
                    x: -10,
                    width: 0,
                    transition: {
                      opacity: { duration: 0.2 },
                      x: { duration: 0.2, ease: "easeIn" },
                      width: { duration: 0.2, ease: "easeIn" },
                    },
                  }}
                  className="overflow-hidden ml-2"
                >
                  <span className="font-semibold tracking-tight whitespace-nowrap">
                    jobseek
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item, index) => (
            <SidebarMenuItem key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "relative flex items-center rounded-md p-2 text-left text-sm outline-hidden",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  pathname === item.href &&
                    "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                )}
              >
                <motion.div className="flex items-center w-full justify-start">
                  {/* Icon container with layout animation */}
                  <motion.div
                    className="flex h-4 w-4 shrink-0 items-center justify-center"
                    animate={{
                      x: isCollapsed ? 6 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    <item.icon className="h-4 w-4" />
                  </motion.div>

                  {/* Text and badge container */}
                  <AnimatePresence>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{
                          opacity: 1,
                          x: 0,
                          transition: {
                            opacity: {
                              duration: 0.3,
                            },
                            x: {
                              duration: 0.3,
                              ease: "easeOut",
                            },
                          },
                        }}
                        exit={{
                          opacity: 0,
                          x: -10,
                          transition: {
                            opacity: { duration: 0.2 },
                            x: { duration: 0.2, ease: "easeIn" },
                          },
                        }}
                        className="flex items-center gap-2 overflow-hidden ml-2"
                      >
                        <span className="whitespace-nowrap">{item.label}</span>
                        {item.badge && (
                          <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto">
        <SidebarMenu>
          {isAuthenticated ? (
            <>
              <SidebarMenuItem>
                <button
                  className={cn(
                    "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  )}
                >
                  <motion.div className="flex items-center w-full justify-start">
                    {/* Avatar container */}
                    <motion.div
                      animate={{
                        x: isCollapsed ? 6 : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    >
                      <Avatar className="h-5 w-5 shrink-0">
                        <AvatarImage src={user.image || undefined} />
                        <AvatarFallback>
                          {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                    </motion.div>

                    {/* Text container */}
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            transition: {
                              opacity: { duration: 0.3, delay: 0.1 },
                              x: { duration: 0.3, ease: "easeOut" },
                            },
                          }}
                          exit={{
                            opacity: 0,
                            x: -10,
                            transition: {
                              opacity: { duration: 0.2 },
                              x: { duration: 0.2, ease: "easeIn" },
                            },
                          }}
                          className="overflow-hidden ml-2"
                        >
                          <span className="whitespace-nowrap">
                            {user.name || user.email || "User"}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <button
                  onClick={handleSignOut}
                  className={cn(
                    "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  )}
                >
                  <motion.div className="flex items-center w-full justify-start">
                    {/* Icon container */}
                    <motion.div
                      className="flex h-4 w-4 shrink-0 items-center justify-center"
                      animate={{
                        x: isCollapsed ? 6 : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    >
                      <LogOut className="h-4 w-4" />
                    </motion.div>

                    {/* Text container */}
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            transition: {
                              opacity: { duration: 0.3, delay: 0.1 },
                              x: { duration: 0.3, ease: "easeOut" },
                            },
                          }}
                          exit={{
                            opacity: 0,
                            x: -10,
                            transition: {
                              opacity: { duration: 0.2 },
                              x: { duration: 0.2, ease: "easeIn" },
                            },
                          }}
                          className="overflow-hidden ml-2"
                        >
                          <span className="whitespace-nowrap">Logout</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </button>
              </SidebarMenuItem>
            </>
          ) : (
            <>
              <SidebarMenuItem>
                <button
                  className={cn(
                    "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  )}
                >
                  <motion.div className="flex items-center w-full justify-start">
                    <motion.div
                      animate={{
                        x: isCollapsed ? 6 : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    >
                      <UserCircle className="h-5 w-5" />
                    </motion.div>
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            transition: {
                              opacity: { duration: 0.3, delay: 0.1 },
                              x: { duration: 0.3, ease: "easeOut" },
                            },
                          }}
                          exit={{
                            opacity: 0,
                            x: -10,
                            transition: {
                              opacity: { duration: 0.2 },
                              x: { duration: 0.2, ease: "easeIn" },
                            },
                          }}
                          className="whitespace-nowrap ml-2"
                        >
                          Anonymous User
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </button>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <button
                  onClick={handleSignIn}
                  className={cn(
                    "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    "focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                  )}
                >
                  <motion.div className="flex items-center w-full justify-start">
                    <motion.div
                      animate={{
                        x: isCollapsed ? 12 : 0,
                      }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 25,
                      }}
                    >
                      <LogIn className="h-4 w-4" />
                    </motion.div>
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{
                            opacity: 1,
                            x: 0,
                            transition: {
                              opacity: { duration: 0.3, delay: 0.1 },
                              x: { duration: 0.3, ease: "easeOut" },
                            },
                          }}
                          exit={{
                            opacity: 0,
                            x: -10,
                            transition: {
                              opacity: { duration: 0.2 },
                              x: { duration: 0.2, ease: "easeIn" },
                            },
                          }}
                          className="whitespace-nowrap ml-2"
                        >
                          Sign In
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </button>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
        {!isAuthenticated && (
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "2.75rem" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, type: "tween", ease: "easeOut" }}
                className="px-2 py-2 text-xs text-muted-foreground overflow-hidden"
              >
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <p>Data stored locally</p>
                  <p>Sign in to sync across devices</p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </SidebarFooter>
      <SidebarRail />
    </MotionSidebar>
  );
}
