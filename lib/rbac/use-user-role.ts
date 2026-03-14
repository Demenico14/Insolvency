'use client'

import useSWR from 'swr'
import { UserWithRole } from './types'

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch user role')
  return res.json()
}

export function useUserWithRole() {
  const { data, error, isLoading, mutate } = useSWR<{ user: UserWithRole | null }>(
    '/api/auth/user-role',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 30000, // 30 seconds
    }
  )

  return {
    user: data?.user || null,
    isLoading,
    error,
    mutate,
    role: data?.user?.role || null,
    permissions: data?.user?.permissions || [],
    isSupervisor: data?.user?.role === 'supervisor',
    isGeneralUser: data?.user?.role === 'general_user',
  }
}
