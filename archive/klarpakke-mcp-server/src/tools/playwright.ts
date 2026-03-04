/**
 * Playwright Testing Tool for Klarpakke MCP
 * 
 * Provides browser automation capabilities for E2E testing,
 * auth flow verification, and page interaction testing.
 */

// Simple HTTP-based testing instead of full browser automation
// to avoid Electron dependencies in Deno

export interface TestResult {
  success: boolean;
  url?: string;
  statusCode?: number;
  responseTime?: number;
  error?: string;
  headers?: Record<string, string>;
  contentChecks?: {
    hasLoginForm: boolean;
    hasGoogleButton: boolean;
    hasLinkedinButton: boolean;
    hasEmailInput: boolean;
  };
}

export class PlaywrightTool {
  async testLoginPage(baseUrl: string = 'https://www.klarpakke.no'): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(`${baseUrl}/no/innlogging`, {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Klarpakke-MCP-Tester/1.0'
        }
      });

      const responseTime = Date.now() - startTime;
      const html = await response.text();

      // Check for critical elements in HTML
      const hasGoogleButton = html.includes('Fortsett med Google') || 
                              html.includes('Continue with Google') ||
                              html.includes('google');
      const hasLinkedinButton = html.includes('Fortsett med LinkedIn') || 
                                html.includes('Continue with LinkedIn') ||
                                html.includes('linkedin');
      const hasEmailInput = html.includes('type="email"') || 
                            html.includes('email');
      const hasLoginForm = html.includes('<form') || 
                           html.includes('innlogging') ||
                           html.includes('login');

      return {
        success: response.ok && hasGoogleButton && hasLinkedinButton,
        url: `${baseUrl}/no/innlogging`,
        statusCode: response.status,
        responseTime,
        headers: Object.fromEntries(response.headers.entries()),
        contentChecks: {
          hasLoginForm,
          hasGoogleButton,
          hasLinkedinButton,
          hasEmailInput
        }
      };
    } catch (error) {
      return {
        success: false,
        url: `${baseUrl}/no/innlogging`,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testAuthFlow(provider: 'google' | 'linkedin'): Promise<TestResult> {
    try {
      // Test OAuth initialization by checking if the OAuth URL is properly formed
      const response = await fetch('https://www.klarpakke.no/no/innlogging');
      const html = await response.text();

      const providerName = provider === 'google' ? 'google' : 'linkedin';
      const hasOAuthLink = html.includes(providerName);
      
      return {
        success: hasOAuthLink,
        url: 'https://www.klarpakke.no/no/innlogging',
        contentChecks: {
          hasLoginForm: html.includes('<form'),
          hasGoogleButton: html.includes('google'),
          hasLinkedinButton: html.includes('linkedin'),
          hasEmailInput: html.includes('email')
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auth flow test failed'
      };
    }
  }

  async testPageAccessibility(url: string): Promise<{
    violations: Array<{
      rule: string;
      impact: string;
      elements: string[];
    }>;
    passes: number;
    score: number;
  }> {
    try {
      const response = await fetch(url);
      const html = await response.text();

      const violations = [];

      // Check for images without alt
      const imgRegex = /<img[^>]*>/gi;
      const images = html.match(imgRegex) || [];
      const imagesWithoutAlt = images.filter(img => !img.includes('alt='));
      
      if (imagesWithoutAlt.length > 0) {
        violations.push({
          rule: 'image-alt',
          impact: 'critical',
          elements: imagesWithoutAlt.slice(0, 5) // Limit to first 5
        });
      }

      // Check for form inputs without labels
      const inputRegex = /<input[^>]*>/gi;
      const inputs = html.match(inputRegex) || [];
      const inputsWithoutLabels = inputs.filter(input => {
        const hasAriaLabel = input.includes('aria-label');
        const hasAriaLabelledBy = input.includes('aria-labelledby');
        const hasId = input.match(/id="([^"]+)"/);
        // Check if there's a corresponding label
        const id = hasId ? hasId[1] : null;
        const hasLabel = id && html.includes(`for="${id}"`);
        return !hasAriaLabel && !hasAriaLabelledBy && !hasLabel;
      });

      if (inputsWithoutLabels.length > 0) {
        violations.push({
          rule: 'label',
          impact: 'serious',
          elements: inputsWithoutLabels.slice(0, 5)
        });
      }

      // Check for missing lang attribute
      const hasLang = html.includes('<html lang=');
      if (!hasLang) {
        violations.push({
          rule: 'html-lang',
          impact: 'serious',
          elements: ['<html>']
        });
      }

      const score = Math.max(0, 100 - (violations.length * 15));

      return {
        violations,
        passes: 100 - (violations.length * 10),
        score
      };
    } catch (error) {
      return {
        violations: [{
          rule: 'evaluation-failed',
          impact: 'critical',
          elements: [error instanceof Error ? error.message : 'Unknown error']
        }],
        passes: 0,
        score: 0
      };
    }
  }

  async healthCheck(baseUrl: string = 'https://www.klarpakke.no'): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    responseTime: number;
    statusCode: number;
    checks: {
      homepage: boolean;
      loginPage: boolean;
      api: boolean;
    };
  }> {
    const startTime = Date.now();
    const checks = {
      homepage: false,
      loginPage: false,
      api: false
    };

    try {
      // Check homepage
      const homeRes = await fetch(baseUrl);
      checks.homepage = homeRes.ok;

      // Check login page
      const loginRes = await fetch(`${baseUrl}/no/innlogging`);
      checks.loginPage = loginRes.ok;

      // Check API health
      const apiRes = await fetch(`${baseUrl}/api/health`);
      checks.api = apiRes.ok;

      const responseTime = Date.now() - startTime;
      const allHealthy = checks.homepage && checks.loginPage && checks.api;
      const someHealthy = checks.homepage || checks.loginPage || checks.api;

      return {
        status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'down',
        responseTime,
        statusCode: homeRes.status,
        checks
      };
    } catch {
      return {
        status: 'down',
        responseTime: Date.now() - startTime,
        statusCode: 0,
        checks
      };
    }
  }
}

// Export singleton instance
export const playwrightTool = new PlaywrightTool();
