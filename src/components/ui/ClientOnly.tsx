import { useClientOnly } from "@/lib/hooks/useClientOnly";

interface ClientOnlyProps {
  children: React.ReactNode;
  /** Fallback vist under SSR / hydration */
  fallback?: React.ReactNode;
}

/**
 * Wrapper som kun renderer children på klienten
 * Hindrer hydration mismatch på dynamisk innhold
 * 
 * @example
 * <ClientOnly fallback={<div>Loading...</div>}>
 *   {new Date().toLocaleDateString()}
 * </ClientOnly>
 */
export function ClientOnly({ 
  children, 
  fallback = null 
}: ClientOnlyProps) {
  const isClient = useClientOnly();

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
