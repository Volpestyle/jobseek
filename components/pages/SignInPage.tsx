import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ANONYMOUS_SESSION_FLAG_KEY } from "@/lib/auth/anonymous-client";

interface Provider {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl?: string;
}

export function SignInPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [isAnonymousLoading, setIsAnonymousLoading] = useState(false);
  const [anonymousError, setAnonymousError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProviders() {
      try {
        const response = await fetch("/api/auth/providers", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load providers");
        }

        const data: Record<string, Provider> = await response.json();
        const availableProviders = Object.values(data).filter(
          (provider) => provider.type !== "credentials"
        );

        if (isMounted) {
          setProviders(availableProviders);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to fetch auth providers", err);
          setError("Unable to load sign-in options.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProviders();

    async function loadCsrfToken() {
      try {
        const response = await fetch("/api/auth/csrf", {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to load CSRF token");
        }

        const data = (await response.json()) as { csrfToken?: string };
        if (isMounted) {
          setCsrfToken(data?.csrfToken ?? null);
        }
      } catch (err) {
        console.error("Failed to fetch CSRF token", err);
        if (isMounted) {
          setCsrfToken(null);
        }
      }
    }

    loadCsrfToken();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-6 rounded-lg border border-border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Sign in to Jobseek</h1>
          <p className="text-sm text-muted-foreground">
            Connect your account to sync searches, saved jobs, and applications across devices.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center text-sm text-muted-foreground">
            Loading providers...
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : providers.length === 0 ? (
          <div className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
            No sign-in providers are configured for this environment. Check your environment variables or contact the administrator.
          </div>
        ) : (
          <div className="space-y-3">
            {providers.map((provider) => (
              <Button
                key={provider.id}
                className="w-full"
                variant="default"
                disabled={!csrfToken}
                onClick={() => {
                  if (!csrfToken) {
                    setError("Unable to start sign-in. Refresh the page and try again.");
                    return;
                  }

                  const form = document.createElement("form");
                  form.method = "POST";
                  form.action = provider.signinUrl;

                  const csrfInput = document.createElement("input");
                  csrfInput.type = "hidden";
                  csrfInput.name = "csrfToken";
                  csrfInput.value = csrfToken;
                  form.appendChild(csrfInput);

                  const callbackInput = document.createElement("input");
                  callbackInput.type = "hidden";
                  callbackInput.name = "callbackUrl";
                  callbackInput.value = window.location.origin;
                  form.appendChild(callbackInput);

                  document.body.appendChild(form);
                  form.submit();
                }}
              >
                Continue with {provider.name}
              </Button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          <div className="relative flex items-center">
            <span className="flex-1 border-t border-border" aria-hidden="true" />
            <span className="px-2 text-xs uppercase tracking-wide text-muted-foreground">
              or continue without an account
            </span>
            <span className="flex-1 border-t border-border" aria-hidden="true" />
          </div>

          <Button
            variant="outline"
            className="w-full"
            disabled={isAnonymousLoading}
            onClick={async () => {
              setAnonymousError(null);
              setIsAnonymousLoading(true);
              try {
                const response = await fetch("/api/auth/anonymous", {
                  method: "GET",
                  credentials: "include",
                });

                if (!response.ok) {
                  const payload = await response.json().catch(() => ({}));
                  const message =
                    typeof payload?.error === "string"
                      ? payload.error
                      : "Failed to start anonymous session";
                  throw new Error(message);
                }

                window.localStorage.setItem(ANONYMOUS_SESSION_FLAG_KEY, "true");
                window.location.href = "/dashboard";
              } catch (anonError) {
                console.error("Failed to start anonymous session", anonError);
                setAnonymousError(
                  anonError instanceof Error
                    ? anonError.message
                    : "Failed to start anonymous session"
                );
              } finally {
                setIsAnonymousLoading(false);
              }
            }}
          >
            {isAnonymousLoading ? "Creating anonymous session..." : "Continue as anonymous"}
          </Button>

          {anonymousError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {anonymousError}
            </div>
          ) : null}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Trouble signing in? Email support@jobseek.app for assistance.
        </p>
      </div>
    </main>
  );
}
