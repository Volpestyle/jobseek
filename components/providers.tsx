"use client";

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "@/contexts/auth-context";
import { MigrationHandler } from "@/components/auth/migration-handler";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <MigrationHandler />
        {children}
      </AuthProvider>
    </SessionProvider>
  );
}
