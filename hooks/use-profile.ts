import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAuth, useStorage } from "@/contexts/auth-context";
import type { UserProfile } from "@/lib/db/dynamodb.service";

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<UserProfile>;
  refreshProfile: () => Promise<void>;
  displayName: string;
}

const buildFallbackProfile = (
  updates: Partial<UserProfile>,
  userName?: string | null,
  email?: string | null
): Omit<UserProfile, "userId"> => {
  const [firstNameFromUser = "", ...rest] = (userName || "").split(" ");
  const lastNameFromUser = rest.join(" ");

  return {
    email: updates.email ?? email ?? "",
    firstName: updates.firstName ?? firstNameFromUser,
    lastName: updates.lastName ?? lastNameFromUser,
    phone: updates.phone ?? "",
    location: updates.location ?? "",
    bio: updates.bio ?? "",
    linkedinUrl: updates.linkedinUrl ?? "",
    githubUrl: updates.githubUrl ?? "",
    portfolioUrl: updates.portfolioUrl ?? "",
    skills: updates.skills ?? [],
    experience: updates.experience ?? [],
    education: updates.education ?? [],
    provider: updates.provider,
    subscriptionTier: updates.subscriptionTier,
    subscriptionExpiry: updates.subscriptionExpiry,
    createdAt: updates.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

export function useProfile(): UseProfileReturn {
  const { user, userId, isLoading: authLoading, isAuthenticated } = useAuth();
  const { storage, isLoading: storageLoading } = useStorage();
  const queryClient = useQueryClient();

  const queryKey = useMemo<(string | undefined)[]>(
    () => ["userProfile", isAuthenticated ? userId ?? "authenticated" : "anonymous"],
    [isAuthenticated, userId]
  );

  const profileQuery = useQuery<UserProfile | null>({
    queryKey,
    enabled: !authLoading && !storageLoading && !!storage,
    queryFn: async () => {
      if (!storage) {
        return null;
      }

      try {
        const profile = await storage.getUserProfile?.();
        if (profile) {
          return profile;
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        throw error;
      }

      if (!isAuthenticated) {
        return {
          userId: "local",
          ...buildFallbackProfile({}, user?.name, user?.email),
        } as UserProfile;
      }

      return null;
    },
    staleTime: 30_000,
  });

  const upsertProfileMutation = useMutation({
    mutationFn: async (updates: Partial<UserProfile>) => {
      if (!storage) {
        throw new Error("Profile storage not initialized");
      }

      const currentProfile =
        queryClient.getQueryData<UserProfile | null>(queryKey) ?? profileQuery.data;

      const saveProfile = storage.saveUserProfile?.bind(storage);
      const updateProfile = storage.updateUserProfile?.bind(storage);

      if (currentProfile && updateProfile) {
        return updateProfile(updates);
      }

      if (saveProfile) {
        const payload = buildFallbackProfile(
          { ...currentProfile, ...updates },
          user?.name,
          user?.email
        );
        return saveProfile(payload);
      }

      throw new Error("Profile methods not available");
    },
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData<UserProfile | null>(queryKey, updatedProfile);
    },
  });

  const updateProfile = async (updates: Partial<UserProfile>) => {
    return upsertProfileMutation.mutateAsync(updates);
  };

  const refreshProfile = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const profile = profileQuery.data ?? null;
  const loading = storageLoading || authLoading || profileQuery.isLoading;
  const error = profileQuery.error
    ? profileQuery.error instanceof Error
      ? profileQuery.error.message
      : "Failed to load profile"
    : null;

  const displayName = profile?.firstName
    ? profile.lastName
      ? `${profile.firstName} ${profile.lastName}`
      : profile.firstName
    : user?.name || "Anonymous";

  return {
    profile,
    loading,
    error,
    updateProfile,
    refreshProfile,
    displayName,
  };
}
