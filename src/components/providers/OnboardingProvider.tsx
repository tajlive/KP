'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthContext';

interface OnboardingContextType {
  showOnboarding: boolean;
  currentStep: number;
  hasCompleted: boolean;
  isInitialized: boolean;
  openOnboarding: () => void;
  closeOnboarding: () => void;
  nextStep: () => void;
  skipOnboarding: () => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

const STORAGE_KEY = 'klarpakke_onboarding_completed';
const STEP_STORAGE_KEY = 'klarpakke_onboarding_step';

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompleted, setHasCompleted] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem(STORAGE_KEY) === 'true';
      const savedStep = parseInt(localStorage.getItem(STEP_STORAGE_KEY) || '0', 10);
      
      setHasCompleted(completed);
      setCurrentStep(savedStep);
      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    // Only show onboarding for logged-in users who haven't completed it
    if (isInitialized && !loading && user && !hasCompleted) {
      // Small delay to prevent immediate popup
      const timer = setTimeout(() => {
        setShowOnboarding(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isInitialized, loading, user, hasCompleted]);

  const openOnboarding = () => {
    setShowOnboarding(true);
  };

  const closeOnboarding = () => {
    setShowOnboarding(false);
  };

  const nextStep = () => {
    const newStep = currentStep + 1;
    if (newStep >= 3) {
      completeOnboarding();
    } else {
      setCurrentStep(newStep);
      localStorage.setItem(STEP_STORAGE_KEY, String(newStep));
    }
  };

  const skipOnboarding = () => {
    setShowOnboarding(false);
    setHasCompleted(true);
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem(STEP_STORAGE_KEY, '0');
  };

  const completeOnboarding = () => {
    setShowOnboarding(false);
    setHasCompleted(true);
    setCurrentStep(0);
    localStorage.setItem(STORAGE_KEY, 'true');
    localStorage.setItem(STEP_STORAGE_KEY, '0');
  };

  return (
    <OnboardingContext.Provider
      value={{
        showOnboarding,
        currentStep,
        hasCompleted,
        isInitialized,
        openOnboarding,
        closeOnboarding,
        nextStep,
        skipOnboarding,
        completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
