import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { storageService } from "@/lib/storage/storage.service";
import type { UserProfile } from "@/lib/db/dynamodb.service";

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  displayName: string;
}

export function useProfile(): UseProfileReturn {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (status === "loading") return;

    try {
      setLoading(true);
      setError(null);

      const userId = session?.user?.id || "local";
      const storage = await storageService.getStorageForUser(
        session?.user?.id || null
      );

      if (storage.getUserProfile) {
        const data = await storage.getUserProfile(userId);
        setProfile(data);
      } else if (!session?.user?.id) {
        // For unauthenticated users, create a default profile structure
        setProfile({
          userId: "local",
          email: "",
          firstName: "",
          lastName: "",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as UserProfile);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, status]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      try {
        setError(null);

        const userId = session?.user?.id || "local";
        const storage = await storageService.getStorageForUser(
          session?.user?.id || null
        );

        if (!storage.updateUserProfile || !storage.saveUserProfile) {
          throw new Error("Profile methods not available");
        }

        let updatedProfile: UserProfile;

        if (profile) {
          // Update existing profile
          updatedProfile = await storage.updateUserProfile(userId, updates);
        } else {
          // Create new profile
          updatedProfile = await storage.saveUserProfile({
            userId,
            email: session?.user?.email || updates.email || "",
            firstName:
              updates.firstName || session?.user?.name?.split(" ")[0] || "",
            lastName:
              updates.lastName ||
              session?.user?.name?.split(" ").slice(1).join(" ") ||
              "",
            avatarUrl: updates.avatarUrl || session?.user?.image,
            ...updates,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as UserProfile);
        }

        setProfile(updatedProfile);
      } catch (err) {
        console.error("Error updating profile:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update profile";
        setError(errorMessage);
        throw err;
      }
    },
    [session?.user, profile]
  );

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // Compute display name
  const displayName = profile?.firstName
    ? `${profile.firstName}${profile.lastName ? " " + profile.lastName : ""}`
    : session?.user?.name || "Anonymous";

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
    displayName,
  };
}
