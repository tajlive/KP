/**
 * KYC (Know Your Customer) Compliance Module
 * 
 * Implements:
 * - Identity verification (BankID for Norwegian users)
 * - PEP (Politically Exposed Persons) screening
 * - Sanctions list check
 * - Risk rating assessment
 * 
 * @module compliance/kyc
 * @version 1.0.0
 * 
 * TODO: Implement actual PEP/Sanctions API integration
 */

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type KYCProfileRow = Database["public"]["Tables"]["kyc_profiles"]["Row"];

function kycDb() {
  return createClient().from('kyc_profiles');
}

export type KYCStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type PEPStatus = 'clear' | 'pep' | 'pep_associate' | 'unknown';
export type SanctionsStatus = 'clear' | 'match' | 'false_positive' | 'unknown';
export type RiskRating = 'low' | 'medium' | 'high';

export interface KYCProfile {
  userId: string;
  status: KYCStatus;
  verificationMethod?: 'bankid' | 'passport' | 'drivers_license';
  verifiedAt?: Date;
  pepStatus: PEPStatus;
  sanctionsStatus: SanctionsStatus;
  riskRating: RiskRating;
  fullName?: string;
  dateOfBirth?: Date;
  nationality?: string;
  enhancedDueDiligence: boolean;
  documents: KYCDocument[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KYCDocument {
  id: string;
  type: 'passport' | 'drivers_license' | 'national_id' | 'proof_of_address';
  status: 'pending' | 'approved' | 'rejected';
  frontImageUrl?: string;
  backImageUrl?: string;
  uploadedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  rejectionReason?: string;
}

export interface KYCSubmission {
  fullName: string;
  dateOfBirth: Date;
  nationality: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  documents: {
    idDocument: File;
    proofOfAddress?: File;
  };
}

// Compliance threshold - MUST be verified for live trading
export const KYC_REQUIRED_FOR_LIVE_TRADING = true;

/**
 * Check if user can perform live trading
 * CRITICAL: This MUST be called before any live trade execution
 */
export function canPerformLiveTrading(profile: KYCProfile | null): {
  allowed: boolean;
  reason?: string;
} {
  if (!profile) {
    return { allowed: false, reason: 'KYC profile not found' };
  }

  if (profile.status !== 'verified') {
    return { 
      allowed: false, 
      reason: `KYC status is ${profile.status}. Verification required.` 
    };
  }

  if (profile.pepStatus === 'pep' || profile.pepStatus === 'pep_associate') {
    return { 
      allowed: false, 
      reason: 'Enhanced due diligence required for PEP' 
    };
  }

  if (profile.sanctionsStatus === 'match') {
    return { 
      allowed: false, 
      reason: 'Sanctions list match - trading prohibited' 
    };
  }

  if (profile.riskRating === 'high' && !profile.enhancedDueDiligence) {
    return { 
      allowed: false, 
      reason: 'Enhanced due diligence required for high risk' 
    };
  }

  return { allowed: true };
}

/**
 * Check if user can perform paper trading
 * Paper trading has relaxed requirements
 */
export function canPerformPaperTrading(profile: KYCProfile | null): {
  allowed: boolean;
  reason?: string;
} {
  // Paper trading allowed with basic signup
  // But we still want email verification
  return { allowed: true };
}

/**
 * Submit KYC for verification
 */
export async function submitKYC(
  userId: string,
  submission: KYCSubmission
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // 1. Upload documents to secure storage
    const documentRecords: KYCDocument[] = [];
    
    if (submission.documents.idDocument) {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(`${userId}/id-${Date.now()}`, submission.documents.idDocument);
      
      if (uploadError) {
        return { success: false, error: 'Failed to upload ID document' };
      }

      documentRecords.push({
        id: crypto.randomUUID(),
        type: 'passport', // Determine from file
        status: 'pending',
        frontImageUrl: uploadData?.path,
        uploadedAt: new Date()
      });
    }

    const { error: insertError } = await kycDb()
      .insert({
        user_id: userId,
        status: 'pending',
        pep_status: 'unknown',
        sanctions_status: 'unknown',
        risk_rating: 'medium',
        enhanced_due_diligence: false,
        full_name: submission.fullName,
        date_of_birth: submission.dateOfBirth.toISOString(),
        nationality: submission.nationality,
        documents: documentRecords as unknown as Database["public"]["Tables"]["kyc_profiles"]["Insert"]["documents"],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    // 3. Trigger async screening
    await triggerScreening(userId);

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Trigger PEP and Sanctions screening
 * This should be called asynchronously
 */
async function triggerScreening(userId: string): Promise<void> {
  // TODO: Implement actual screening with external providers
  // - Refinitiv World-Check
  // - Dow Jones Risk & Compliance
  // - ComplyAdvantage
  
  // For now, mock implementation
  console.log(`[KYC] Triggered screening for user ${userId}`);
}

/**
 * Get KYC status for user
 */
export async function getKYCStatus(userId: string): Promise<KYCProfile | null> {
  const supabase = createClient();
  
  const { data, error } = await kycDb()
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    userId: data.user_id,
    status: data.status as KYCStatus,
    verificationMethod: data.verification_method as KYCProfile['verificationMethod'],
    verifiedAt: data.verified_at ? new Date(data.verified_at) : undefined,
    pepStatus: data.pep_status as PEPStatus,
    sanctionsStatus: data.sanctions_status as SanctionsStatus,
    riskRating: data.risk_rating as RiskRating,
    fullName: data.full_name ?? undefined,
    dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
    nationality: data.nationality ?? undefined,
    enhancedDueDiligence: data.enhanced_due_diligence,
    documents: (data.documents as unknown as KYCDocument[] | undefined) || [],
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
}

/**
 * Admin: Approve KYC
 */
export async function approveKYC(
  userId: string,
  adminId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await kycDb()
    .update({
      status: 'verified',
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log admin action for audit
  await logAdminAction(adminId, 'KYC_APPROVE', userId, notes);

  return { success: true };
}

/**
 * Admin: Reject KYC
 */
export async function rejectKYC(
  userId: string,
  adminId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { error } = await kycDb()
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', userId);

  if (error) {
    return { success: false, error: error.message };
  }

  // Log admin action for audit
  await logAdminAction(adminId, 'KYC_REJECT', userId, reason);

  return { success: true };
}

/**
 * Log admin action for compliance audit
 */
async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string,
  notes?: string
): Promise<void> {
  const supabase = createClient();

  await supabase.from('audit_logs').insert({
    actor: adminId,
    action,
    resource: 'kyc',
    resource_id: targetUserId,
    notes,
    timestamp: new Date().toISOString(),
    correlation_id: crypto.randomUUID()
  } as never);
}

/**
 * Get all pending KYC submissions (for admin dashboard)
 */
export async function getPendingKYC(): Promise<KYCProfile[]> {
  const supabase = createClient();

  const { data, error } = await kycDb()
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((record) => ({
    userId: record.user_id,
    status: record.status as KYCStatus,
    verificationMethod: record.verification_method as KYCProfile['verificationMethod'],
    verifiedAt: record.verified_at ? new Date(record.verified_at) : undefined,
    pepStatus: record.pep_status as PEPStatus,
    sanctionsStatus: record.sanctions_status as SanctionsStatus,
    riskRating: record.risk_rating as RiskRating,
    fullName: record.full_name ?? undefined,
    dateOfBirth: record.date_of_birth ? new Date(record.date_of_birth) : undefined,
    nationality: record.nationality ?? undefined,
    enhancedDueDiligence: record.enhanced_due_diligence,
    documents: (record.documents as unknown as KYCDocument[] | undefined) || [],
    createdAt: new Date(record.created_at),
    updatedAt: new Date(record.updated_at)
  }));
}
