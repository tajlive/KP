'use client';

// DEPRECATED: This component is no longer used in the new Nordic Trust design

export function VerificationBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return null;
}

export function AwardBadge({ title, year, icon: Icon }: { title: string; year: string; icon?: unknown }) {
  return null;
}

export function StatHighlight({ value, label, trend }: { value: string; label: string; trend?: 'up' | 'down' | 'neutral' }) {
  return null;
}

export function TrustIndicator({ type = 'secure' }: { type?: 'secure' | 'verified' | 'guarantee' | 'support' }) {
  return null;
}

export function CredibilityBar({ variant = 'default', showVerification = true }: { variant?: 'default' | 'compact' | 'minimal'; showVerification?: boolean }) {
  return null;
}

export function SocialProofBanner() {
  return null;
}

export default CredibilityBar;
