import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Twitter from "next-auth/providers/twitter";
import { UserProfile, dynamodbService } from "@/lib/db/dynamodb.service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      try {
        // Check if user already exists
        const existingProfile = await dynamodbService.getUserProfile(user.id!);

        // Extract provider-specific data
        let providerData: Partial<UserProfile> = {};

        if (account?.provider === "google" && profile) {
          // Google provides verified email, given_name, family_name, locale
          providerData = {
            firstName: profile.given_name || user.name?.split(" ")[0] || "",
            lastName:
              profile.family_name ||
              user.name?.split(" ").slice(1).join(" ") ||
              "",
            avatarUrl: profile.picture || user.image,
            location: profile.locale as string,
          };
        } else if (account?.provider === "twitter" && profile) {
          // Twitter/X provides username, bio, location, profile_image_url
          providerData = {
            firstName: user.name?.split(" ")[0] || "",
            lastName: user.name?.split(" ").slice(1).join(" ") || "",
            avatarUrl:
              (profile.profile_image_url_https as string) ||
              (user.image as string),
            bio: profile.description as string,
            location: profile.location as string,
            portfolioUrl: profile.url as string, // Often contains personal website
          };
        }

        // Create or update user profile in DynamoDB
        const profileData: UserProfile = {
          // Always update these core fields
          userId: user.id!,
          email: user.email,
          provider: account?.provider,
          updatedAt: new Date().toISOString(),

          // Set createdAt only for new profiles
          createdAt: existingProfile?.createdAt || new Date().toISOString(),

          // Merge provider data with existing data
          ...existingProfile, // Keep all existing fields
          ...providerData, // Override with fresh provider data (name, avatar, etc.)
        };

        await dynamodbService.saveUserProfile(profileData);
        return true;
      } catch (error) {
        console.error("Failed to create/update user profile:", error);
        return false;
      }
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
      }
      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id;
        // Store provider info for first-time setup
        if (account) {
          token.provider = account.provider;
        }
      }
      return token;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
});
