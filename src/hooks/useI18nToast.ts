"use client";

/**
 * useI18nToast - KLA-81
 * Hook som wrapper sonner-toast med i18n-støtte
 * Erstatter hardkodede toast-meldinger med oversatte versjoner
 */

import { toast as sonnerToast } from "sonner";
import { useTranslations } from "next-intl";
import { useCallback } from "react";

type ToastType = "success" | "error" | "info" | "warning" | "loading";

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Hook for å vise toast-meldinger med i18n-støtte
 *
 * @example
 * const { t, success, error } = useI18nToast();
 *
 * // Med i18n-nøkkel:
 * success("strategy.saved");
 * error("auth.loginFailed");
 *
 * // Med variabler:
 * success("copyTrading.traderFollowed", { name: "John" });
 */
export function useI18nToast() {
  const t = useTranslations("common");

  const showToast = useCallback(
    (
      type: ToastType,
      key: string,
      variables?: Record<string, string | number>,
      options?: ToastOptions,
    ) => {
      const message =
        variables && Object.keys(variables).length > 0
          ? t(key as never, variables as Record<string, string> as never)
          : t(key as never);
      const description = options?.description
        ? t(options.description as never)
        : undefined;

      switch (type) {
        case "success":
          return sonnerToast.success(message, { description, ...options });
        case "error":
          return sonnerToast.error(message, { description, ...options });
        case "info":
          return sonnerToast.info(message, { description, ...options });
        case "warning":
          return sonnerToast.warning(message, { description, ...options });
        case "loading":
          return sonnerToast.loading(message, { description, ...options });
        default:
          return sonnerToast(message, { description, ...options });
      }
    },
    [t],
  );

  const success = useCallback(
    (
      key: string,
      variables?: Record<string, string | number>,
      options?: ToastOptions,
    ) => {
      return showToast("success", key, variables, options);
    },
    [showToast],
  );

  const error = useCallback(
    (
      key: string,
      variables?: Record<string, string | number>,
      options?: ToastOptions,
    ) => {
      return showToast("error", key, variables, options);
    },
    [showToast],
  );

  const info = useCallback(
    (
      key: string,
      variables?: Record<string, string | number>,
      options?: ToastOptions,
    ) => {
      return showToast("info", key, variables, options);
    },
    [showToast],
  );

  const warning = useCallback(
    (
      key: string,
      variables?: Record<string, string | number>,
      options?: ToastOptions,
    ) => {
      return showToast("warning", key, variables, options);
    },
    [showToast],
  );

  const loading = useCallback(
    (
      key: string,
      variables?: Record<string, string | number>,
      options?: ToastOptions,
    ) => {
      return showToast("loading", key, variables, options);
    },
    [showToast],
  );

  // Helper for å vise standard error-melding
  const showError = useCallback(
    (fallbackMessage?: string) => {
      return sonnerToast.error(fallbackMessage || t("toasts.general.error"));
    },
    [t],
  );

  // Helper for å vise standard success-melding
  const showSuccess = useCallback(
    (fallbackMessage?: string) => {
      return sonnerToast.success(fallbackMessage || t("toasts.general.saved"));
    },
    [t],
  );

  return {
    t,
    toast: showToast,
    success,
    error,
    info,
    warning,
    loading,
    showError,
    showSuccess,
  };
}

/**
 * Standard toast-funksjon uten i18n (for bruk utenfor React-komponenter)
 * Disse skal gradvis erstattes med useI18nToast
 */
export const toast = {
  success: sonnerToast.success,
  error: sonnerToast.error,
  info: sonnerToast.info,
  warning: sonnerToast.warning,
  loading: sonnerToast.loading,
  message: sonnerToast,
  dismiss: sonnerToast.dismiss,
  promise: sonnerToast.promise,
};

export default useI18nToast;
