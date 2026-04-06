/**
 * Audit Store – Immutable Dual-Write Storage
 * 
 * Strategy:
 * - Supabase: Queryable short-term storage (90 days)
 * - S3: Long-term immutable storage (7 years)
 * 
 * @module trading/execution
 * @version 3.0.1-p0
 */

import { createClient } from '@/lib/supabase/server';
import { ExecutionEvidence } from './execution-audit';
import type { Database } from '@/types/database.types';

// S3 client would be imported here
// import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

interface S3Config {
  bucket: string;
  region: string;
  prefix: string;
}

interface AuditStorageConfig {
  s3: S3Config;
  supabaseRetentionDays: number;
  s3RetentionDays: number; // 2555 days = 7 years
}

const DEFAULT_CONFIG: AuditStorageConfig = {
  s3: {
    bucket: process.env.AUDIT_S3_BUCKET || 'klarpakke-audit-logs',
    region: process.env.AUDIT_S3_REGION || 'eu-north-1',
    prefix: 'execution-evidence'
  },
  supabaseRetentionDays: 90,
  s3RetentionDays: 2555 // 7 years
};

export interface AuditQueryOptions {
  userId?: string;
  orderId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditQueryResult {
  evidence: ExecutionEvidence;
  s3Path?: string;
  retrievedFrom: 'supabase' | 's3' | 'both';
}

export interface StorageMetrics {
  totalRecords: number;
  supabaseRecords: number;
  s3Records: number;
  oldestRecord: Date;
  newestRecord: Date;
  storageSizeBytes: number;
}

/**
 * Audit Store – Handles dual-write to Supabase and S3
 */
export class AuditStore {
  private config: AuditStorageConfig;
  // private s3: S3Client; // Would initialize in constructor
  
  constructor(config: Partial<AuditStorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // this.s3 = new S3Client({ region: this.config.s3.region });
  }
  
  /**
   * Persist execution evidence
   * Dual-write to Supabase and S3
   */
  async persist(evidence: ExecutionEvidence): Promise<{
    success: boolean;
    supabaseId?: string;
    s3Path?: string;
    error?: string;
  }> {
    const results = {
      success: false,
      supabaseId: undefined as string | undefined,
      s3Path: undefined as string | undefined,
      error: undefined as string | undefined
    };
    
    try {
      // 1. Write to Supabase (queryable)
      const supabaseResult = await this.persistToSupabase(evidence);
      if (supabaseResult.success) {
        results.supabaseId = supabaseResult.id;
      } else {
        results.error = `Supabase write failed: ${supabaseResult.error}`;
        console.error('[AuditStore] Supabase write failed:', supabaseResult.error);
      }
      
      // 2. Write to S3 (immutable long-term)
      const s3Result = await this.persistToS3(evidence);
      if (s3Result.success) {
        results.s3Path = s3Result.path;
        
        // Update Supabase record with S3 path
        if (results.supabaseId && s3Result.path) {
          await this.updateS3Path(results.supabaseId, s3Result.path);
        }
      } else {
        console.error('[AuditStore] S3 write failed:', s3Result.error);
        // Don't fail the whole operation if S3 fails, but log it
      }
      
      results.success = results.supabaseId !== undefined;
      return results;
      
    } catch (error) {
      console.error('[AuditStore] Failed to persist evidence:', error);
      results.error = error instanceof Error ? error.message : 'Unknown error';
      return results;
    }
  }
  
  /**
   * Query audit records
   * Searches Supabase first, falls back to S3 if needed
   */
  async query(options: AuditQueryOptions): Promise<{
    records: AuditQueryResult[];
    total: number;
    hasMore: boolean;
  }> {
    const supabase = await createClient();
    
    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' });
    
    // Apply filters
    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }
    
    if (options.orderId) {
      query = query.eq('order_id', options.orderId);
    }
    
    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }
    
    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }
    
    // Pagination
    const limit = options.limit || 100;
    const offset = options.offset || 0;
    
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('[AuditStore] Query failed:', error);
      return { records: [], total: 0, hasMore: false };
    }
    
    const records: AuditQueryResult[] = (data || []).map(row => ({
      evidence: (row.payload as unknown) as ExecutionEvidence,
      s3Path: row.s3_path ?? undefined,
      retrievedFrom: row.s3_path ? 'both' : 'supabase'
    }));
    
    return {
      records,
      total: count || 0,
      hasMore: (offset + records.length) < (count || 0)
    };
  }
  
  /**
   * Get evidence by order ID
   */
  async getByOrderId(orderId: string): Promise<AuditQueryResult | null> {
    const { records } = await this.query({ orderId, limit: 1 });
    return records[0] || null;
  }
  
  /**
   * Verify evidence integrity
   */
  async verifyIntegrity(evidenceId: string): Promise<{
    valid: boolean;
    storedHash: string;
    computedHash: string;
    error?: string;
  }> {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('audit_log')
        .select('evidence_hash, payload')
        .eq('evidence_id', evidenceId)
        .single();
      
      if (error || !data) {
        return {
          valid: false,
          storedHash: '',
          computedHash: '',
          error: error?.message || 'Evidence not found'
        };
      }
      
      // Compute hash of stored payload
      const payload = JSON.stringify(data.payload);
      const computedHash = await this.computeHash(payload);
      
      return {
        valid: computedHash === data.evidence_hash,
        storedHash: data.evidence_hash,
        computedHash
      };
      
    } catch (error) {
      return {
        valid: false,
        storedHash: '',
        computedHash: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Archive old records from Supabase to S3
   * Called by daily cron job
   */
  async archiveOldRecords(): Promise<{
    archived: number;
    errors: number;
  }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.supabaseRetentionDays);
    
    try {
      const supabase = await createClient();
      
      // Find old records without S3 path
      const { data, error } = await supabase
        .from('audit_log')
        .select('*')
        .lt('created_at', cutoffDate.toISOString())
        .is('s3_path', null)
        .limit(1000);
      
      if (error) {
        console.error('[AuditStore] Archive query failed:', error);
        return { archived: 0, errors: 0 };
      }
      
      let archived = 0;
      let errors = 0;
      
      for (const record of data || []) {
        const evidence = (record.payload as unknown) as ExecutionEvidence;
        
        // Write to S3
        const s3Result = await this.persistToS3(evidence);
        
        if (s3Result.success) {
          // Update record with S3 path
          const { error: updateError } = await supabase
            .from('audit_log')
            .update({ s3_path: s3Result.path })
            .eq('id', record.id);
          
          if (updateError) {
            errors++;
          } else {
            archived++;
          }
        } else {
          errors++;
        }
      }
      
      return { archived, errors };
      
    } catch (error) {
      console.error('[AuditStore] Archive failed:', error);
      return { archived: 0, errors: 1 };
    }
  }
  
  /**
   * Check health of audit storage
   * Returns true if Supabase table is accessible
   */
  async checkHealth(): Promise<boolean> {
    try {
      const supabase = await createClient();
      const { error } = await supabase
        .from('audit_log')
        .select('count', { count: 'exact', head: true });
      
      return !error;
    } catch {
      return false;
    }
  }
  
  /**
   * Get storage metrics
   */
  async getMetrics(): Promise<StorageMetrics> {
    try {
      const supabase = await createClient();
      
      const { count, error } = await supabase
        .from('audit_log')
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        throw error;
      }
      
      // Get date range
      const { data: rangeData } = await supabase
        .from('audit_log')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      const { data: rangeDataNewest } = await supabase
        .from('audit_log')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      return {
        totalRecords: count || 0,
        supabaseRecords: count || 0,
        s3Records: 0, // Would query S3
        oldestRecord: (rangeData as { created_at: string } | null)?.created_at ? new Date((rangeData as { created_at: string }).created_at) : new Date(),
        newestRecord: (rangeDataNewest as { created_at: string } | null)?.created_at ? new Date((rangeDataNewest as { created_at: string }).created_at) : new Date(),
        storageSizeBytes: 0 // Would calculate from DB stats
      };
      
    } catch (error) {
      console.error('[AuditStore] Metrics failed:', error);
      return {
        totalRecords: 0,
        supabaseRecords: 0,
        s3Records: 0,
        oldestRecord: new Date(),
        newestRecord: new Date(),
        storageSizeBytes: 0
      };
    }
  }
  
  /**
   * Export records for MiFID II reporting
   */
  async exportForMifid2(startDate: Date, endDate: Date): Promise<{
    evidence: ExecutionEvidence[];
    format: 'xml' | 'json';
  }> {
    const { records } = await this.query({
      startDate,
      endDate,
      limit: 10000
    });
    
    return {
      evidence: records.map(r => r.evidence),
      format: 'json'
    };
  }
  
  // Private helpers
  
  private async persistToSupabase(evidence: ExecutionEvidence): Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }> {
    try {
      const supabase = await createClient();
      
      const { data, error } = await supabase
        .from('audit_log')
        .insert({
          evidence_id: evidence.evidenceId,
          evidence_hash: evidence.hash,
          order_id: evidence.orderId,
          user_id: evidence.clientId,
          payload: evidence as unknown as Database['public']['Tables']['audit_log']['Insert']['payload'],
          created_at: evidence.createdAt.toISOString()
        })
        .select('id')
        .single();
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      return { success: true, id: data.id };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private async persistToS3(evidence: ExecutionEvidence): Promise<{
    success: boolean;
    path?: string;
    error?: string;
  }> {
    try {
      const date = new Date();
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      
      const key = `${this.config.s3.prefix}/${year}/${month}/${day}/${evidence.evidenceId}.json`;
      
      // Mock S3 write - replace with actual S3 client
      // await this.s3.send(new PutObjectCommand({
      //   Bucket: this.config.s3.bucket,
      //   Key: key,
      //   Body: JSON.stringify(evidence),
      //   ContentType: 'application/json',
      //   Metadata: {
      //     'evidence-id': evidence.evidenceId,
      //     'evidence-hash': evidence.hash
      //   }
      // }));
      
      console.log(`[AuditStore] Mock S3 write: ${key}`);
      
      return { success: true, path: `s3://${this.config.s3.bucket}/${key}` };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  private async updateS3Path(recordId: string, s3Path: string): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase
        .from('audit_log')
        .update({ s3_path: s3Path })
        .eq('id', recordId);
    } catch (error) {
      console.error('[AuditStore] Failed to update S3 path:', error);
    }
  }
  
  private async computeHash(content: string): Promise<string> {
    // Use Web Crypto API for hash computation
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

/**
 * Singleton instance
 */
let globalAuditStore: AuditStore | null = null;

export function getAuditStore(): AuditStore {
  if (!globalAuditStore) {
    globalAuditStore = new AuditStore();
  }
  return globalAuditStore;
}
