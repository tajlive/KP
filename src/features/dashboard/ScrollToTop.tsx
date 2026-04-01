'use client';

import { useEffect } from 'react';

export function ScrollToTop() {
  useEffect(() => {
    // Scroll to top when component mounts (page loads)
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return null;
}
