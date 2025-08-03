"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "@/components/icons"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignInPage() {
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<{
    google: boolean
    twitter: boolean
  }>({ google: false, twitter: false })

  useEffect(() => {
    const errorParam = searchParams.get("error")
    if (errorParam) {
      switch (errorParam) {
        case "OAuthSignin":
          setError("There was a problem signing in. Please try again.")
          break
        case "OAuthCallback":
          setError("There was a problem with the authentication provider. Please try again.")
          break
        case "OAuthCreateAccount":
          setError("Could not create account. Please try again.")
          break
        case "EmailCreateAccount":
          setError("Could not create account. Please try again.")
          break
        case "Callback":
          setError("There was a problem signing in. Please try again.")
          break
        default:
          setError("An unexpected error occurred. Please try again.")
      }
    }
  }, [searchParams])

  const handleSignIn = async (provider: "google" | "twitter") => {
    setIsLoading({ ...isLoading, [provider]: true })
    try {
      await signIn(provider, { callbackUrl: '/dashboard' })
    } catch (error) {
      console.error("Sign in error:", error)
      setError("Failed to sign in. Please try again.")
      setIsLoading({ ...isLoading, [provider]: false })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Welcome to Jobseek</CardTitle>
          <CardDescription className="text-center">
            Sign in to start your AI-powered job search
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSignIn("google")}
              disabled={isLoading.google || isLoading.twitter}
            >
              {isLoading.google ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.google className="mr-2 h-4 w-4" />
              )}
              Continue with Google
            </Button>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleSignIn("twitter")}
              disabled={isLoading.google || isLoading.twitter}
            >
              {isLoading.twitter ? (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Icons.twitter className="mr-2 h-4 w-4" />
              )}
              Continue with X (Twitter)
            </Button>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </CardContent>
      </Card>
    </div>
  )
}