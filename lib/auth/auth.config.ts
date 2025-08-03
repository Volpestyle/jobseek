import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import Twitter from "next-auth/providers/twitter"
import { UserProfile, dynamodbService } from "@/lib/db/dynamodb.service"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code"
        }
      }
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false

      try {
        // Check if user already exists
        const existingProfile = await dynamodbService.getUserProfile(user.id!)

        // Extract provider-specific data
        let providerData: Partial<UserProfile> = {}

        if (account?.provider === 'google' && profile) {
          // Google provides verified email, given_name, family_name, locale
          providerData = {
            firstName: (profile as any).given_name || user.name?.split(' ')[0] || '',
            lastName: (profile as any).family_name || user.name?.split(' ').slice(1).join(' ') || '',
            avatarUrl: (profile as any).picture || user.image || undefined,
            location: (profile as any).locale || undefined,
          }
        } else if (account?.provider === 'twitter' && profile) {
          // Twitter/X provides username, bio, location, profile_image_url
          providerData = {
            firstName: user.name?.split(' ')[0] || '',
            lastName: user.name?.split(' ').slice(1).join(' ') || '',
            avatarUrl: (profile as any).profile_image_url_https || user.image || undefined,
            bio: (profile as any).description || undefined,
            location: (profile as any).location || undefined,
            portfolioUrl: (profile as any).url || undefined, // Often contains personal website
          }
        }

        // Create or update user profile in DynamoDB
        const profileData: UserProfile = {
          userId: user.id!,
          email: user.email,
          provider: account?.provider,
          ...providerData,
          // Preserve existing data if updating
          ...(existingProfile ? {
            createdAt: existingProfile.createdAt,
            // Don't overwrite these fields if they already exist
            phone: existingProfile.phone || undefined,
            linkedinUrl: existingProfile.linkedinUrl || undefined,
            githubUrl: existingProfile.githubUrl || undefined,
            skills: existingProfile.skills || undefined,
            experience: existingProfile.experience || undefined,
            education: existingProfile.education || undefined,
            resumeUrl: existingProfile.resumeUrl || undefined,
          } : {
            createdAt: new Date().toISOString(),
          }),
          updatedAt: new Date().toISOString(),
        }

        await dynamodbService.saveUserProfile(profileData)
        return true
      } catch (error) {
        console.error('Failed to create/update user profile:', error)
        return false
      }
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.sub = user.id
        // Store provider info for first-time setup
        if (account) {
          token.provider = account.provider
        }
      }
      return token
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
})

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
}