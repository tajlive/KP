// Mock for next/navigation
'use client';

export function useRouter() {
  return {
    push: () => {},
    replace: () => {},
    refresh: () => {},
    back: () => {},
    forward: () => {},
    prefetch: () => Promise.resolve(),
  };
}

export function usePathname() {
  return '/';
}

export function useSearchParams() {
  return new URLSearchParams();
}

export function useParams() {
  return {};
}

export function redirect(url: string) {
  console.log('Redirect to:', url);
}

export function permanentRedirect(url: string) {
  console.log('Permanent redirect to:', url);
}
