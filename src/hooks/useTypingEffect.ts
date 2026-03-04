'use client';

import { useState, useEffect, useRef } from 'react';

interface UseTypingEffectOptions {
  text: string;
  speed?: number; // ms per character
  delay?: number; // ms before starting
  onComplete?: () => void;
  enabled?: boolean;
}

export function useTypingEffect({
  text,
  speed = 25,
  delay = 800,
  onComplete,
  enabled = true,
}: UseTypingEffectOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isDelayed, setIsDelayed] = useState(true);
  const indexRef = useRef(0);
  const delayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const typeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Reset state when text changes
    setDisplayedText('');
    setIsTyping(false);
    setIsDelayed(true);
    indexRef.current = 0;

    // Clear any existing timers
    if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
    if (typeTimerRef.current) clearInterval(typeTimerRef.current);

    if (!enabled) {
      setDisplayedText(text);
      setIsDelayed(false);
      return;
    }

    // Delay before starting to type
    delayTimerRef.current = setTimeout(() => {
      setIsDelayed(false);
      setIsTyping(true);

      // Start typing
      typeTimerRef.current = setInterval(() => {
        if (indexRef.current < text.length) {
          setDisplayedText((prev) => prev + text.charAt(indexRef.current));
          indexRef.current++;
        } else {
          setIsTyping(false);
          if (typeTimerRef.current) clearInterval(typeTimerRef.current);
          if (onComplete) onComplete();
        }
      }, speed);
    }, delay);

    return () => {
      if (delayTimerRef.current) clearTimeout(delayTimerRef.current);
      if (typeTimerRef.current) clearInterval(typeTimerRef.current);
    };
  }, [text, speed, delay, enabled, onComplete]);

  return { displayedText, isTyping, isDelayed };
}

// Helper to clean citations from AI text
export function cleanCitations(text: string): string {
  // Remove citation numbers like [1], [2], [3], etc.
  // Also handle ranges like [1-3] or multiple in same bracket like [1, 2, 3]
  return text
    .replace(/\[\d+(?:[-,]\s*\d+)*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
