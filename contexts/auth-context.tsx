import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createClientStorageService } from "@/lib/storage/client-storage.service";
import { ClientStorageService } from "@/lib/storage/storage.interface";

interface AuthContextType {
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isLoading: boolean;
  userId: string | null;
  user: SessionUser | null;
  storage: ClientStorageService | null;
  promptSignIn: () => void;
  migrateAnonymousData: () => Promise<void>;
  signOut: () => Promise<void>;
}

interface SessionUser {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
}

interface SessionResponse {
  user: SessionUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchSession(): Promise<SessionResponse> {
  const response = await fetch("/api/auth/session", {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch session");
  }

  return response.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const {
    data: session,
    isLoading: isSessionLoading,
  } = useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const [storage, setStorage] = useState<ClientStorageService | null>(null);
  const [storageInitialized, setStorageInitialized] = useState(false);
  const sessionUser = session?.user ?? null;
  const isAuthenticated = !!sessionUser;
  const userId = sessionUser?.id || null;

  // Combined loading state: session is loading OR storage not initialized
  const isLoading = isSessionLoading || !storageInitialized;

  useEffect(() => {
    // Initialize storage based on auth state
    if (isSessionLoading) return;

    const clientStorage = createClientStorageService(isAuthenticated, userId);
    setStorage(clientStorage);
    setStorageInitialized(true);
  }, [isSessionLoading, isAuthenticated, userId]);

  const promptSignIn = () => {
    // This can be replaced with a modal or toast
    if (
      window.confirm(
        "Sign in to sync your data across devices and never lose your saved jobs. Continue to sign in?"
      )
    ) {
      window.location.href = "/auth/signin";
    }
  };

  const migrateAnonymousData = async () => {
    if (!isAuthenticated || !sessionUser?.id) {
      throw new Error("User must be authenticated to migrate data");
    }

    try {
      // Use the new unified migration service
      const { migrationService } = await import(
        "@/lib/migration/migration.service"
      );
      const result = await migrationService.migrate(sessionUser.id);

      if (!result.success) {
        throw new Error(result.errors.join(", "));
      }

      // Refresh storage with new authenticated client
      const authStorage = createClientStorageService(true, sessionUser.id);
      setStorage(authStorage);
    } catch (error) {
      console.error("Failed to migrate anonymous data:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await fetch("/api/auth/signout", {
        method: "POST",
        credentials: "include",
      });
      await queryClient.invalidateQueries({ queryKey: ["session"] });
      window.location.href = "/";
    } catch (error) {
      console.error("Failed to sign out:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAnonymous: !isAuthenticated && !!storage,
        isLoading,
        userId,
        user: sessionUser,
        storage,
        promptSignIn,
        migrateAnonymousData,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Hook for components that need storage
export function useStorage() {
  const { storage, isLoading } = useAuth();

  if (isLoading) {
    return { storage: null, isLoading: true };
  }

  if (!storage) {
    throw new Error("Storage not initialized");
  }

  return { storage, isLoading: false };
}
