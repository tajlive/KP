"use client";

import { useState } from "react";
import {
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  signInWithEmail,
  signUpWithEmail,
  isValidEmail,
  getErrorMessage,
} from "@/lib/auth/utils";
import { useRouter } from "next/navigation";
import { hrefWithLocale } from "@/i18n/href-with-locale";
import { useLocale } from "next-intl";

interface EmailAuthFormProps {
  mode: "login" | "register";
  locale?: string;
  onSuccess?: () => void;
  redirectPath?: string;
}

export function EmailAuthForm({
  mode,
  locale: localeProp,
  onSuccess,
  redirectPath: redirectPathProp,
}: EmailAuthFormProps) {
  const router = useRouter();
  const detectedLocale = useLocale();
  const locale = localeProp || detectedLocale;
  const redirectPath = redirectPathProp || hrefWithLocale(locale, "/dashboard");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    setError("");

    if (!email || !isValidEmail(email)) {
      setError(
        locale === "no"
          ? "Vennligst skriv inn en gyldig e-postadresse"
          : "Please enter a valid email address",
      );
      return false;
    }

    if (!password) {
      setError(
        locale === "no"
          ? "Vennligst skriv inn et passord"
          : "Please enter a password",
      );
      return false;
    }

    if (mode === "register") {
      if (password.length < 8) {
        setError(
          locale === "no"
            ? "Passordet må være minst 8 tegn"
            : "Password must be at least 8 characters",
        );
        return false;
      }

      if (password !== confirmPassword) {
        setError(
          locale === "no"
            ? "Passordene stemmer ikke overens"
            : "Passwords do not match",
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      if (mode === "login") {
        const { user, error: signInError } = await signInWithEmail({
          email,
          password,
        });

        if (signInError) {
          setError(getErrorMessage(signInError, locale));
          setLoading(false);
          return;
        }

        if (user) {
          if (onSuccess) {
            onSuccess();
          } else {
            router.push(redirectPath);
            router.refresh();
          }
        }
      } else {
        // Register mode
        const {
          user,
          error: signUpError,
          session,
        } = await signUpWithEmail({
          email,
          password,
          confirmPassword,
        });

        if (signUpError) {
          setError(getErrorMessage(signUpError, locale));
          setLoading(false);
          return;
        }

        if (user) {
          setSuccess(true);

          // If auto-confirm is on (session exists), redirect after delay
          if (session) {
            setTimeout(() => {
              if (onSuccess) {
                onSuccess();
              } else {
                router.push(redirectPath);
                router.refresh();
              }
            }, 1500);
          }
        }
      }
    } catch {
      setError(
        locale === "no"
          ? "En feil oppstod. Prøv igjen senere."
          : "An error occurred. Please try again later.",
      );
    } finally {
      setLoading(false);
    }
  };

  // Success state for registration
  if (success && mode === "register") {
    return (
      <div className="space-y-4 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-white">
          {locale === "no" ? "Konto opprettet!" : "Account created!"}
        </h2>
        <p className="text-slate-400">
          {locale === "no"
            ? "Du kan nå logge inn og begynne å bruke Klarpakke."
            : "You can now log in and start using Klarpakke."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-bold text-white">
        {mode === "login"
          ? locale === "no"
            ? "Logg inn"
            : "Sign In"
          : locale === "no"
            ? "Opprett konto"
            : "Create Account"}
      </h2>

      {error && (
        <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Email Field */}
      <div className="relative">
        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="email"
          placeholder={locale === "no" ? "E-post" : "Email"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 pl-10 bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          required
        />
      </div>

      {/* Password Field */}
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type={showPassword ? "text" : "password"}
          placeholder={locale === "no" ? "Passord" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 pl-10 pr-10 bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
        >
          {showPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Confirm Password Field (Register only) */}
      {mode === "register" && (
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder={
              locale === "no" ? "Bekreft passord" : "Confirm Password"
            }
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 pl-10 pr-10 bg-slate-800 border border-slate-700 rounded text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {locale === "no" ? "Laster..." : "Loading..."}
          </>
        ) : mode === "login" ? (
          locale === "no" ? (
            "Logg inn"
          ) : (
            "Sign In"
          )
        ) : locale === "no" ? (
          "Opprett konto"
        ) : (
          "Create Account"
        )}
      </Button>
    </form>
  );
}
