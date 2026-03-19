/**
 * React Query Provider - bare minimum for Next.js 15
 * Avoids "Cannot read properties of undefined (reading 'call')" by using
 * simplest possible setup per TanStack docs.
 */

'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export default QueryProvider;
