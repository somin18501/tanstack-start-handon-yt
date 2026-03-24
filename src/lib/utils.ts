import { authClient } from '#/lib/auth-client'
import { clsx, type ClassValue } from 'clsx'
import { toast } from 'sonner'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function logout(params?: { onSignOut?: () => void }) {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        // Redirect to home page after successful sign out
        params?.onSignOut?.()
        toast.success('Signed out successfully')
      },
      onError: ({ error }) => {
        toast.error(error.message)
      },
    },
  })
}
