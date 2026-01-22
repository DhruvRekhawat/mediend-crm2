'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import Image from 'next/image'
import logo from '@/public/logo-mediend.png'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoggingIn } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await login({ email, password })
      // Success is handled by the hook (redirects to dashboard)
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'Login failed')
      } else {
        toast.error('Login failed. Please check your credentials and try again.')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <header className="w-full border-b border-white/10 bg-[#062D4C]">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
          <div className="relative h-8 w-32 shrink-0">
            <Image src={logo} alt="Mediend" fill className="object-contain" priority />
          </div>
          <div className="ml-auto text-xs font-medium tracking-wide text-white/70">
            CRM Workspace
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-slate-200/70 shadow-lg dark:border-white/10">
            <CardHeader className="space-y-2">
              <CardTitle className="text-2xl font-semibold tracking-tight">Sign in</CardTitle>
              <CardDescription>Use your Mediend account credentials to continue.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoggingIn}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoggingIn}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#062D4C] text-white hover:bg-[#08385f]"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Need access? Contact your admin.
          </p>
        </div>
      </main>
    </div>
  )
}

