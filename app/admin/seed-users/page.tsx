'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { apiPost } from '@/lib/api-client'
import { toast } from 'sonner'
import { Loader2, Users } from 'lucide-react'

interface SeedUser {
  role: string
  email: string
  password?: string
}

interface SeedResult {
  message: string
  users: SeedUser[]
}

export default function SeedUsersPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<SeedResult | null>(null)

  const handleSeed = async () => {
    setIsLoading(true)
    try {
      const data = await apiPost<SeedResult>('/api/admin/seed-users', {})
      setResult(data)
      toast.success('Users created successfully!')
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to seed users')
      } else {
        toast.error('Failed to seed users')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Seed Initial Users
            </CardTitle>
            <CardDescription>
              Create default users for testing and initial setup
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This will create default users with the following roles:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Admin</li>
              <li>Sales Head</li>
              <li>BD (Business Development)</li>
              <li>Insurance Head</li>
              <li>P/L Head</li>
              <li>HR Head</li>
            </ul>

            <Button
              onClick={handleSeed}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating users...
                </>
              ) : (
                'Create Default Users'
              )}
            </Button>

            {result && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h3 className="font-semibold mb-3 text-green-900 dark:text-green-100">
                  Users Created Successfully!
                </h3>
                <div className="space-y-2 text-sm">
                  {result.users?.map((user, idx) => (
                    <div key={idx} className="p-2 bg-white dark:bg-gray-800 rounded border">
                      <div className="font-medium">{user.role}</div>
                      <div className="text-muted-foreground">
                        Email: <span className="font-mono">{user.email}</span>
                      </div>
                      <div className="text-muted-foreground">
                        Password: <span className="font-mono">{user.password}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                    ⚠️ Important: Change all passwords after first login!
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}






