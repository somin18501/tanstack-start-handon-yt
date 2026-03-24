import { Button, buttonVariants } from '#/components/ui/button'
import { ModeToggle } from '#/components/web/modeToggle'
import { authClient } from '#/lib/auth-client'
import { logout } from '#/lib/utils'
import { Link } from '@tanstack/react-router'
import type React from 'react'

const Navbar: React.FC = () => {
  const { data: session, isPending } = authClient.useSession()

  const signOutHandler = () => {
    logout()
  }

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <img
            src="https://tanstack.com/images/logos/logo-color-banner-600.png"
            alt="TanStack Start Logo"
            className="size-8"
          />

          <h1 className="text-lg font-semibold">Tanstack Start</h1>
        </div>
        <div className="flex items-center gap-3">
          <ModeToggle />
          {isPending ? null : session ? (
            <>
              <Button onClick={signOutHandler} variant="secondary">
                Logout
              </Button>
              <Link to="/dashboard" className={buttonVariants()}>
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={buttonVariants({ variant: 'secondary' })}
              >
                Login In
              </Link>
              <Link to="/" className={buttonVariants({ variant: 'default' })}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

export { Navbar }
