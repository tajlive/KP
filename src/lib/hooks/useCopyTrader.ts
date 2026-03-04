"use client";

import { getErrorMessage } from "@/lib/utils/error";
import { useState } from "react";

interface CopyTraderResult {
  success: boolean;
  message?: string;
  error?: string;
}

export function useCopyTrader() {
  const [isCopying, setIsCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeCopy = async (leaderId: string): Promise<CopyTraderResult> => {
    setIsCopying(true);
    setError(null);

    try {
      const response = await fetch("/api/auto-trading/copy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "start",
          leaderId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Feil ved start av kopiering");
      }

      return {
        success: true,
        message: data.message || "Kopiering startet vellykket",
      };
    } catch (err) {
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setIsCopying(false);
    }
  };

  return {
    executeCopy,
    isCopying,
    error,
  };
}
