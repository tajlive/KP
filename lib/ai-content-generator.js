/**
 * AI Content Generator
 *
 * Generates content for Webflow pages using AI (Perplexity Pro)
 * Falls back to template-based content if AI is unavailable
 *
 * Usage:
 *   const AIContentGenerator = require('./lib/ai-content-generator');
 *   const ai = new AIContentGenerator(apiKey);
 *   const content = await ai.generatePageContent('landing', options);
 */

const axios = require('axios');

class AIContentGenerator {
  constructor(apiKey = null) {
    this.apiKey = apiKey;
    this.hasAI = !!apiKey;

    if (this.hasAI) {
      this.client = axios.create({
        baseURL: 'https://api.perplexity.ai',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout for AI generation
      });
      console.log('✅ AI Content Generator initialized with Perplexity API');
    } else {
      console.log('⚠️  AI Content Generator running in fallback mode (no API key)');
    }
  }

  /**
   * Generate page content using AI or fallback templates
   * @param {string} pageType - Type of page (landing, pricing, dashboard, etc.)
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} Generated content
   */
  async generatePageContent(pageType, options = {}) {
    const {
      tone = 'professional',
      targetAudience = 'Norwegian investors',
      sections = [],
      language = 'norwegian'
    } = options;

    if (this.hasAI) {
      try {
        return await this._generateWithAI(pageType, options);
      } catch (error) {
        console.warn('⚠️  AI generation failed, falling back to templates:', error.message);
        return this._generateWithTemplate(pageType, options);
      }
    } else {
      return this._generateWithTemplate(pageType, options);
    }
  }

  /**
   * Generate content using Perplexity AI
   * @private
   */
  async _generateWithAI(pageType, options) {
    const prompt = this._buildPrompt(pageType, options);

    const response = await this.client.post('/chat/completions', {
      model: 'llama-3.1-sonar-large-128k-online',
      messages: [
        {
          role: 'system',
          content: 'You are a professional Norwegian copywriter specializing in fintech and cryptocurrency trading platforms. Generate clear, concise, and engaging content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const generatedText = response.data.choices[0].message.content;

    return this._parseAIResponse(generatedText, pageType);
  }

  /**
   * Build prompt for AI based on page type
   * @private
   */
  _buildPrompt(pageType, options) {
    const { tone, targetAudience, sections, language } = options;

    const prompts = {
      landing: `Generate content for a landing page for Klarpakke, a cryptocurrency trading signal platform.
Target audience: ${targetAudience}
Tone: ${tone}
Language: ${language}

Include:
- Compelling hero headline (max 60 characters)
- Hero subheadline (max 120 characters)
- 3 key features with short descriptions
- Call-to-action text
- Trust elements

Format as JSON with keys: headline, subheadline, features (array of {title, description}), cta, trustElements`,

      pricing: `Generate pricing page content for Klarpakke.
Language: ${language}
Tone: ${tone}

We have 4 pricing tiers:
1. Paper - Free trial
2. Safe - Basic paid
3. Pro - Professional
4. Extrem - Premium

For each tier, provide:
- Short description (max 50 characters)
- 3-4 key features

Format as JSON with key "tiers" containing array of {name, description, features}`,

      dashboard: `Generate UI text for a trading signals dashboard.
Language: ${language}

Include:
- Welcome message
- Empty state text (when no signals)
- Filter labels (BUY, SELL, ALL)
- Button texts (Approve, Reject, Undo)
- Loading states

Format as JSON with appropriate keys`,

      calculator: `Generate UI text for a risk calculator page.
Language: ${language}

Include:
- Page title
- Input field labels (capital, risk percentage, etc.)
- Help text for each field
- Result labels

Format as JSON`,

      settings: `Generate UI text for user settings page.
Language: ${language}

Include:
- Section titles (profile, security, notifications)
- Button texts
- Form labels
- Success messages

Format as JSON`
    };

    return prompts[pageType] || prompts.landing;
  }

  /**
   * Parse AI response into structured format
   * @private
   */
  _parseAIResponse(text, pageType) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          aiGenerated: true,
          ...parsed
        };
      }
    } catch (error) {
      console.warn('Failed to parse AI JSON response');
    }

    // Fallback: treat as plain text
    return {
      success: true,
      aiGenerated: true,
      rawText: text,
      pageType
    };
  }

  /**
   * Generate content using templates (fallback)
   * @private
   */
  _generateWithTemplate(pageType, options) {
    const templates = {
      landing: {
        headline: 'Trygg Krypto-Trading med Klarpakke',
        subheadline: 'Få profesjonelle trading-signaler og ta kontroll over dine investeringer',
        features: [
          {
            title: 'Profesjonelle Signaler',
            description: 'Få kvalitetssikrede trading-signaler fra eksperter'
          },
          {
            title: 'Risikostyring',
            description: 'Innebygd kalkulator for optimal posisjonsstørrelse'
          },
          {
            title: 'Sikkerhet Først',
            description: 'Dine data er beskyttet med bank-nivå sikkerhet'
          }
        ],
        cta: 'Kom i gang gratis',
        trustElements: ['Norsk selskap', 'GDPR-compliant', 'Kryptert kommunikasjon']
      },

      pricing: {
        tiers: [
          {
            name: 'Paper',
            description: 'For nybegynnere',
            features: [
              'Paper trading (simulering)',
              '5 signaler per måned',
              'Grunnleggende kalkulator',
              'Email support'
            ]
          },
          {
            name: 'Safe',
            description: 'For seriøse tradere',
            features: [
              'Ubegrenset signaler',
              'Avansert kalkulator',
              'Prioritert support',
              'Historikk og statistikk'
            ]
          },
          {
            name: 'Pro',
            description: 'For profesjonelle',
            features: [
              'Alt i Safe, pluss:',
              'Sanntids varsler',
              'API tilgang',
              'Dedikert support'
            ]
          },
          {
            name: 'Extrem',
            description: 'For institusjonelle',
            features: [
              'Alt i Pro, pluss:',
              'Custom integrasjoner',
              '1-on-1 konsultasjon',
              'Prioriterte signaler'
            ]
          }
        ]
      },

      dashboard: {
        welcome: 'Velkommen til Klarpakke',
        emptyState: 'Ingen aktive signaler for øyeblikket',
        filters: {
          all: 'Alle',
          buy: 'KJøP',
          sell: 'SELG'
        },
        buttons: {
          approve: 'Godkjenn',
          reject: 'Avvis',
          undo: 'Angre'
        },
        loading: 'Laster signaler...'
      },

      calculator: {
        title: 'Risiko Kalkulator',
        labels: {
          capital: 'Total Kapital (NOK)',
          riskPercent: 'Risiko per Trade (%)',
          entryPrice: 'Inngang Pris',
          stopLoss: 'Stop Loss Pris',
          result: 'Anbefalt Posisjonsstørrelse'
        },
        help: {
          capital: 'Din totale trading-kapital',
          riskPercent: 'Hvor mye % du vil risikere per trade (anbefalt: 1-2%)',
          entryPrice: 'Prisen du planlegger å entre på',
          stopLoss: 'Prisen du vil stoppe tapet på'
        }
      },

      settings: {
        sections: {
          profile: 'Profil',
          security: 'Sikkerhet',
          notifications: 'Varsler'
        },
        buttons: {
          save: 'Lagre endringer',
          cancel: 'Avbryt',
          logout: 'Logg ut'
        },
        success: {
          saved: 'Innstillinger lagret',
          updated: 'Profil oppdatert'
        }
      },

      login: {
        title: 'Logg Inn',
        emailLabel: 'E-post',
        passwordLabel: 'Passord',
        submitButton: 'Logg Inn',
        forgotPassword: 'Glemt passord?',
        signupLink: 'Har du ikke konto? Registrer deg',
        error: 'Ugyldig e-post eller passord'
      },

      signup: {
        title: 'Opprett Konto',
        nameLabel: 'Fullt navn',
        emailLabel: 'E-post',
        passwordLabel: 'Passord',
        confirmPasswordLabel: 'Bekreft passord',
        submitButton: 'Opprett Konto',
        loginLink: 'Har du allerede konto? Logg inn',
        terms: 'Ved å registrere deg godtar du våre vilkår og betingelser'
      }
    };

    const content = templates[pageType] || templates.landing;

    return {
      success: true,
      aiGenerated: false,
      templateBased: true,
      ...content
    };
  }

  /**
   * Generate semantic element IDs for a page
   * @param {string} pageType - Type of page
   * @param {Object} structure - Page structure
   * @returns {Promise<Object>} Generated IDs
   */
  async generateElementIDs(pageType, structure = {}) {
    // Standard ID patterns
    const idPatterns = {
      landing: {
        hero: 'hero-section',
        heroHeadline: 'hero-headline',
        heroSubheadline: 'hero-subheadline',
        heroCta: 'hero-cta',
        features: 'features-section',
        featureCard: 'feature-card',
        testimonials: 'testimonials-section',
        pricing: 'pricing-section',
        footer: 'footer-section'
      },
      dashboard: {
        container: 'signals-container',
        filters: 'filters-section',
        filterAll: 'filter-all',
        filterBuy: 'filter-buy',
        filterSell: 'filter-sell',
        signalCard: 'signal-card',
        approveBtn: 'btn-approve',
        rejectBtn: 'btn-reject',
        loading: 'loading',
        error: 'error-message'
      },
      login: {
        form: 'login-form',
        emailInput: 'email-input',
        passwordInput: 'password-input',
        submitBtn: 'login-button',
        errorMsg: 'login-error',
        forgotLink: 'forgot-password-link',
        signupLink: 'signup-link'
      },
      signup: {
        form: 'signup-form',
        nameInput: 'name-input',
        emailInput: 'email-input',
        passwordInput: 'password-input',
        confirmInput: 'confirm-password-input',
        submitBtn: 'signup-button',
        errorMsg: 'signup-error',
        loginLink: 'login-link'
      },
      calculator: {
        form: 'calculator-form',
        capitalInput: 'capital-input',
        riskInput: 'risk-percent-input',
        entryInput: 'entry-price-input',
        stopLossInput: 'stop-loss-input',
        calculateBtn: 'calculate-button',
        result: 'calculation-result'
      },
      settings: {
        container: 'settings-container',
        profileSection: 'profile-section',
        securitySection: 'security-section',
        notificationsSection: 'notifications-section',
        saveBtn: 'save-settings-button',
        cancelBtn: 'cancel-button',
        logoutBtn: 'logout-button'
      }
    };

    return {
      success: true,
      pageType,
      ids: idPatterns[pageType] || {},
      conventions: {
        prefix: pageType,
        separator: '-',
        camelCase: false,
        examples: Object.values(idPatterns[pageType] || {}).slice(0, 3)
      }
    };
  }

  /**
   * Optimize content for SEO
   * @param {Object} content - Page content
   * @param {string[]} keywords - Target keywords
   * @returns {Promise<Object>} Optimized content with meta tags
   */
  async optimizeForSEO(content, keywords = []) {
    const { pageType, headline, subheadline, description } = content;

    // Generate meta tags
    const metaTags = {
      title: headline || `Klarpakke - ${pageType}`,
      description: description || subheadline || 'Profesjonelle trading-signaler for kryptovaluta',
      keywords: keywords.join(', '),
      ogTitle: headline,
      ogDescription: subheadline,
      ogType: 'website',
      twitterCard: 'summary_large_image'
    };

    return {
      success: true,
      seoOptimized: true,
      metaTags,
      recommendations: [
        'Add structured data (JSON-LD) for better search visibility',
        'Include alt text for all images',
        'Ensure mobile-friendly design',
        'Optimize page load speed',
        'Use semantic HTML5 tags'
      ]
    };
  }
}

module.exports = AIContentGenerator;
