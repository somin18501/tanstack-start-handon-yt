import type { User } from 'better-auth'
import type { LucideIcon } from 'lucide-react'

export type Item = {
  title: string
  to: string
  icon: LucideIcon
  activeOptions?: {
    exact?: boolean
  }
}

export interface NavUserProps {
  user: User
}

export type BulkScrapeProgress = {
  completed: number
  total: number
  url: string
  status: 'success' | 'failed'
}
