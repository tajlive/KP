/**
 * European Tax Report API
 * 
 * POST /api/trading/v3/tax/eu-report/generate
 * GET /api/trading/v3/tax/eu-report/:jurisdiction/:year
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from "@/lib/supabase/server";
import type { Database } from '@/types/database.types';
import type { EuropeanJurisdiction } from '@/lib/trading/white-label/european-tax';

// Interfaces for tax report data
interface TradeRecord {
  date: string | Date;
  symbol: string;
  side: string;
  quantity: number | string;
  price: number | string;
  fees: number | string;
  total: number | string;
}

interface TaxReportData {
  trades: TradeRecord[];
}

interface TaxReport {
  id: string;
  jurisdiction: string;
  tax_year: number;
  report_format: 'XML' | 'CSV' | 'PDF';
  report_data: TaxReportData;
  total_gains?: number | null;
  total_losses?: number | null;
  net_taxable?: number | null;
  estimated_tax?: number | null;
  tax_currency: string;
  calculation_method: string;
  generated_at: string;
}

// `european_tax_reports` finnes ikke i genererte Database-typer (database.types.ts),
// så skjemaet utvides lokalt — samme mønster som lib/admin/log-admin-audit.ts (DbWithAdminAudit).
// Viktig: Row må være flat type-alias (ikke interface-intersection) for å tilfredsstille
// Supabase's GenericTable-constraint (implicit index signature).
type EuropeanTaxReportRow = {
  id: string;
  user_id: string;
  jurisdiction: string;
  tax_year: number;
  report_format: 'XML' | 'CSV' | 'PDF';
  report_data: TaxReportData;
  total_gains?: number | null;
  total_losses?: number | null;
  net_taxable?: number | null;
  estimated_tax?: number | null;
  tax_currency: string;
  calculation_method: string;
  generated_at: string;
};
type EuropeanTaxReportInsert = Omit<EuropeanTaxReportRow, 'id'> & { id?: string };

type DbWithEuropeanTaxReports = Database & {
  public: Database['public'] & {
    Tables: Database['public']['Tables'] & {
      european_tax_reports: {
        Row: EuropeanTaxReportRow;
        Insert: EuropeanTaxReportInsert;
        Update: Partial<EuropeanTaxReportInsert>;
        Relationships: [];
      };
    };
  };
};

const VALID_JURISDICTIONS: EuropeanJurisdiction[] = ['DE', 'FR', 'IT', 'ES', 'NL', 'AT', 'CH', 'NO'];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const {
      jurisdiction,
      taxYear = new Date().getFullYear() - 1,
      format = 'CSV'
    } = body;
    
    if (!VALID_JURISDICTIONS.includes(jurisdiction)) {
      return NextResponse.json(
        { error: 'Invalid jurisdiction', validJurisdictions: VALID_JURISDICTIONS },
        { status: 400 }
      );
    }
    
    // Fetch user's trades for the tax year
    const startDate = `${taxYear}-01-01`;
    const endDate = `${taxYear}-12-31`;
    
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: true });
    
    if (tradesError) {
      console.error('Trade fetch error:', tradesError);
      return NextResponse.json(
        { error: 'Failed to fetch trades' },
        { status: 500 }
      );
    }
    
    if (!trades || trades.length === 0) {
      return NextResponse.json({
        report: null,
        message: 'No trades found for tax year',
        jurisdiction,
        taxYear
      });
    }
    
    // Convert to trade records
    const tradeRecords = trades.map(t => ({
      date: new Date(t.created_at),
      symbol: t.trading_pair || 'BTC/USDT',
      side: t.side?.toLowerCase() as 'buy' | 'sell',
      quantity: parseFloat(((t.quantity as unknown) as string) || '0'),
      price: parseFloat(((t.price as unknown) as string) || '0'),
      fees: parseFloat(((t.fee as unknown) as string) || '0'),
      total: parseFloat(((t.total_value as unknown) as string) || '0'),
      currency: 'USD'
    }));
    
    // european_tax_reports mangler i genererte Database-typer — skjemaet utvides lokalt
    // via DbWithEuropeanTaxReports (mønster: log-admin-audit.ts / klt.ts)
    const { data: report, error: reportError } = await (
      supabase as unknown as SupabaseClient<DbWithEuropeanTaxReports>
    )
      .from('european_tax_reports')
      .upsert(
        {
          user_id: user.id,
          jurisdiction,
          tax_year: taxYear,
          report_format: format,
          report_data: { trades: tradeRecords },
          total_gains: 0,
          total_losses: 0,
          net_taxable: 0,
          estimated_tax: 0,
          tax_currency: getCurrencyForJurisdiction(jurisdiction),
          calculation_method: getMethodForJurisdiction(jurisdiction),
          generated_at: new Date().toISOString()
        },
        {
          onConflict: 'user_id,jurisdiction,tax_year'
        }
      )
      .select()
      .single();
    
    if (reportError || !report) {
      console.error('Report store error:', reportError);
      return NextResponse.json(
        { error: 'Failed to store tax report' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      report: {
        id: report.id,
        jurisdiction: report.jurisdiction,
        taxYear: report.tax_year,
        format: report.report_format,
        currency: report.tax_currency,
        method: report.calculation_method,
        tradeCount: tradeRecords.length,
        generatedAt: report.generated_at
      },
      trades: tradeRecords.length,
      filingDeadline: getFilingDeadline(jurisdiction, taxYear),
      downloadUrl: `/api/trading/v3/tax/eu-report/${jurisdiction}/${taxYear}`
    });
    
  } catch (error) {
    console.error('Tax report generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest
) {
  try {
    // Extract params from URL search params instead of route params
    const url = new URL(request.url);
    const jurisdiction = url.searchParams.get('jurisdiction') || '';
    const year = url.searchParams.get('year') || '';
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const taxYear = parseInt(year);
    
    if (!VALID_JURISDICTIONS.includes(jurisdiction as EuropeanJurisdiction)) {
      return NextResponse.json(
        { error: 'Invalid jurisdiction' },
        { status: 400 }
      );
    }
    
    // Fetch existing report — european_tax_reports mangler i genererte Database-typer
    const { data: report, error } = await (
      supabase as unknown as SupabaseClient<DbWithEuropeanTaxReports>
    )
      .from('european_tax_reports')
      .select('*')
      .eq('user_id', user.id)
      .eq('jurisdiction', jurisdiction)
      .eq('tax_year', taxYear)
      .single();
    
    if (error || !report) {
      return NextResponse.json(
        { error: 'Report not found', message: 'Generate report first using POST' },
        { status: 404 }
      );
    }
    
    // Generate export based on format
    const format = report.report_format;
    const content = generateExport(report, format);
    
    const contentType = format === 'XML' ? 'application/xml' :
                       format === 'CSV' ? 'text/csv' : 'application/json';
    
    const extension = format === 'XML' ? 'xml' :
                     format === 'CSV' ? 'csv' : 'json';
    
    return new NextResponse(content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="tax-report-${jurisdiction}-${taxYear}.${extension}"`
      }
    });
    
  } catch (error) {
    console.error('Tax report download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function getCurrencyForJurisdiction(jurisdiction: EuropeanJurisdiction): string {
  const currencies: Record<EuropeanJurisdiction, string> = {
    DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', AT: 'EUR',
    CH: 'CHF', NO: 'NOK'
  };
  return currencies[jurisdiction];
}

function getMethodForJurisdiction(jurisdiction: EuropeanJurisdiction): string {
  const methods: Record<EuropeanJurisdiction, string> = {
    DE: 'FIFO', FR: 'FIFO', IT: 'FIFO', ES: 'FIFO', NL: 'AVG', AT: 'FIFO', CH: 'AVG', NO: 'FIFO'
  };
  return methods[jurisdiction];
}

function getFilingDeadline(jurisdiction: EuropeanJurisdiction, taxYear: number): string {
  const deadlines: Record<EuropeanJurisdiction, string> = {
    DE: `${taxYear + 1}-05-31`,
    FR: `${taxYear + 1}-05-22`,
    IT: `${taxYear + 1}-06-30`,
    ES: `${taxYear + 1}-06-30`,
    NL: `${taxYear + 1}-05-01`,
    AT: `${taxYear + 1}-04-30`,
    CH: `${taxYear + 1}-03-31`,
    NO: `${taxYear + 1}-04-30`
  };
  return deadlines[jurisdiction];
}

function generateExport(report: TaxReport, format: 'XML' | 'CSV' | 'PDF'): string {
  const tradeRecords = report.report_data?.trades || [];
  
  switch (format) {
    case 'XML':
      return generateXML(report, tradeRecords);
    case 'CSV':
      return generateCSV(report, tradeRecords);
    default:
      return JSON.stringify({
        report,
        trades: tradeRecords
      }, null, 2);
  }
}

function generateXML(report: TaxReport, trades: TradeRecord[]): string {
  const header = '<?xml version="1.0" encoding="UTF-8"?>';
  const tradesXml = trades.map(t => `
  <Trade>
    <Date>${t.date}</Date>
    <Symbol>${t.symbol}</Symbol>
    <Side>${t.side}</Side>
    <Quantity>${t.quantity}</Quantity>
    <Price>${t.price}</Price>
    <Fees>${t.fees}</Fees>
    <Total>${t.total}</Total>
  </Trade>`).join('');
  
  return `${header}
<TaxReport jurisdiction="${report.jurisdiction}" year="${report.tax_year}">
  <Summary>
    <TotalGains>${report.total_gains || 0}</TotalGains>
    <TotalLosses>${report.total_losses || 0}</TotalLosses>
    <NetTaxable>${report.net_taxable || 0}</NetTaxable>
    <EstimatedTax>${report.estimated_tax || 0}</EstimatedTax>
    <Currency>${report.tax_currency}</Currency>
    <Method>${report.calculation_method}</Method>
  </Summary>
  <Trades>${tradesXml}
  </Trades>
</TaxReport>`;
}

function generateCSV(report: TaxReport, trades: TradeRecord[]): string {
  const header = 'Date,Symbol,Side,Quantity,Price,Fees,Total';
  const rows = trades.map(t => 
    `${t.date},${t.symbol},${t.side},${t.quantity},${t.price},${t.fees},${t.total}`
  );
  
  const summary = [
    '',
    'SUMMARY',
    `Jurisdiction,${report.jurisdiction}`,
    `Tax Year,${report.tax_year}`,
    `Total Gains,${report.total_gains || 0}`,
    `Total Losses,${report.total_losses || 0}`,
    `Net Taxable,${report.net_taxable || 0}`,
    `Estimated Tax,${report.estimated_tax || 0}`,
    `Currency,${report.tax_currency}`,
    `Method,${report.calculation_method}`
  ];
  
  return [header, ...rows, ...summary].join('\n');
}
