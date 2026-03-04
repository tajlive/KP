/**
 * Form Validation Schemas
 * Centralized validation for all forms
 */

import { z } from 'zod';

// ============================================================
// REUSABLE SCHEMAS
// ============================================================

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number');

const urlSchema = z.string().url('Invalid URL');

// ============================================================
// AUTH SCHEMAS
// ============================================================

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  passwordConfirm: z.string(),
  terms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms',
  }),
}).refine((data) => data.password === data.passwordConfirm, {
  message: 'Passwords do not match',
  path: ['passwordConfirm'],
});

export type SignupFormData = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z.object({
  email: emailSchema,
});

export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

// ============================================================
// BETA APPLICATION SCHEMA
// ============================================================

export const betaApplicationSchema = z.object({
  experience: z.enum(['beginner', 'intermediate', 'advanced']).refine((val) => val, {
    message: 'Please select your experience level',
  }),
  motivation: z
    .string()
    .min(10, 'Tell us more about your motivation (min 10 chars)')
    .max(500, 'Motivation must be less than 500 characters'),
  riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).refine((val) => val, {
    message: 'Please select your risk tolerance',
  }),
  agreedToRisks: z.boolean().refine((val) => val === true, {
    message: 'You must acknowledge the risks',
  }),
});

export type BetaApplicationData = z.infer<typeof betaApplicationSchema>;

// ============================================================
// TRADING SCHEMAS
// ============================================================

export const placeTradeSchema = z.object({
  type: z.enum(['buy', 'sell']).refine((val) => val, {
    message: 'Select buy or sell',
  }),
  coin: z
    .string()
    .min(1, 'Select a cryptocurrency')
    .max(10, 'Invalid coin'),
  amount: z
    .number()
    .positive('Amount must be positive')
    .max(1_000_000, 'Amount too large'),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
}).refine(
  (data) => {
    if (data.stopLoss && data.takeProfit) {
      if (data.type === 'buy') {
        return data.stopLoss < data.takeProfit;
      } else {
        return data.stopLoss > data.takeProfit;
      }
    }
    return true;
  },
  {
    message: 'Invalid stop loss or take profit',
    path: ['stopLoss'],
  }
);

export type PlaceTradeData = z.infer<typeof placeTradeSchema>;

// ============================================================
// PROFILE SCHEMAS
// ============================================================

export const profileUpdateSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name too long')
    .optional(),
  avatar: urlSchema.optional(),
  bio: z.string().max(500, 'Bio too long').optional(),
  notificationsEnabled: z.boolean().default(true),
});

export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;

// ============================================================
// VALIDATION UTILITIES
// ============================================================

/**
 * Validate form data against schema
 */
export async function validateFormData<T>(
  schema: z.ZodSchema,
  data: unknown
): Promise<[T | null, Record<string, string> | null]> {
  try {
    const validated = await schema.parseAsync(data);
    return [validated as T, null];
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldErrors: Record<string, string> = {};
      error.issues.forEach((issue) => {
        const path = issue.path.join('.');
        fieldErrors[path] = issue.message;
      });
      return [null, fieldErrors];
    }
    return [null, { _form: 'Validation failed' }];
  }
}

/**
 * Get field-specific error message
 */
export function getFieldError(
  errors: Record<string, string> | null,
  field: string
): string | undefined {
  if (!errors) return undefined;
  return errors[field];
}

/**
 * Check if form has errors
 */
export function hasFormErrors(errors: Record<string, string> | null): boolean {
  return !!errors && Object.keys(errors).length > 0;
}

export default {
  // Auth
  signupSchema,
  loginSchema,
  resetPasswordSchema,
  // Beta
  betaApplicationSchema,
  // Trading
  placeTradeSchema,
  // Profile
  profileUpdateSchema,
  // Utilities
  validateFormData,
  getFieldError,
  hasFormErrors,
};
