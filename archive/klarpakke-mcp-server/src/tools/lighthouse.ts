/**
 * Lighthouse Performance Tool for Klarpakke MCP
 * 
 * Provides web performance auditing using HTTP checks and basic metrics.
 * Simplified for Deno compatibility.
 */

export interface LighthouseOptions {
  url: string;
  device?: 'mobile' | 'desktop';
}

export interface LighthouseResult {
  url: string;
  device: 'mobile' | 'desktop';
  scores: {
    performance: number;
    accessibility: number;
    bestPractices: number;
    seo: number;
  };
  metrics: {
    responseTime: number;
    pageSize: number;
    resourceCount: number;
    errorCount: number;
  };
  diagnostics: Array<{
    title: string;
    description: string;
    severity: 'error' | 'warning' | 'info';
  }>;
  passedAudits: number;
  failedAudits: number;
}

export class LighthouseTool {
  async audit(options: LighthouseOptions): Promise<LighthouseResult> {
    const { url, device = 'desktop' } = options;
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': device === 'mobile' 
            ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)'
            : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      const responseTime = Date.now() - startTime;
      const html = await response.text();
      const pageSize = new Blob([html]).size;

      const diagnostics: Array<{title: string; description: string; severity: 'error' | 'warning' | 'info'}> = [];
      let passedAudits = 0;
      let failedAudits = 0;

      // Performance checks
      if (responseTime > 3000) {
        diagnostics.push({
          title: 'Slow Response Time',
          description: `Response took ${responseTime}ms (target: <3000ms)`,
          severity: 'error'
        });
        failedAudits++;
      } else if (responseTime > 1500) {
        diagnostics.push({
          title: 'Moderate Response Time',
          description: `Response took ${responseTime}ms (target: <1500ms)`,
          severity: 'warning'
        });
        passedAudits++;
      } else {
        passedAudits++;
      }

      if (pageSize > 2 * 1024 * 1024) { // 2MB
        diagnostics.push({
          title: 'Large Page Size',
          description: `Page is ${(pageSize / 1024 / 1024).toFixed(2)}MB (target: <2MB)`,
          severity: 'warning'
        });
        failedAudits++;
      } else {
        passedAudits++;
      }

      // SEO checks
      const hasTitle = html.includes('<title>');
      const hasMetaDescription = html.includes('name="description"') || html.includes('name="Description"');
      const hasCanonical = html.includes('rel="canonical"');
      const hasViewport = html.includes('name="viewport"');

      if (!hasTitle) {
        diagnostics.push({
          title: 'Missing Title Tag',
          description: 'Page is missing <title> tag',
          severity: 'error'
        });
        failedAudits++;
      } else {
        passedAudits++;
      }

      if (!hasMetaDescription) {
        diagnostics.push({
          title: 'Missing Meta Description',
          description: 'Page is missing meta description',
          severity: 'warning'
        });
        failedAudits++;
      } else {
        passedAudits++;
      }

      if (!hasCanonical) {
        diagnostics.push({
          title: 'Missing Canonical URL',
          description: 'Page is missing canonical link',
          severity: 'info'
        });
        failedAudits++;
      } else {
        passedAudits++;
      }

      if (!hasViewport) {
        diagnostics.push({
          title: 'Missing Viewport Meta',
          description: 'Not mobile-friendly',
          severity: 'error'
        });
        failedAudits++;
      } else {
        passedAudits++;
      }

      // Accessibility checks
      const hasLang = html.includes('<html lang=');
      const hasAltImages = !html.includes('<img') || html.includes('alt=');

      if (!hasLang) {
        diagnostics.push({
          title: 'Missing Lang Attribute',
          description: 'HTML tag missing lang attribute',
          severity: 'error'
        });
        failedAudits++;
      } else {
        passedAudits++;
      }

      if (!hasAltImages) {
        diagnostics.push({
          title: 'Images Without Alt Text',
          description: 'Some images are missing alt attributes',
          severity: 'warning'
        });
        failedAudits++;
      } else {
        passedAudits++;
      }

      // Best practices
      const hasHTTPS = url.startsWith('https://');
      if (!hasHTTPS) {
        diagnostics.push({
          title: 'Not Using HTTPS',
          description: 'Page should use HTTPS',
          severity: 'error'
        });
        failedAudits++;
      } else {
        passedAudits++;
      }

      // Calculate scores
      const performanceScore = Math.max(0, 100 - (responseTime / 50) - (pageSize / 1024 / 1024 * 10));
      const accessibilityScore = (hasLang && hasAltImages) ? 90 : hasLang ? 70 : 50;
      const bestPracticesScore = hasHTTPS ? 90 : 70;
      const seoScore = (hasTitle && hasMetaDescription && hasViewport) ? 90 : 60;

      return {
        url,
        device,
        scores: {
          performance: Math.round(Math.min(100, performanceScore)),
          accessibility: accessibilityScore,
          bestPractices: bestPracticesScore,
          seo: seoScore
        },
        metrics: {
          responseTime,
          pageSize,
          resourceCount: (html.match(/<script/g) || []).length + (html.match(/<link/g) || []).length,
          errorCount: diagnostics.filter(d => d.severity === 'error').length
        },
        diagnostics,
        passedAudits,
        failedAudits
      };
    } catch (error) {
      return {
        url,
        device,
        scores: {
          performance: 0,
          accessibility: 0,
          bestPractices: 0,
          seo: 0
        },
        metrics: {
          responseTime: Date.now() - startTime,
          pageSize: 0,
          resourceCount: 0,
          errorCount: 1
        },
        diagnostics: [{
          title: 'Audit Failed',
          description: error instanceof Error ? error.message : 'Unknown error',
          severity: 'error'
        }],
        passedAudits: 0,
        failedAudits: 1
      };
    }
  }

  async auditAuthPages(): Promise<LighthouseResult[]> {
    const baseUrl = 'https://www.klarpakke.no';
    const pages = [
      { url: `${baseUrl}/no/innlogging`, name: 'Login Page' },
      { url: `${baseUrl}/no/signup`, name: 'Signup Page' },
      { url: `${baseUrl}/no/dashboard`, name: 'Dashboard' }
    ];

    const results: LighthouseResult[] = [];

    for (const page of pages) {
      try {
        const result = await this.audit({
          url: page.url,
          device: 'desktop'
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to audit ${page.name}:`, error);
      }
    }

    return results;
  }

  generateReport(results: LighthouseResult[]): string {
    let report = '# Lighthouse Performance Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;

    for (const result of results) {
      report += `## ${result.url}\n\n`;
      report += `**Device:** ${result.device}\n\n`;
      
      report += '### Scores\n\n';
      report += `| Category | Score |\n`;
      report += `|----------|-------|\n`;
      report += `| Performance | ${result.scores.performance}/100 |\n`;
      report += `| Accessibility | ${result.scores.accessibility}/100 |\n`;
      report += `| Best Practices | ${result.scores.bestPractices}/100 |\n`;
      report += `| SEO | ${result.scores.seo}/100 |\n`;
      
      report += '\n### Key Metrics\n\n';
      report += `| Metric | Value |\n`;
      report += `|--------|-------|\n`;
      report += `| Response Time | ${result.metrics.responseTime}ms |\n`;
      report += `| Page Size | ${(result.metrics.pageSize / 1024).toFixed(2)}KB |\n`;
      report += `| Resources | ${result.metrics.resourceCount} |\n`;
      report += `| Errors | ${result.metrics.errorCount} |\n`;
      
      if (result.diagnostics.length > 0) {
        report += '\n### Issues\n\n';
        for (const issue of result.diagnostics) {
          const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
          report += `${icon} **${issue.title}**: ${issue.description}\n\n`;
        }
      }

      report += '\n---\n\n';
    }

    return report;
  }
}

// Export singleton instance
export const lighthouseTool = new LighthouseTool();
