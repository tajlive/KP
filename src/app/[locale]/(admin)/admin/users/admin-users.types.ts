import {
  User,
  Star,
  Award,
  GraduationCap,
  Crown,
  Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface UserData {
  id: string;
  user_number: number;
  username: string | null;
  email: string;
  full_name: string | null;
  display_name: string | null;
  role: string;
  subscription_tier: string;
  subscription_status: string;
  source: string;
  beta_approved: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  portfolio_value: number;
  total_trades: number;
  paper_balance: number;
}

export interface RoleConfig {
  id: string;
  icon: LucideIcon;
  color: string;
}

export const roles: RoleConfig[] = [
  { id: "user", icon: User, color: "bg-slate-500" },
  { id: "beta", icon: Star, color: "bg-amber-500" },
  { id: "premium", icon: Award, color: "bg-emerald-500" },
  { id: "master", icon: GraduationCap, color: "bg-blue-500" },
  { id: "phd", icon: Crown, color: "bg-indigo-500" },
  { id: "professor", icon: Crown, color: "bg-pink-500" },
  { id: "admin", icon: Shield, color: "bg-red-500" },
];

export const tiers = [
  { id: "free", color: "bg-slate-600" },
  { id: "student", color: "bg-slate-500" },
  { id: "bachelor", color: "bg-blue-500" },
  { id: "master", color: "bg-emerald-500" },
  { id: "phd", color: "bg-indigo-500" },
  { id: "professor", color: "bg-amber-500" },
];

export const sources = [
  { id: "organic" },
  { id: "google_ads" },
  { id: "referral" },
  { id: "social" },
  { id: "partner" },
  { id: "beta_invite" },
];
