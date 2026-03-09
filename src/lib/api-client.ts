/**
 * API Client with Error Handling
 * Wraps fetch with automatic error handling and logging
 */

import {
  handleApiError,
  AppError,
  logger,
  tryCatch,
} from '@/lib/error-handling';
import { getAppUrl } from '@/lib/auth/config';

// ============================================================
// API REQUEST OPTIONS
// ============================================================

export interface ApiRequestOptions extends RequestInit {
  retries?: number;
  timeout?: number;
  showErrorAlert?: boolean;
}

// ============================================================
// API CLIENT
// ============================================================

export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;

  constructor(baseUrl: string = '', timeout: number = 30000) {
    this.baseUrl = baseUrl;
    this.defaultTimeout = timeout;
  }

  /**
   * Make API request with automatic error handling
   */
  async request<T = unknown>(
    url: string,
    options: ApiRequestOptions = {}
  ): Promise<T> {
    const {
      retries = 3,
      timeout = this.defaultTimeout,
      showErrorAlert = true,
      ...fetchOptions
    } = options;

    const fullUrl = this.getFullUrl(url);
    let lastError: AppError | null = null;

    // Retry logic
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-OK responses
        if (!response.ok) {
          const error = await handleApiError(response);
          lastError = error;

          // Don't retry on 4xx errors (except 429)
          if (response.status < 500 && response.status !== 429) {
            throw error;
          }

          // Retry on 5xx or rate limit
          if (attempt < retries - 1) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          throw error;
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        }

        return (await response.text()) as unknown as T;
      } catch (error) {
        lastError = error instanceof AppError ? error : new AppError(
          'API_ERROR',
          String(error),
          0
        );

        // Don't retry on client errors
        if (error instanceof AppError && error.statusCode >= 400 && error.statusCode < 500) {
          if (showErrorAlert) {
            logger.error(`API Error: ${fullUrl}`, error);
          }
          throw error;
        }

        // Last attempt
        if (attempt === retries - 1) {
          if (showErrorAlert) {
            logger.error(`API Error after ${retries} retries: ${fullUrl}`, error);
          }
          throw lastError;
        }

        // Wait before retry
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new AppError('UNKNOWN_ERROR', 'Request failed', 0);
  }

  /**
   * GET request
   */
  async get<T = unknown>(
    url: string,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = unknown>(
    url: string,
    data?: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(
    url: string,
    data?: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(
    url: string,
    data?: unknown,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(
    url: string,
    options?: ApiRequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'DELETE',
    });
  }

  /**
   * Safe request wrapper - returns [data, error] tuple
   */
  async safe<T = unknown>(
    fn: () => Promise<T>
  ): Promise<[T | undefined, AppError | null]> {
    return tryCatch(fn);
  }

  /**
   * Get full URL
   */
  private getFullUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return this.baseUrl + url;
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

const baseUrl = typeof window !== 'undefined'
  ? getAppUrl()
  : process.env.NEXT_PUBLIC_SITE_URL || getAppUrl();

export const apiClient = new ApiClient(baseUrl);

export default apiClient;
