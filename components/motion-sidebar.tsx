"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  Sidebar,
  useSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface MotionSidebarProps extends React.ComponentProps<"div"> {
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
  collapsible?: "offcanvas" | "icon" | "none";
}

const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";

export function MotionSidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: MotionSidebarProps) {
  // Extract props that shouldn't be passed to motion.div
  const { onDrag, onDragEnd, onDragStart, ...safeProps } = props;
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-[var(--sidebar-width)] flex-col",
          className
        )}
        {...safeProps}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...safeProps}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-[var(--sidebar-width)] p-0 [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      className="group peer text-sidebar-foreground hidden md:block"
      data-state={state}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-slot="sidebar"
    >
      {/* Animated sidebar gap */}
      <motion.div
        data-slot="sidebar-gap"
        className={cn(
          "relative bg-transparent",
          "group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180"
        )}
        initial={false}
        animate={{
          width: isCollapsed
            ? variant === "floating" || variant === "inset"
              ? `calc(${SIDEBAR_WIDTH_ICON} + 1rem)`
              : SIDEBAR_WIDTH_ICON
            : SIDEBAR_WIDTH,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.8,
        }}
      />

      {/* Animated sidebar container */}
      <motion.div
        data-slot="sidebar-container"
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh md:flex",
          side === "left" ? "left-0" : "right-0",
          variant === "floating" || variant === "inset"
            ? "p-2"
            : "group-data-[side=left]:border-r group-data-[side=right]:border-l",
          className
        )}
        initial={false}
        animate={{
          width: isCollapsed
            ? variant === "floating" || variant === "inset"
              ? `calc(${SIDEBAR_WIDTH_ICON} + 1rem + 2px)`
              : SIDEBAR_WIDTH_ICON
            : SIDEBAR_WIDTH,
          x:
            collapsible === "offcanvas" && isCollapsed
              ? side === "left"
                ? `-${SIDEBAR_WIDTH}`
                : SIDEBAR_WIDTH
              : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
          mass: 0.8,
        }}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          data-state={state}
          data-collapsible={state === "collapsed" ? collapsible : ""}
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm group/sidebar-inner"
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}

export {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuBadge,
  SidebarRail,
  useSidebar,
};
