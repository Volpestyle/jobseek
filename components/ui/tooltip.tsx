"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "./utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

function TooltipContent({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Content
      data-slot="tooltip-content"
      sideOffset={sideOffset}
      className={cn(
        "bg-popover text-popover-foreground data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 z-50 w-fit rounded-md border px-3 py-1.5 text-xs shadow-md",
        className
      )}
      {...props}
    />
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
