"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbNavProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbNav({ items }: BreadcrumbNavProps) {
  return (
    <nav className="flex items-center gap-1.5">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1.5">
          {index > 0 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
          )}
          {item.href ? (
            <Link
              href={item.href}
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wider"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-mono text-xs text-foreground tracking-wider">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
