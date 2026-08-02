"use client";

import { useEffect, useRef, useState } from "react";
import { captureException, captureMessage } from "@/lib/sentry";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useCurrency } from "@/hooks/useCurrency";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceData {
  success: boolean;
  session_id?: string;
  balance?: {
    starting: number;
    current: number;
    pnl: number;
    pnlPercentage: number;
    isPositive: boolean;
  };
  recentTrades?: Array<{
    id: string;
    symbol: string;
    side: string;
    quantity: number;
    price: number;
    total_value: number;
    created_at: string;
  }>;
  error?: string;
  message?: string;
}

export function PaperTradingCard() {
  const t = useTranslations("trading.paperTrading.card");
  const { toast } = useToast();
  const { formatByMode } = useCurrency();
  const [balance, setBalance] = useState<BalanceData["balance"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSession, setHasSession] = useState(true);
  const [state, setState] = useState<"loading" | "empty" | "success" | "error">("loading");

  // Polling management
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Error throttling
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);
  const [errorCount, setErrorCount] = useState(0);
  const lastErrorMessageRef = useRef<string>("");

  // Mobile detection
  const isMobileRef = useRef<boolean>(false);
  const POLL_INTERVAL_MS = 30000;
  const FETCH_TIMEOUT_MS = 5000;
  const ERROR_TOAST_THROTTLE_MS = 5000;

  // Detect mobile on mount
  useEffect(() => {
    isMobileRef.current = /iPhone|iPad|Android/i.test(navigator.userAgent);
  }, []);

  // Fetch with timeout protection
  const fetchWithTimeout = async (signal: AbortSignal): Promise<BalanceData> => {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch("/api/dashboard/metrics?mode=paper", {
        signal: AbortSignal.any([signal, timeoutController.signal]),
      });

      if (!response.ok) {
        if (response.status >= 500) {
          captureMessage(`Paper trading balance fetch failed: ${response.status}`, "error");
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const json = (await response.json()) as {
        ok?: boolean;
        data?: {
          totalCapital?: number;
          startingCapital?: number;
          totalPnl?: number;
        };
      };

      if (!json.ok || !json.data) {
        return { success: false };
      }

      const { totalCapital = 0, startingCapital = 0, totalPnl = 0 } = json.data;
      const pnlPercentage = startingCapital > 0 ? (totalPnl / startingCapital) * 100 : 0;

      return {
        success: true,
        balance: {
          starting: startingCapital,
          current: totalCapital,
          pnl: totalPnl,
          pnlPercentage,
          isPositive: totalPnl >= 0,
        },
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Throttled error toast
  const showErrorToast = (message: string) => {
    const now = Date.now();
    const timeSinceLastError = now - lastErrorTime;

    if (timeSinceLastError > ERROR_TOAST_THROTTLE_MS || message !== lastErrorMessageRef.current) {
      lastErrorMessageRef.current = message;
      setLastErrorTime(now);
      setErrorCount(1);
      toast({
        title: t("loading"),
        description: message,
        variant: "destructive",
      });
    } else {
      setErrorCount((c) => c + 1);
    }
  };

  const fetchBalance = async (signal: AbortSignal) => {
    try {
      const data = await fetchWithTimeout(signal);

      if (!data.success || !data.balance) {
        setHasSession(false);
        setState("empty");
        setBalance(null);
        return;
      }

      setBalance(data.balance);
      setHasSession(true);
      setState("success");
      setIsLoading(false);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      const errorMsg = error instanceof Error ? error.message : String(error);

      captureException(error, {
        tags: {
          component: "PaperTradingCard",
          endpoint: "dashboard/metrics?mode=paper",
          errorType: errorMsg.includes("timeout") ? "network_timeout" : "network_error",
        },
        extra: {
          isMobile: isMobileRef.current,
          errorMessage: errorMsg,
          errorCount: errorCount + 1,
        },
      });

      showErrorToast(
        errorMsg.includes("timeout")
          ? "Nettverket er tregt. Prøver igjen..."
          : "Kunne ikke hente saldo. Sjekk internettforbindelsen.",
      );

      setState("error");
      setIsLoading(false);
    }
  };

  const scheduleNextPoll = (signal: AbortSignal) => {
    const interval = isMobileRef.current ? POLL_INTERVAL_MS * 2 : POLL_INTERVAL_MS;

    pollingTimeoutRef.current = setTimeout(() => {
      if (!signal.aborted) {
        fetchBalance(signal);
      }
    }, interval);
  };

  // Initial fetch + polling setup
  useEffect(() => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    fetchBalance(controller.signal).then(() => {
      if (!controller.signal.aborted) {
        scheduleNextPoll(controller.signal);
      }
    });

    return () => {
      controller.abort();
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, []);

  // Render states
  if (state === "empty") {
    return (
      <div className="p-6 border border-kp-border rounded-lg bg-kp-bg-secondary">
        <p className="text-kp-text-secondary">{t("empty")}</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="p-6 border border-kp-danger/30 rounded-lg bg-kp-danger flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-kp-danger" />
        <p className="text-kp-danger">{t("error")}</p>
      </div>
    );
  }

  if (state === "loading" || !balance) {
    return (
      <div className="p-6 border border-kp-border rounded-lg bg-kp-bg-secondary flex items-center gap-3">
        <Loader2 className="w-5 h-5 text-kp-text-muted animate-spin" />
        <p className="text-kp-text-secondary">{t("loading")}</p>
      </div>
    );
  }

  // Success render
  return (
    <div className="p-6 border border-kp-border rounded-lg bg-kp-bg-secondary">
      <div className="space-y-4">
        <div>
          <p className="text-sm text-kp-text-muted">{t("currentBalance")}</p>
          <p className="text-2xl font-bold text-kp-text-primary">
            {formatByMode(balance.current, "paper")}
          </p>
          <p className="text-[11px] text-kp-text-muted/70 mt-0.5 leading-tight">
            Urealisert verdi — endres med markedet hvert sekund. Handler er ikke solgt ennå.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-kp-text-muted">{t("startingCapital")}</p>
            <p className="text-sm font-semibold text-kp-text-primary">
              {formatByMode(balance.starting, "paper")}
            </p>
          </div>
          <div>
            <p className="text-xs text-kp-text-muted">{t("pnl")} <span className="text-kp-text-muted/60">(urealisert)</span></p>
            <p
              className={cn(
                "text-sm font-semibold",
                balance.isPositive ? "text-kp-success" : "text-kp-danger",
              )}
            >
              {balance.isPositive ? "+" : ""}
              {formatByMode(Math.abs(balance.pnl), "paper")}
              {" "}({(balance.pnlPercentage ?? 0).toFixed(2)}%)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PaperTradingCard;
