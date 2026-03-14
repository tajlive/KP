"use client";

import { createClient } from "@/lib/utils";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";

interface GamificationState {
  current_level: number;
  total_xp: number;
  current_streak: number;
}

interface GamificationContextType {
  state: GamificationState | null;
  awardXp: (action: string) => Promise<void>;
  showLevelUp: boolean;
  setShowLevelUp: (val: boolean) => void;
  newLevel: number | null;
}

const GamificationContext = createContext<GamificationContextType | undefined>(
  undefined,
);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GamificationState | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState<number | null>(null);

  useEffect(() => {
    const loadState = async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("user_gamification")
          .select("*")
          .eq("user_id" as unknown, user.id)
          .maybeSingle();

        if (data) {
          setState(data);
        } else {
          setState({ current_level: 1, total_xp: 0, current_streak: 0 });
        }

        // Automatically try to award login XP once daily
        const loginAttempted = sessionStorage.getItem("daily_login_awarded");
        if (!loginAttempted) {
          sessionStorage.setItem("daily_login_awarded", "true");
          await triggerAward("login");
        }
      } catch (e) {
        console.error("Failed to load gamification state", e);
      }
    };
    loadState();
  }, []);

  const triggerAward = async (action: string) => {
    try {
      const res = await fetch("/api/gamification/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();

      if (res.ok && data.state) {
        setState(data.state);

        // Show subtle toast for normal XP
        if (data.awardedXp && action !== "login") {
          toast.success(`+${data.awardedXp} XP tjenes! 🔥`);
        }

        // Trigger massive Level Up modal
        if (data.levelUp) {
          setNewLevel(data.state.current_level);
          setShowLevelUp(true);
        }
      }
    } catch (e) {
      console.error("Failed to award XP", e);
    }
  };

  return (
    <GamificationContext.Provider
      value={{
        state,
        awardXp: triggerAward,
        showLevelUp,
        setShowLevelUp,
        newLevel,
      }}
    >
      {children}
    </GamificationContext.Provider>
  );
}

export const useGamification = () => {
  const ctx = useContext(GamificationContext);
  if (ctx === undefined)
    throw new Error("useGamification must be used within GamificationProvider");
  return ctx;
};
