/**
 * European Tax Compliance Layer
 * 
 * Supports tax reporting for:
 * - Germany (BaFin / Bundesfinanzministerium)
 * - France (AMF / DGFiP)
 * - Italy (CONSOB / Agenzia delle Entrate)
 * - Spain (CNMV / Agencia Tributaria)
 * - Netherlands (AFM / Belastingdienst)
 * - Austria (FMA / BMF)
 * - Switzerland (FINMA / ESTV)
 * - Norway (Finanstilsynet / Skatteetaten)
 * 
 * @module trading/white-label/european-tax
 * @version 3.0.0
 */

export type EuropeanJurisdiction = 'DE' | 'FR' | 'IT' | 'ES' | 'NL' | 'AT' | 'CH' | 'NO';

export interface TaxReportConfig {
  jurisdiction: EuropeanJurisdiction;
  taxYear: number;
  clientId: string;
  reportFormat: 'XML' | 'CSV' | 'PDF';
}

export interface TradeRecord {
  date: Date;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  fees: number;
  total: number;
  currency: string;
}

export interface TaxLot {
  acquisitionDate: Date;
  disposalDate: Date;
  symbol: string;
  quantity: number;
  costBasis: number;
  proceeds: number;
  fees: number;
  gainLoss: number;
  holdingPeriodDays: number;
  isShortTerm: boolean;
}

export interface TaxSummary {
  jurisdiction: EuropeanJurisdiction;
  taxYear: number;
  totalGains: number;
  totalLosses: number;
  netGainLoss: number;
  taxableAmount: number;
  estimatedTax: number;
  taxCurrency: string;
  lots: TaxLot[];
  method: 'FIFO' | 'LIFO' | 'HIFO' | 'AVG';
}

// Tax rules by jurisdiction
interface TaxRules {
  method: 'FIFO' | 'LIFO' | 'HIFO' | 'AVG';
  shortTermThreshold: number; // days
  shortTermRate: number;
  longTermRate: number;
  taxFreeAllowance: number;
  reportingCurrency: string;
  deadline: string; // MM-DD
  format: 'XML' | 'CSV' | 'PDF';
  cryptoSpecific: boolean;
  progressiveRates?: number[];
}

const JURISDICTION_RULES: Record<EuropeanJurisdiction, TaxRules> = {
  // Germany
  DE: {
    method: 'FIFO',
    shortTermThreshold: 365,
    shortTermRate: 0.00, // Tax free if held > 1 year
    longTermRate: 0.00,
    taxFreeAllowance: 600, // Sparerpauschbetrag
    reportingCurrency: 'EUR',
    deadline: '05-31',
    format: 'XML',
    cryptoSpecific: true,
    progressiveRates: [0, 0.14, 0.24, 0.42, 0.45]
  },
  
  // France
  FR: {
    method: 'FIFO',
    shortTermThreshold: 0, // Flat rate regardless of holding
    shortTermRate: 0.30, // Flat tax (PFU)
    longTermRate: 0.30,
    taxFreeAllowance: 305, // Annual allowance
    reportingCurrency: 'EUR',
    deadline: '05-22',
    format: 'XML',
    cryptoSpecific: true
  },
  
  // Italy
  IT: {
    method: 'FIFO',
    shortTermThreshold: 0,
    shortTermRate: 0.26, // Substitute tax
    longTermRate: 0.26,
    taxFreeAllowance: 0,
    reportingCurrency: 'EUR',
    deadline: '06-30',
    format: 'PDF',
    cryptoSpecific: true
  },
  
  // Spain
  ES: {
    method: 'FIFO',
    shortTermThreshold: 365,
    shortTermRate: 0.19, // 19-26% progressive
    longTermRate: 0.19,
    taxFreeAllowance: 0,
    reportingCurrency: 'EUR',
    deadline: '06-30',
    format: 'PDF',
    cryptoSpecific: false,
    progressiveRates: [0.19, 0.21, 0.23, 0.27]
  },
  
  // Netherlands
  NL: {
    method: 'AVG', // Box 3 - fictitious return
    shortTermThreshold: 0,
    shortTermRate: 0.32, // 2024 rate on deemed return
    longTermRate: 0.32,
    taxFreeAllowance: 57000, // Vermogensvrijgesteld bedrag per person
    reportingCurrency: 'EUR',
    deadline: '05-01',
    format: 'XML',
    cryptoSpecific: false
  },
  
  // Austria
  AT: {
    method: 'FIFO',
    shortTermThreshold: 365,
    shortTermRate: 0.275, // Spekulationssteuer
    longTermRate: 0.00, // Tax free after 1 year
    taxFreeAllowance: 0,
    reportingCurrency: 'EUR',
    deadline: '04-30',
    format: 'PDF',
    cryptoSpecific: true
  },
  
  // Switzerland
  CH: {
    method: 'AVG',
    shortTermThreshold: 0,
    shortTermRate: 0.00, // No capital gains tax for private investors
    longTermRate: 0.00,
    taxFreeAllowance: 0,
    reportingCurrency: 'CHF',
    deadline: '03-31',
    format: 'PDF',
    cryptoSpecific: false
  },
  
  // Norway
  NO: {
    method: 'FIFO',
    shortTermThreshold: 0,
    shortTermRate: 0.22, // Skatt på kapitalinntekt
    longTermRate: 0.22,
    taxFreeAllowance: 0,
    reportingCurrency: 'NOK',
    deadline: '04-30',
    format: 'PDF',
    cryptoSpecific: true
  }
};

/**
 * European Tax Calculator
 */
export class EuropeanTaxCalculator {
  /**
   * Calculate tax lots using specified method
   */
  calculateLots(
    trades: TradeRecord[],
    method: TaxRules['method'] = 'FIFO'
  ): TaxLot[] {
    // Sort by date
    const sortedTrades = [...trades].sort((a, b) => a.date.getTime() - b.date.getTime());
    
    // Separate buys and sells
    const buys: TradeRecord[] = [];
    const sells: TradeRecord[] = [];
    
    for (const trade of sortedTrades) {
      if (trade.side === 'buy') {
        buys.push({ ...trade });
      } else {
        sells.push({ ...trade });
      }
    }
    
    const lots: TaxLot[] = [];
    
    for (const sell of sells) {
      let remainingSellQty = sell.quantity;
      
      while (remainingSellQty > 0 && buys.length > 0) {
        // Select buy based on method
        let buyIndex = 0;
        
        switch (method) {
          case 'FIFO':
            buyIndex = 0; // First in
            break;
          case 'LIFO':
            buyIndex = buys.length - 1; // Last in
            break;
          case 'HIFO':
            // Highest price first
            buyIndex = buys.reduce((maxIdx, buy, idx) => 
              buy.price > buys[maxIdx].price ? idx : maxIdx, 0);
            break;
          case 'AVG':
            // Average cost - handled differently
            break;
        }
        
        if (method === 'AVG') {
          // Calculate average cost of all remaining buys
          const totalQty = buys.reduce((sum, b) => sum + b.quantity, 0);
          const totalCost = buys.reduce((sum, b) => sum + (b.quantity * b.price), 0);
          const avgPrice = totalCost / totalQty;
          
          const matchedQty = Math.min(remainingSellQty, totalQty);
          const costBasis = matchedQty * avgPrice;
          const proceeds = matchedQty * sell.price;
          const fees = sell.fees * (matchedQty / sell.quantity);
          
          lots.push({
            acquisitionDate: buys[0].date,
            disposalDate: sell.date,
            symbol: sell.symbol,
            quantity: matchedQty,
            costBasis,
            proceeds,
            fees,
            gainLoss: proceeds - costBasis - fees,
            holdingPeriodDays: Math.floor((sell.date.getTime() - buys[0].date.getTime()) / (1000 * 60 * 60 * 24)),
            isShortTerm: true // Average method doesn't track individual holding periods
          });
          
          remainingSellQty -= matchedQty;
          buys.splice(0, buys.length); // Remove all for average method
        } else {
          const buy = buys[buyIndex];
          const matchedQty = Math.min(remainingSellQty, buy.quantity);
          
          const costBasis = matchedQty * buy.price;
          const proceeds = matchedQty * sell.price;
          const buyFees = buy.fees * (matchedQty / buy.quantity);
          const sellFees = sell.fees * (matchedQty / sell.quantity);
          
          const holdingPeriodDays = Math.floor(
            (sell.date.getTime() - buy.date.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          lots.push({
            acquisitionDate: buy.date,
            disposalDate: sell.date,
            symbol: sell.symbol,
            quantity: matchedQty,
            costBasis,
            proceeds,
            fees: buyFees + sellFees,
            gainLoss: proceeds - costBasis - sellFees,
            holdingPeriodDays,
            isShortTerm: holdingPeriodDays < 365
          });
          
          remainingSellQty -= matchedQty;
          buy.quantity -= matchedQty;
          
          if (buy.quantity <= 0.000001) {
            buys.splice(buyIndex, 1);
          }
        }
      }
    }
    
    return lots;
  }
  
  /**
   * Generate tax summary for jurisdiction
   */
  generateTaxSummary(
    jurisdiction: EuropeanJurisdiction,
    taxYear: number,
    trades: TradeRecord[],
    exchangeRate?: number // To EUR/CHF/NOK if needed
  ): TaxSummary {
    const rules = JURISDICTION_RULES[jurisdiction];
    const lots = this.calculateLots(trades, rules.method);
    
    // Calculate totals
    let totalGains = 0;
    let totalLosses = 0;
    let taxableGains = 0;
    let taxableLosses = 0;
    
    for (const lot of lots) {
      // Apply holding period rules
      const isTaxable = jurisdiction === 'DE' || jurisdiction === 'AT'
        ? lot.holdingPeriodDays <= rules.shortTermThreshold
        : true; // Other jurisdictions tax regardless of holding period
      
      if (lot.gainLoss > 0) {
        totalGains += lot.gainLoss;
        if (isTaxable) {
          taxableGains += lot.gainLoss;
        }
      } else {
        totalLosses += Math.abs(lot.gainLoss);
        if (isTaxable) {
          taxableLosses += Math.abs(lot.gainLoss);
        }
      }
    }
    
    const netGainLoss = taxableGains - taxableLosses;
    const taxableAmount = Math.max(0, netGainLoss - rules.taxFreeAllowance);
    
    // Calculate estimated tax
    let estimatedTax = 0;
    
    if (rules.progressiveRates) {
      // Progressive taxation
      for (const rate of rules.progressiveRates) {
        estimatedTax += taxableAmount * rate;
      }
    } else {
      // Flat rate
      const taxRate = netGainLoss > 0 ? rules.shortTermRate : 0;
      estimatedTax = taxableAmount * taxRate;
    }
    
    // Special case: Netherlands Box 3
    if (jurisdiction === 'NL') {
      // Fictitious return calculation
      const totalAssets = trades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.total, 0);
      const deemedReturn = totalAssets * 0.06; // 6% fictitious return
      const taxableBase = Math.max(0, totalAssets - rules.taxFreeAllowance);
      estimatedTax = taxableBase * 0.06 * rules.shortTermRate;
    }
    
    return {
      jurisdiction,
      taxYear,
      totalGains,
      totalLosses,
      netGainLoss,
      taxableAmount,
      estimatedTax,
      taxCurrency: rules.reportingCurrency,
      lots,
      method: rules.method
    };
  }
  
  /**
   * Export tax report in jurisdiction-specific format
   */
  exportReport(
    summary: TaxSummary,
    format: 'XML' | 'CSV' | 'PDF' = 'CSV'
  ): string {
    switch (format) {
      case 'XML':
        return this.exportXML(summary);
      case 'CSV':
        return this.exportCSV(summary);
      case 'PDF':
        // PDF would require a library, return structured data instead
        return JSON.stringify(summary, null, 2);
      default:
        return this.exportCSV(summary);
    }
  }
  
  /**
   * Export as XML (for Germany, France)
   */
  private exportXML(summary: TaxSummary): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>';
    
    const lotsXml = summary.lots.map(lot => `
  <Lot>
    <AcquisitionDate>${lot.acquisitionDate.toISOString().split('T')[0]}</AcquisitionDate>
    <DisposalDate>${lot.disposalDate.toISOString().split('T')[0]}</DisposalDate>
    <Symbol>${lot.symbol}</Symbol>
    <Quantity>${lot.quantity.toFixed(8)}</Quantity>
    <CostBasis>${lot.costBasis.toFixed(2)}</CostBasis>
    <Proceeds>${lot.proceeds.toFixed(2)}</Proceeds>
    <Fees>${lot.fees.toFixed(2)}</Fees>
    <GainLoss>${lot.gainLoss.toFixed(2)}</GainLoss>
    <HoldingPeriod>${lot.holdingPeriodDays}</HoldingPeriod>
  </Lot>`).join('');
    
    return `${xmlHeader}
<TaxReport>
  <Jurisdiction>${summary.jurisdiction}</Jurisdiction>
  <TaxYear>${summary.taxYear}</TaxYear>
  <TotalGains>${summary.totalGains.toFixed(2)}</TotalGains>
  <TotalLosses>${summary.totalLosses.toFixed(2)}</TotalLosses>
  <NetGainLoss>${summary.netGainLoss.toFixed(2)}</NetGainLoss>
  <TaxableAmount>${summary.taxableAmount.toFixed(2)}</TaxableAmount>
  <EstimatedTax>${summary.estimatedTax.toFixed(2)}</EstimatedTax>
  <Currency>${summary.taxCurrency}</Currency>
  <Method>${summary.method}</Method>
  <Lots>${lotsXml}
  </Lots>
</TaxReport>`;
  }
  
  /**
   * Export as CSV
   */
  private exportCSV(summary: TaxSummary): string {
    const header = [
      'Acquisition Date',
      'Disposal Date',
      'Symbol',
      'Quantity',
      'Cost Basis',
      'Proceeds',
      'Fees',
      'Gain/Loss',
      'Holding Period (Days)',
      'Short Term'
    ].join(',');
    
    const rows = summary.lots.map(lot => [
      lot.acquisitionDate.toISOString().split('T')[0],
      lot.disposalDate.toISOString().split('T')[0],
      lot.symbol,
      lot.quantity.toFixed(8),
      lot.costBasis.toFixed(2),
      lot.proceeds.toFixed(2),
      lot.fees.toFixed(2),
      lot.gainLoss.toFixed(2),
      lot.holdingPeriodDays,
      lot.isShortTerm ? 'Yes' : 'No'
    ].join(','));
    
    const summaryRows = [
      '',
      'SUMMARY',
      `Total Gains,${summary.totalGains.toFixed(2)}`,
      `Total Losses,${summary.totalLosses.toFixed(2)}`,
      `Net Gain/Loss,${summary.netGainLoss.toFixed(2)}`,
      `Taxable Amount,${summary.taxableAmount.toFixed(2)}`,
      `Estimated Tax,${summary.estimatedTax.toFixed(2)}`,
      `Currency,${summary.taxCurrency}`,
      `Method,${summary.method}`
    ];
    
    return [header, ...rows, ...summaryRows].join('\n');
  }
  
  /**
   * Get filing deadline for jurisdiction
   */
  getFilingDeadline(jurisdiction: EuropeanJurisdiction, taxYear: number): Date {
    const rules = JURISDICTION_RULES[jurisdiction];
    const [month, day] = rules.deadline.split('-').map(Number);
    return new Date(taxYear + 1, month - 1, day);
  }
  
  /**
   * Check if crypto is treated as currency or asset
   */
  isCryptoCurrency(jurisdiction: EuropeanJurisdiction): boolean {
    // Only Switzerland treats crypto as currency for VAT purposes
    return jurisdiction === 'CH';
  }
  
  /**
   * Get required documentation for jurisdiction
   */
  getRequiredDocumentation(jurisdiction: EuropeanJurisdiction): string[] {
    const common = [
      'Trade confirmations',
      'Exchange statements',
      'Fee breakdowns'
    ];
    
    switch (jurisdiction) {
      case 'DE':
        return [...common, 'Wallet addresses', 'Staking rewards documentation'];
      case 'FR':
        return [...common, 'Form 3916-bis if foreign exchange'];
      case 'NL':
        return [...common, 'Year-end portfolio value'];
      case 'CH':
        return [...common, 'Wealth tax declaration'];
      default:
        return common;
    }
  }
}

/**
 * Multi-jurisdiction tax aggregator for white-label partners
 */
export class MultiJurisdictionTaxAggregator {
  private calculator = new EuropeanTaxCalculator();
  private reports: Map<string, TaxSummary> = new Map();
  
  /**
   * Add trades for a client in a jurisdiction
   */
  addClientTrades(
    clientId: string,
    jurisdiction: EuropeanJurisdiction,
    taxYear: number,
    trades: TradeRecord[]
  ): void {
    const key = `${clientId}-${jurisdiction}-${taxYear}`;
    const summary = this.calculator.generateTaxSummary(jurisdiction, taxYear, trades);
    this.reports.set(key, summary);
  }
  
  /**
   * Get consolidated report across all jurisdictions
   */
  getConsolidatedReport(taxYear: number): {
    totalClients: number;
    totalTaxableAmount: number;
    totalEstimatedTax: number;
    byJurisdiction: Record<EuropeanJurisdiction, { clients: number; taxable: number; tax: number }>;
  } {
    const byJurisdiction: Record<string, { clients: number; taxable: number; tax: number }> = {};
    
    for (const [key, summary] of this.reports) {
      if (summary.taxYear === taxYear) {
        if (!byJurisdiction[summary.jurisdiction]) {
          byJurisdiction[summary.jurisdiction] = { clients: 0, taxable: 0, tax: 0 };
        }
        byJurisdiction[summary.jurisdiction].clients++;
        byJurisdiction[summary.jurisdiction].taxable += summary.taxableAmount;
        byJurisdiction[summary.jurisdiction].tax += summary.estimatedTax;
      }
    }
    
    const totalClients = Object.values(byJurisdiction).reduce((sum, j) => sum + j.clients, 0);
    const totalTaxableAmount = Object.values(byJurisdiction).reduce((sum, j) => sum + j.taxable, 0);
    const totalEstimatedTax = Object.values(byJurisdiction).reduce((sum, j) => sum + j.tax, 0);
    
    return {
      totalClients,
      totalTaxableAmount,
      totalEstimatedTax,
      byJurisdiction: byJurisdiction as Record<EuropeanJurisdiction, { clients: number; taxable: number; tax: number }>
    };
  }
  
  /**
   * Export all reports for a tax year
   */
  exportAllReports(taxYear: number, format: 'XML' | 'CSV' | 'PDF'): Map<string, string> {
    const exports = new Map<string, string>();
    
    for (const [key, summary] of this.reports) {
      if (summary.taxYear === taxYear) {
        const content = this.calculator.exportReport(summary, format);
        exports.set(key, content);
      }
    }
    
    return exports;
  }
  
  /**
   * Get upcoming deadlines
   */
  getUpcomingDeadlines(daysAhead: number = 30): Array<{
    jurisdiction: EuropeanJurisdiction;
    deadline: Date;
    taxYear: number;
    daysRemaining: number;
  }> {
    const now = new Date();
    const upcoming: Array<{
      jurisdiction: EuropeanJurisdiction;
      deadline: Date;
      taxYear: number;
      daysRemaining: number;
    }> = [];
    
    const taxYears = [...new Set([...this.reports.values()].map(r => r.taxYear))];
    
    for (const jurisdiction of Object.keys(JURISDICTION_RULES) as EuropeanJurisdiction[]) {
      for (const taxYear of taxYears) {
        const deadline = this.calculator.getFilingDeadline(jurisdiction, taxYear);
        const daysRemaining = Math.floor((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= daysAhead && daysRemaining >= 0) {
          upcoming.push({
            jurisdiction,
            deadline,
            taxYear,
            daysRemaining
          });
        }
      }
    }
    
    return upcoming.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }
}
