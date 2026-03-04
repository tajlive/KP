'use client'

// Re-export from AuthContext for consistency
// This ensures all components use the same auth state
export { useAuth, useAuthSafe } from '@/components/auth/AuthContext'
