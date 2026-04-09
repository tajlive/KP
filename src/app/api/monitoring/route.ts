import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/utils/error';


interface MonitoringPayload {
  reports: Array<{
    type: string;
    message?: string;
    url: string;
    timestamp: string;
    [key: string]: unknown;
  }>;
}

/**
 * POST /api/monitoring
 * Receives client-side monitoring data (errors, metrics)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as MonitoringPayload;
    const { reports } = body;

    if (!Array.isArray(reports) || reports.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid reports data' },
        { status: 400 }
      );
    }

    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      reports.forEach((report) => {
        if (report.type.includes('error')) {
          console.error('[Monitoring]', report);
        } else {
          console.info('[Monitoring]', report);
        }
      });
      return NextResponse.json({ success: true });
    }

    // In production, log structured format for Cloudflare
    reports.forEach((report) => {
      const sanitizedReport = sanitizeReport(report);
      
      console.info(JSON.stringify({
        level: report.type.includes('error') ? 'error' : 'info',
        service: 'klarpakke-monitoring',
        ...sanitizedReport,
        cf: {
          rayId: request.headers.get('cf-ray'),
          country: request.headers.get('cf-ipcountry'),
        },
      }));
    });

    return NextResponse.json({ 
      success: true, 
      received: reports.length 
    });
  } catch (error) {
    console.error('[Monitoring API] Error:', getErrorMessage(error));
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function sanitizeReport(report: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization'];
  const sanitized: { [key: string]: unknown } = {};

  for (const [key, value] of Object.entries(report)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeReport(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    service: 'klarpakke-monitoring',
    version: '1.0.0',
  });
}
