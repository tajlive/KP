"use client"

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface SignupDisclaimerProps {
  /**
   * Callback when disclaimer is accepted
   * Parent component should track this state for form validation
   */
  onAccept?: (accepted: boolean) => void;
  
  /**
   * Controlled state for checkbox
   * Required for form validation
   */
  accepted?: boolean;
  
  /**
   * Show error state (e.g., user tried to submit without accepting)
   */
  error?: boolean;
}

/**
 * Signup Flow Disclaimer - Required Checkbox
 * 
 * Educational disclaimer that MUST be accepted before account creation.
 * Placed in signup modal/page before "Opprett konto" button.
 * 
 * Required by Norwegian regulations for financial educational platforms.
 */
export function SignupDisclaimer({ onAccept, accepted = false, error = false }: SignupDisclaimerProps) {
  const [internalAccepted, setInternalAccepted] = useState(accepted);
  
  const isAccepted = accepted !== undefined ? accepted : internalAccepted;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setInternalAccepted(newValue);
    onAccept?.(newValue);
  };
  
  return (
    <div className={`bg-amber-50 border-l-4 ${
      error ? 'border-red-500' : 'border-amber-500'
    } text-amber-800 mb-6 p-4 rounded-r-lg`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <p className="text-sm font-medium leading-relaxed mb-3">
            Jeg forstår at Klarpakke kun tilbyr opplæring. Jeg vil ikke motta finansiell rådgivning. 
            All trading er på eget ansvar.
          </p>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={isAccepted}
              onChange={handleChange}
              className={`w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 ${
                error ? 'border-red-500 border-2' : 'border-gray-300'
              }`}
              required
              aria-required="true"
              aria-invalid={error}
              aria-describedby={error ? 'disclaimer-error' : undefined}
            />
            <span className="text-sm font-semibold group-hover:text-amber-900 transition-colors">
              Jeg aksepterer og forstår dette *
            </span>
          </label>
          {error && (
            <p id="disclaimer-error" className="text-red-600 text-xs mt-2 font-medium">
              Du må akseptere disclaimeren for å fortsette
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Usage:
 * 
 * import { SignupDisclaimer } from '@/components/disclaimers/SignupDisclaimer';
 * 
 * function SignupForm() {
 *   const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
 *   const [showError, setShowError] = useState(false);
 *   
 *   const handleSubmit = (e) => {
 *     e.preventDefault();
 *     if (!disclaimerAccepted) {
 *       setShowError(true);
 *       return;
 *     }
 *     // Process signup...
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <SignupDisclaimer 
 *         accepted={disclaimerAccepted}
 *         onAccept={setDisclaimerAccepted}
 *         error={showError}
 *       />
 *       <button type="submit">Opprett konto</button>
 *     </form>
 *   );
 * }
 */