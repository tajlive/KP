// Funnel tracking utility for signup conversion analysis

const SESSION_ID_KEY = 'kp_funnel_session_id';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  
  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
  }
  return sessionId;
}

export type FunnelEvent = 
  | 'page_view'      // Step 1: User landed on signup page
  | 'form_start'     // Step 2: User started interacting with form
  | 'erfaring_selected'   // Step 3: Selected experience level
  | 'laeringsmaal_selected' // Step 4: Selected learning goals
  | 'email_entered'  // Step 5: Entered email
  | 'submit_attempted' // Step 6: Clicked submit
  | 'success'        // Step 7: Successfully registered
  | 'error';         // Error occurred

const STEP_MAP: Record<FunnelEvent, number> = {
  page_view: 1,
  form_start: 2,
  erfaring_selected: 3,
  laeringsmaal_selected: 4,
  email_entered: 5,
  submit_attempted: 6,
  success: 7,
  error: 0,
};

export async function trackFunnelEvent(
  event: FunnelEvent,
  metadata?: Record<string, unknown>
): Promise<void> {
  if (typeof window === 'undefined') return;
  
  try {
    await fetch('/api/track/funnel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: getSessionId(),
        event_type: event,
        step_number: STEP_MAP[event],
        metadata: metadata || {},
      }),
    });
  } catch (e) {
    // Silently fail - tracking should not break the app
    console.error('Tracking failed:', e);
  }
}

// Track page view on signup page
export function trackSignupPageView(): void {
  trackFunnelEvent('page_view', {
    url: window.location.href,
    timestamp: Date.now(),
  });
}

// Track form interaction
export function trackFormStart(): void {
  trackFunnelEvent('form_start');
}

// Track erfaring selection
export function trackErfaringSelected(erfaring: string): void {
  trackFunnelEvent('erfaring_selected', { erfaring });
}

// Track læringsmål selection
export function trackLaeringsmaalSelected(count: number, items: string[]): void {
  trackFunnelEvent('laeringsmaal_selected', { count, items });
}

// Track email entered
export function trackEmailEntered(): void {
  trackFunnelEvent('email_entered');
}

// Track submit attempt
export function trackSubmitAttempted(data: { 
  hasErfaring: boolean; 
  hasLaeringsmaal: boolean; 
  hasEmail: boolean;
  hasPassword: boolean;
}): void {
  trackFunnelEvent('submit_attempted', data);
}

// Track success
export function trackSuccess(studentNummer: number): void {
  trackFunnelEvent('success', { studentNummer });
  // Clear session ID after successful signup
  localStorage.removeItem(SESSION_ID_KEY);
}

// Track error
export function trackError(errorType: string, message: string): void {
  trackFunnelEvent('error', { errorType, message });
}
