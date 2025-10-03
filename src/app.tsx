import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
  RouterProvider,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  useNavigate,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/router-devtools";
import { useEffect, useRef, type ReactNode } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { Providers as AppProviders } from "@/components/providers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { MigrationCheck } from "@/components/migration-check";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { JobSearchPage } from "@/components/pages/JobSearchPage";
import { ActiveSearchesPage } from "@/components/pages/ActiveSearchesPage";
import { JobManagementPage } from "@/components/pages/JobManagementPage";
import { ProfilePage } from "@/components/pages/ProfilePage";
import { SettingsPage } from "@/components/pages/SettingsPage";
import { SessionDetailsPage } from "@/components/pages/SessionDetailsPage";
import { SignInPage } from "@/components/pages/SignInPage";
import { useAuth } from "@/contexts/auth-context";
import { useAnonymousSession } from "@/hooks/use-anonymous-session";
import { toast, Toaster } from "sonner";
import { ANONYMOUS_SESSION_FLAG_KEY } from "@/lib/auth/anonymous-client";

export interface RouterContext {
  queryClient: QueryClient;
}

const queryClient = new QueryClient();

const RootLayout = () => (
  <ThemeProvider defaultTheme="dark" disableTransitionOnChange>
    <AppProviders>
      <div className="min-h-screen bg-background text-foreground">
        <Outlet />
        <Toaster position="top-center" richColors />
      </div>
    </AppProviders>
  </ThemeProvider>
);

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  loader: () => redirect({ to: "/dashboard" }),
  component: IndexPage,
});

const authSignInRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "auth/signin",
  component: SignInPage,
});

const DashboardShell = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { isInitialized: isAnonInitialized, hasAnonymousSession } = useAnonymousSession();
  const navigate = useNavigate();
  const redirectRef = useRef(false);

  useEffect(() => {
    if (redirectRef.current) return;
    if (isLoading || !isAnonInitialized) return;

    if (isAuthenticated || hasAnonymousSession) {
      return;
    }

    const hadAnonymousSessionBefore =
      typeof window !== "undefined" &&
      window.localStorage.getItem(ANONYMOUS_SESSION_FLAG_KEY) === "true";

    if (hadAnonymousSessionBefore) {
      toast.error("Your session expired. Please sign in.");
    }

    redirectRef.current = true;
    navigate({ to: "/auth/signin" as const, replace: true });
  }, [
    hasAnonymousSession,
    isAuthenticated,
    isAnonInitialized,
    isLoading,
    navigate,
  ]);

  if (isLoading || !isAnonInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  if (!isAuthenticated && !hasAnonymousSession) {
    return null;
  }

  const safeUser = user || { name: null, email: null, image: null };

  return (
    <SidebarProvider>
      <DashboardSidebar user={safeUser} />
      <SidebarInset>
        <DashboardHeader />
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </SidebarInset>
      <MigrationCheck />
    </SidebarProvider>
  );
};

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardShell,
});

const dashboardOverviewRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "/",
  component: OverviewPage,
});

const dashboardJobSearchRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "job-search",
  component: JobSearchPage,
});

const dashboardActiveSearchesRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "active-searches",
  component: ActiveSearchesPage,
});

const dashboardJobManagementRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "job-management",
  component: JobManagementPage,
});

const dashboardProfileRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "profile",
  component: ProfilePage,
});

const dashboardSettingsRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "settings",
  component: SettingsPage,
});

const dashboardSessionRoute = createRoute({
  getParentRoute: () => dashboardRoute,
  path: "active-searches/$sessionId",
  component: SessionDetailsPage,
});

dashboardRoute.addChildren([
  dashboardOverviewRoute,
  dashboardJobSearchRoute,
  dashboardActiveSearchesRoute,
  dashboardJobManagementRoute,
  dashboardProfileRoute,
  dashboardSettingsRoute,
  dashboardSessionRoute,
]);

const routeTree = rootRoute.addChildren([indexRoute, authSignInRoute, dashboardRoute]);

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App({ devtools = true }: { devtools?: boolean }) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} context={{ queryClient }} />
      {devtools && (
        <Devtools>
          <TanStackRouterDevtools router={router} position="bottom-right" />
          <ReactQueryDevtools buttonPosition="bottom-left" initialIsOpen={false} />
        </Devtools>
      )}
    </QueryClientProvider>
  );
}

function Devtools({ children }: { children: ReactNode }) {
  if (import.meta.env.PROD) return null;
  return <>{children}</>;
}

function IndexPage() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="space-y-4 text-center">
        <h1 className="text-3xl font-semibold">Jobseek</h1>
        <p className="text-muted-foreground">
          TanStack Router + React Query skeleton is ready. Begin migrating routes and data loaders here.
        </p>
      </div>
    </main>
  );
}
