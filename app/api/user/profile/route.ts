import { NextResponse } from "next/server";
import { withAuthOrAnonToken } from "@/lib/auth/api-wrappers";
import { storageService } from "@/lib/storage/storage.service";
import type { UserProfile } from "@/lib/db/dynamodb.service";

export const GET = withAuthOrAnonToken(async (request, context, { user }) => {
  try {
    if (!user.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const storage = await storageService.getStorageForUser(user.userId);
    if (!storage || !storage.getUserProfile) {
      return NextResponse.json(
        { error: "Storage not available" },
        { status: 500 }
      );
    }

    const profile = await storage.getUserProfile(user.userId);

    if (!profile) {
      // Return a default profile if none exists yet
      return NextResponse.json({
        userId: user.userId,
        email: user.email || "",
        firstName: "",
        lastName: "",
        avatarUrl: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
});

export const PUT = withAuthOrAnonToken(async (request, context, { user }) => {
  try {
    if (!user.isAuthenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updates = await request.json();

    // Remove fields that shouldn't be updated directly
    delete updates.userId;
    delete updates.createdAt;
    delete updates.provider;

    // Validate input
    if (updates.email && !isValidEmail(updates.email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    if (updates.phone && !isValidPhone(updates.phone)) {
      return NextResponse.json(
        { error: "Invalid phone format" },
        { status: 400 }
      );
    }

    const storage = await storageService.getStorageForUser(user.userId);
    if (
      !storage ||
      !storage.getUserProfile ||
      !storage.updateUserProfile ||
      !storage.saveUserProfile
    ) {
      return NextResponse.json(
        { error: "Storage not available" },
        { status: 500 }
      );
    }

    // Check if profile exists
    const existingProfile = await storage.getUserProfile(user.userId);

    let profile: UserProfile;
    if (existingProfile) {
      // Update existing profile
      profile = await storage.updateUserProfile(user.userId, updates);
    } else {
      // Create new profile
      profile = await storage.saveUserProfile({
        userId: user.userId,
        email: user.email || updates.email || "",
        firstName: updates.firstName || "",
        lastName: updates.lastName || "",
        avatarUrl: updates.avatarUrl || "",
        ...updates,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
});

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone: string): boolean {
  // Basic phone validation - adjust based on your requirements
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 10;
}
