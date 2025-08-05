"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "motion/react";

import { cn } from "./utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const [activeTabRect, setActiveTabRect] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const updateActiveTabRect = () => {
      if (!listRef.current) return;

      const activeTab = listRef.current.querySelector(
        '[data-state="active"]'
      ) as HTMLElement | null;

      if (activeTab) {
        const style = getComputedStyle(listRef.current);
        const paddingLeft = parseFloat(style.paddingLeft);
        const paddingTop = parseFloat(style.paddingTop);
        const paddingBottom = parseFloat(style.paddingBottom);

        const x = activeTab.offsetLeft;
        const y = activeTab.offsetTop;
        const width = activeTab.offsetWidth;
        const height = activeTab.offsetHeight;

        setActiveTabRect({ x, y, width, height });
      } else {
        setActiveTabRect(null);
      }
    };

    // Initial update
    updateActiveTabRect();

    // Create observer to watch for active state changes and child list changes
    const observer = new MutationObserver(updateActiveTabRect);
    if (listRef.current) {
      observer.observe(listRef.current, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-state"],
        childList: true,
      });
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] relative",
        className
      )}
      {...props}
    >
      {activeTabRect && (
        <motion.div
          className="absolute top-0 left-0 bg-card rounded-xl shadow-sm"
          initial={false}
          animate={{
            x: activeTabRect.x,
            y: activeTabRect.y,
            width: activeTabRect.width,
            height: activeTabRect.height,
          }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30,
          }}
          style={{
            // Ensure the pill is behind the text
            zIndex: 0,
          }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative z-10 data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground dark:text-muted-foreground inline-flex h-full flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
