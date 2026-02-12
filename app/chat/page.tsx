'use client'

import { AuthenticatedLayout } from '@/components/authenticated-layout'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { ChatList } from '@/components/chat/chat-list'
import { useEffect } from 'react'

export default function ChatPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // If no user, redirect will happen via AuthenticatedLayout
    if (!user) return

    // Role-based access check
    const allowedRoles = ['BD', 'INSURANCE', 'INSURANCE_HEAD', 'PL_HEAD', 'PL_ENTRY', 'PL_VIEWER', 'ACCOUNTS', 'ADMIN']
    if (!allowedRoles.includes(user.role)) {
      router.push('/')
      return
    }
  }, [user, router])

  if (!user) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Please log in to access chat</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  // Role-based access check
  const allowedRoles = ['BD', 'INSURANCE', 'INSURANCE_HEAD', 'PL_HEAD', 'PL_ENTRY', 'PL_VIEWER', 'ACCOUNTS', 'ADMIN']
  if (!allowedRoles.includes(user.role)) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">You don't have access to chat</div>
        </div>
      </AuthenticatedLayout>
    )
  }

  return (
    <AuthenticatedLayout>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* Left Sidebar - Chat List */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold">Chats</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ChatList />
          </div>
        </div>

        {/* Center - Empty State */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">Select a conversation to start chatting</p>
            <p className="text-sm text-muted-foreground">Choose a patient from the list on the left</p>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  )
}
