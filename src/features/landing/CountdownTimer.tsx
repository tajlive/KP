'use client';

import { useState, useEffect } from 'react';

interface CountdownTimerProps {
  className?: string;
  onExpire?: () => void;
}

export default function CountdownTimer({ className = '', onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  }>({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Calculate next reset time (every 6 hours)
    const now = new Date();
    const currentHour = now.getHours();
    const nextResetHour = Math.ceil(currentHour / 6) * 6;
    
    const calculateTimeLeft = () => {
      const now = new Date();
      const resetTime = new Date();
      
      // If next reset is today
      if (nextResetHour < 24) {
        resetTime.setHours(nextResetHour, 0, 0, 0);
      } else {
        // Next day
        resetTime.setDate(resetTime.getDate() + 1);
        resetTime.setHours(0, 0, 0, 0);
      }

      const diff = resetTime.getTime() - now.getTime();

      if (diff <= 0) {
        if (onExpire) onExpire();
        return { hours: 6, minutes: 0, seconds: 0 };
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [onExpire]);

  const padZero = (num: number) => num.toString().padStart(2, '0');

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm font-medium opacity-80">⏰ UTLØPER OM:</span>
      <div className="flex items-center gap-1">
        <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded font-mono font-bold">
          {padZero(timeLeft.hours)}
        </div>
        <span className="font-bold">:</span>
        <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded font-mono font-bold">
          {padZero(timeLeft.minutes)}
        </div>
        <span className="font-bold">:</span>
        <div className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded font-mono font-bold">
          {padZero(timeLeft.seconds)}
        </div>
      </div>
    </div>
  );
}
