"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Activity, Filter, History, Radio } from "lucide-react";

import {
  MotionSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/motion-sidebar";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const menuItems = [
  { id: "scrape", label: "Scrape", icon: Filter, href: "/" },
  { id: "results", label: "Results", icon: Activity, href: "/results" },
  { id: "history", label: "History", icon: History, href: "/history" },
];

export function ScraperSidebar() {
  const pathname = usePathname();
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <MotionSidebar variant="sidebar" collapsible="icon" side="left">
      <SidebarHeader>
        <Link href="/" className="relative flex items-center px-2 py-1">
          <motion.div className="flex items-center w-full justify-start">
            {/* Logo Icon */}
            <motion.div
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20"
              animate={{ x: isCollapsed ? -8 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <Radio className="h-4 w-4 text-primary" />
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-lg border border-primary/40"
                animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.div>

            {/* Brand text */}
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
                  className="overflow-hidden ml-3"
                >
                  <span className="font-mono text-sm font-medium tracking-tight whitespace-nowrap text-foreground">
                    JOBSEEK
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {menuItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <SidebarMenuItem key={item.id}>
                <Button
                  asChild
                  variant="ghost"
                  size="sm"
                  centerHover={isCollapsed}
                  className={cn(
                    "w-full justify-start h-9 px-2 font-mono text-xs tracking-wide",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <Link href={item.href}>
                    <div className="flex items-center w-full relative">
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive && "text-primary"
                        )}
                      />
                      <div className="relative flex-1 h-full ml-2">
                        <AnimatePresence>
                          {!isCollapsed && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{
                                opacity: 1,
                                x: 0,
                                transition: {
                                  opacity: { duration: 0.3 },
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
                              className="flex items-center absolute inset-0 pr-2 w-full"
                            >
                              <span className="whitespace-nowrap uppercase tracking-wider">
                                {item.label}
                              </span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </Link>
                </Button>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="mt-auto">
        <div className="relative h-12 overflow-hidden">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 px-2 py-2"
              >
                <div className="rounded border border-border/50 bg-muted/30 px-3 py-2">
                  <p className="font-mono text-[9px] text-muted-foreground/60 tracking-wider">
                    DATA STORED LOCALLY
                  </p>
                  <p className="font-mono text-[9px] text-primary/60 tracking-wider">
                    EXPORT ANYTIME
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </MotionSidebar>
  );
}
