import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Briefcase, Search, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6" />
            <span className="text-xl font-bold">Jobseek</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/auth/signin">
              <Button>Sign In</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              AI-Powered Job Search
              <span className="text-primary"> Made Simple</span>
            </h1>
            <p className="mb-8 text-lg text-muted-foreground sm:text-xl">
              Let AI handle the heavy lifting while you focus on landing your dream job. 
              Automated applications, intelligent matching, and real-time tracking.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Job Search
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              No sign-up required. Your data is stored locally and can be synced later.
            </p>
          </div>
        </section>

        <section className="border-t bg-muted/50 py-24">
          <div className="container">
            <h2 className="mb-12 text-center text-3xl font-bold">How It Works</h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Smart Search</h3>
                <p className="text-muted-foreground">
                  AI-powered search across multiple job boards simultaneously
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Auto Apply</h3>
                <p className="text-muted-foreground">
                  Automatically apply to jobs that match your criteria
                </p>
              </div>
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Briefcase className="h-8 w-8 text-primary" />
                  </div>
                </div>
                <h3 className="mb-2 text-xl font-semibold">Track Progress</h3>
                <p className="text-muted-foreground">
                  Monitor applications and get real-time updates
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © 2024 Jobseek. All rights reserved.
        </div>
      </footer>
    </div>
  )
}