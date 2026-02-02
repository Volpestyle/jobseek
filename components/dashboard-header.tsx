"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Signal } from "lucide-react";

export function DashboardHeader() {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex h-12 items-center gap-4 px-4">
        <SidebarTrigger />

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Signal className="h-3.5 w-3.5 text-primary" />
            <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          </div>
          <span className="font-mono text-[10px] text-muted-foreground/60 tracking-wider hidden sm:inline">
            CONNECTED
          </span>
        </div>

        <div className="flex-1" />

        {/* Build info */}
        <div className="hidden md:flex items-center gap-3 text-[10px] text-muted-foreground/40 font-mono tracking-wider">
          <span>PLAYWRIGHT</span>
          <span className="text-border">|</span>
          <span>ANTI-DETECT</span>
          <span className="text-border">|</span>
          <span>LOCAL DB</span>
        </div>

        <ModeToggle />
      </div>
    </header>
  );
}
