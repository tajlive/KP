# Error Handling Implementation Guide

Complete examples of how to use the error handling system in your components.

## Table of Contents
1. [Form Validation](#form-validation)
2. [API Error Handling](#api-error-handling)
3. [Component Error Boundaries](#component-error-boundaries)
4. [Server Actions with Error Handling](#server-actions-with-error-handling)

---

## Form Validation

### Example: Beta Application Form

```typescript
// components/beta-apply-form.tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { betaApplicationSchema, type BetaApplicationData } from '@/lib/form-validation';
import { ErrorMessage, FieldError, SuccessMessage } from '@/components/form-error';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/lib/error-handling';

export function BetaApplyForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<BetaApplicationData>({
    resolver: zodResolver(betaApplicationSchema),
  });

  async function onSubmit(data: BetaApplicationData) {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Use API client with error handling
      await apiClient.post('/api/beta-signup', data);

      setSubmitSuccess(true);
      reset();

      // Redirect after success
      setTimeout(() => {
        window.location.href = '/no/takk';
      }, 2000);
    } catch (error) {
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {submitSuccess && (
        <SuccessMessage message="Application submitted successfully!" />
      )}

      {submitError && (
        <ErrorMessage message={submitError} />
      )}

      {/* Experience Level */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Trading Experience *
        </label>
        <select
          {...register('experience')}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="">Select level...</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        {errors.experience && (
          <FieldError error={errors.experience.message} />
        )}
      </div>

      {/* Motivation */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Motivation *
        </label>
        <textarea
          {...register('motivation')}
          className="w-full px-3 py-2 border rounded-lg"
          rows={4}
          placeholder="Tell us why you want to join..."
        />
        {errors.motivation && (
          <FieldError error={errors.motivation.message} />
        )}
      </div>

      {/* Risk Tolerance */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Risk Tolerance *
        </label>
        <select
          {...register('riskTolerance')}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="">Select...</option>
          <option value="conservative">Conservative</option>
          <option value="moderate">Moderate</option>
          <option value="aggressive">Aggressive</option>
        </select>
        {errors.riskTolerance && (
          <FieldError error={errors.riskTolerance.message} />
        )}
      </div>

      {/* Risk Acknowledgement */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          {...register('agreedToRisks')}
          className="w-4 h-4"
        />
        <label className="text-sm">
          I understand the risks of trading *
        </label>
      </div>
      {errors.agreedToRisks && (
        <FieldError error={errors.agreedToRisks.message} />
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
}
```

---

## API Error Handling

### Example: Custom Hook with Error Handling

```typescript
// hooks/useBetaSignup.ts
'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { BetaApplicationData } from '@/lib/form-validation';
import { AppError, getErrorMessage } from '@/lib/error-handling';

export function useBetaSignup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  async function submit(data: BetaApplicationData) {
    try {
      setIsLoading(true);
      setError(null);

      const result = await apiClient.post('/api/beta-signup', data, {
        retries: 3,
        timeout: 10000,
      });

      return result;
    } catch (err) {
      const appError = err instanceof AppError ? err : new AppError(
        'SUBMIT_ERROR',
        getErrorMessage(err)
      );
      setError(appError);
      throw appError;
    } finally {
      setIsLoading(false);
    }
  }

  return {
    isLoading,
    error,
    errorMessage: error ? getErrorMessage(error) : null,
    submit,
  };
}
```

---

## Component Error Boundaries

### Example: Wrap Page with Error Boundary

```typescript
// app/[locale]/beta/apply/page.tsx
import { ErrorBoundary } from '@/components/error-boundary';
import { BetaApplyForm } from '@/components/beta-apply-form';

export default function BetaApplyPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">Apply for Beta Access</h1>
          <BetaApplyForm />
        </div>
      </div>
    </ErrorBoundary>
  );
}
```

### Example: Custom Error Fallback

```typescript
// pages/trading.tsx
import { ErrorBoundary } from '@/components/error-boundary';
import { TradingDashboard } from '@/components/trading-dashboard';

export default function TradingPage() {
  return (
    <ErrorBoundary
      fallback={(error, retry) => (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-900 mb-2">
            Trading Error
          </h2>
          <p className="text-red-800 mb-4">
            {error.message}
          </p>
          <button
            onClick={retry}
            className="px-4 py-2 bg-red-600 text-white rounded"
          >
            Retry
          </button>
        </div>
      )}
    >
      <TradingDashboard />
    </ErrorBoundary>
  );
}
```

---

## Server Actions with Error Handling

### Example: Server Action with Error Handling

```typescript
// app/actions/submit-trade.ts
'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  ValidationError,
  handleSupabaseError,
  AppError,
} from '@/lib/error-handling';
import { placeTradeSchema } from '@/lib/form-validation';

export async function submitTrade(data: unknown) {
  try {
    // Validate input
    const validData = placeTradeSchema.parse(data);

    // Get authenticated client
    const supabase = createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new AuthError('You must be logged in to trade');
    }

    // Insert trade into database
    const { data: trade, error } = await supabase
      .from('trades')
      .insert({
        user_id: user.id,
        type: validData.type,
        coin: validData.coin,
        amount: validData.amount,
        stop_loss: validData.stopLoss,
        take_profit: validData.takeProfit,
      })
      .select()
      .single();

    if (error) {
      throw handleSupabaseError(error);
    }

    return {
      success: true,
      data: trade,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      };
    }

    if (error instanceof AppError) {
      return {
        success: false,
        error: error.message,
        code: error.code,
      };
    }

    return {
      success: false,
      error: 'An unexpected error occurred',
    };
  }
}
```

### Example: Using Server Action in Client Component

```typescript
// components/place-trade-form.tsx
'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { submitTrade } from '@/app/actions/submit-trade';
import { ErrorMessage, FieldError } from '@/components/form-error';

const initialState = {
  success: false,
  error: null,
  errors: [],
};

export function PlaceTradeForm() {
  const [state, formAction] = useFormState(submitTrade, initialState);
  const { pending } = useFormStatus();

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <ErrorMessage message={state.error} />
      )}

      {state.errors && state.errors.length > 0 && (
        <div className="space-y-2">
          {state.errors.map((err: any) => (
            <FieldError key={err.path} error={`${err.path}: ${err.message}`} />
          ))}
        </div>
      )}

      {state.success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded text-green-900">
          Trade submitted successfully!
        </div>
      )}

      {/* Form fields... */}

      <button
        type="submit"
        disabled={pending}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        {pending ? 'Submitting...' : 'Place Trade'}
      </button>
    </form>
  );
}
```

---

## Error Handling Patterns

### Pattern 1: Try-Catch with Error Recovery

```typescript
async function loadUserProfile(userId: string) {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw handleSupabaseError(error);
    return data;
  } catch (error) {
    logger.error('Failed to load profile', error);
    // Return default/cached profile
    return getDefaultProfile();
  }
}
```

### Pattern 2: Safe Wrapper

```typescript
async function fetchData() {
  const [data, error] = await apiClient.safe(
    () => apiClient.get('/api/data')
  );

  if (error) {
    showErrorToast(getErrorMessage(error));
    return null;
  }

  return data;
}
```

### Pattern 3: Form Submission

```typescript
async function handleSubmit(formData: FormData) {
  const [errors, setErrors] = useState({});

  try {
    const result = await submitAction(formData);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    // Handle success
  } catch (error) {
    setErrors({ _form: getErrorMessage(error) });
  }
}
```

---

## Best Practices

1. **Always catch and log errors** - Use the logger utility
2. **Show user-friendly messages** - Use getErrorMessage()
3. **Wrap components with ErrorBoundary** - Prevent white screens
4. **Validate input with Zod** - Catch errors early
5. **Use try-catch in Server Actions** - Handle async operations safely
6. **Implement retry logic** - Use apiClient with retries
7. **Monitor errors** - Set up Sentry for production

