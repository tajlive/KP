# KLARPAKKE UKE 1 - COMPLETE DEVELOPMENT BRIEF FOR KIMI 2.5

**Last Updated:** 2026-02-03 02:19 CET  
**Developer:** KIMI 2.5 (Moonshot AI)  
**Coordinator:** Perplexity AI  
**Deadline:** 2026-02-04 18:00 CET (40 timer)  

---

## 📋 PROJECT OVERVIEW

### Company Information
**Navn:** Klarpakke AS  
**Org.nr:** 929003292 MVA  
**Registrert:** Brønnøysundregistrene, Norge  
**Kategori:** Opplæringsbedrift (Educational platform)  
**Produkt:** Trading simulering og opplæring (Paper trading education)  

### Design Reference
**Stil:** Coinbase.com (minimalistisk fintech)  
**URL:** https://www.coinbase.com  
**Color Palette:** Clean blue (#0052FF) + white, NOT purple/orange  
**Tone:** Trustworthy, educational, transparent  

### Tech Stack
- **Frontend:** Next.js 15, React 18, TypeScript 5.x
- **Styling:** Tailwind CSS 4.x (utility-first)
- **Components:** shadcn/ui (accessible, customizable)
- **Animations:** Framer Motion (subtle, performant)
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Email:** Resend (transactional + marketing)
- **Deployment:** Cloudflare Pages
- **Analytics:** Google Analytics 4 + PostHog
- **Monitoring:** Sentry (already configured)
- **Rate Limiting:** Upstash Redis

---

## 🎨 DESIGN SYSTEM

### Color Palette

#### Primary Colors
```css
--brand-blue: #0052FF;      /* Coinbase blue - trustworthy */
--brand-dark: #050F2C;      /* Navigation, headings */
--brand-white: #FFFFFF;     /* Clean backgrounds */
```

#### Accent Colors
```css
--success: #05C46B;         /* Positive signals, success states */
--warning: #FF9F43;         /* Educational alerts, disclaimers */
--error: #EE5A6F;          /* Risk warnings, errors */
--info: #0095FF;           /* Information, links */
```

#### Neutral Tones
```css
--gray-50: #F7FAFC;        /* Subtle backgrounds */
--gray-100: #EDF2F7;       /* Card backgrounds */
--gray-200: #E2E8F0;       /* Borders */
--gray-300: #CBD5E0;       /* Disabled states */
--gray-600: #4A5568;       /* Secondary text */
--gray-900: #1A202C;       /* Primary text */
```

### Typography
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

/* Headings */
.text-h1 { font-size: 3.75rem; font-weight: 700; line-height: 1.2; } /* 60px */
.text-h2 { font-size: 3rem; font-weight: 700; line-height: 1.25; }   /* 48px */
.text-h3 { font-size: 2rem; font-weight: 600; line-height: 1.3; }    /* 32px */
.text-h4 { font-size: 1.5rem; font-weight: 600; line-height: 1.4; }  /* 24px */

/* Body */
.text-body-lg { font-size: 1.25rem; line-height: 1.6; }  /* 20px */
.text-body { font-size: 1rem; line-height: 1.5; }        /* 16px */
.text-body-sm { font-size: 0.875rem; line-height: 1.5; } /* 14px */
```

### Spacing Scale (Tailwind)
```css
/* Use Tailwind's default spacing */
py-20  /* Vertical section spacing */
p-8    /* Card padding */
gap-8  /* Grid gaps */
my-6   /* Vertical margins */
```

### Border Radius
```css
rounded-full  /* Buttons, pills */
rounded-2xl   /* Cards, sections (16px) */
rounded-xl    /* Icons, small elements (12px) */
```

---

## 📐 PAGE STRUCTURE

### 1. NAVIGATION (Sticky Top)

**File:** `src/components/layout/Navigation.tsx`

**Features:**
- Sticky on scroll (backdrop blur effect)
- Desktop: Horizontal menu
- Mobile: Hamburger menu (slide-in)
- Language switcher (NO 🇳🇴 / EN 🇬🇧)
- CTA button: "Kom i gang" (primary blue)

**Desktop Layout:**
```
[Logo] Klarpakke    [Funksjoner] [Lær] [Priser]    [NO/EN] [Logg inn] [Kom i gang]
```

**Mobile Layout:**
```
[Logo] Klarpakke                                    [Hamburger ☰]
```

**Code Structure:**
```tsx
import { Menu, X, Globe } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';

export function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [language, setLanguage] = useState<'no' | 'en'>('no');
  
  return (
    <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg" /> {/* Placeholder logo */}
              <span className="text-xl font-bold text-gray-900">Klarpakke</span>
            </Link>
          </div>
          
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Funksjoner</a>
            <a href="#learn" className="text-gray-600 hover:text-gray-900 transition-colors">Lær</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Priser</a>
          </div>
          
          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Language Switcher */}
            <button 
              onClick={() => setLanguage(language === 'no' ? 'en' : 'no')}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
            >
              <Globe className="w-4 h-4" />
              <span className="text-sm font-medium">{language.toUpperCase()}</span>
            </button>
            
            <Link href="/login" className="text-gray-600 hover:text-gray-900">Logg inn</Link>
            <Link 
              href="/signup" 
              className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition-colors font-semibold"
            >
              Kom i gang
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white">
          <div className="px-4 py-6 space-y-4">
            <a href="#features" className="block text-gray-900 font-medium">Funksjoner</a>
            <a href="#learn" className="block text-gray-900 font-medium">Lær</a>
            <a href="#pricing" className="block text-gray-900 font-medium">Priser</a>
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <Link href="/login" className="block text-gray-600">Logg inn</Link>
              <Link 
                href="/signup" 
                className="block w-full bg-blue-600 text-white px-6 py-3 rounded-full text-center font-semibold"
              >
                Kom i gang
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
```

---

### 2. HERO SECTION

**File:** `src/components/landing/Hero.tsx`

**Layout:**
- Full-width gradient background (gray-50 → white)
- Centered content (max-width 4xl)
- Badge → Heading → Subheading → Email CTA → Trust badge
- LandingDisclaimer component below

**Content (Norwegian):**
```typescript
const content = {
  no: {
    badge: "📚 100% Opplæringsfokus - Ingen ekte penger i fare",
    heading: "Fremtiden for trading-opplæring er her.",
    subheading: "Lær å trade med simulert kapital. Ingen risiko, kun kunnskap. AI-drevet veiledning på norsk, 24/7.",
    emailPlaceholder: "Din e-postadresse",
    ctaButton: "Kom på ventelisten",
    trustBadge: "Gratis · Ingen kredittkort · Avmeld når som helst"
  },
  en: {
    badge: "📚 100% Educational Focus - No real money at risk",
    heading: "The future of trading education is here.",
    subheading: "Learn to trade with simulated capital. No risk, only knowledge. AI-powered guidance in Norwegian, 24/7.",
    emailPlaceholder: "Your email address",
    ctaButton: "Join the waitlist",
    trustBadge: "Free · No credit card · Unsubscribe anytime"
  }
};
```

**Code:**
```tsx
import { LandingDisclaimer } from '@/components/disclaimers';
import { WaitlistForm } from '@/components/forms/WaitlistForm';
import { motion } from 'framer-motion';

export function Hero() {
  return (
    <section className="pt-32 pb-16 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto text-center px-4">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6"
        >
          📚 100% Opplæringsfokus - Ingen ekte penger i fare
        </motion.div>
        
        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight"
        >
          Fremtiden for trading-opplæring er her.
        </motion.h1>
        
        {/* Subheading */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
        >
          Lær å trade med simulert kapital. Ingen risiko, kun kunnskap. 
          AI-drevet veiledning på norsk, 24/7.
        </motion.p>
        
        {/* Waitlist Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <WaitlistForm />
        </motion.div>
        
        {/* Trust Badge */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-sm text-gray-500 mt-4"
        >
          Gratis · Ingen kredittkort · Avmeld når som helst
        </motion.p>
      </div>
      
      {/* Disclaimer (already created) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        className="mt-12"
      >
        <LandingDisclaimer />
      </motion.div>
    </section>
  );
}
```

---

### 3. WAITLIST FORM

**File:** `src/components/forms/WaitlistForm.tsx`

**Features:**
- Email validation (Zod schema)
- SignupDisclaimer checkbox (required)
- Loading state (spinner)
- Success state (green checkmark)
- Error state (red alert)
- Double opt-in flow (email verification)
- Rate limiting (max 3 attempts per IP/hour)

**Code:**
```tsx
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { SignupDisclaimer } from '@/components/disclaimers';

const waitlistSchema = z.object({
  email: z.string().email('Ugyldig e-postadresse'),
  acceptDisclaimer: z.boolean().refine(val => val === true, {
    message: 'Du må akseptere disclaimeren for å fortsette'
  })
});

type WaitlistForm = z.infer<typeof waitlistSchema>;

export function WaitlistForm() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm<WaitlistForm>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: {
      acceptDisclaimer: false
    }
  });
  
  const disclaimerAccepted = watch('acceptDisclaimer');
  
  const onSubmit = async (data: WaitlistForm) => {
    setState('loading');
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Noe gikk galt');
      }
      
      setState('success');
      
      // Track with analytics
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'waitlist_signup', {
          event_category: 'engagement',
          event_label: 'landing_page'
        });
      }
      
    } catch (error) {
      setState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Ukjent feil');
    }
  };
  
  // Success State
  if (state === 'success') {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6 max-w-md mx-auto">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-green-900 mb-1">Du er nå på ventelisten!</h3>
            <p className="text-sm text-green-700">
              Sjekk e-posten din for å bekrefte registreringen. (Husk å sjekke spam-mappen)
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error State
  if (state === 'error') {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Noe gikk galt</p>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setState('idle')}
          className="w-full px-6 py-3 bg-gray-100 text-gray-900 rounded-full font-semibold hover:bg-gray-200 transition-colors"
        >
          Prøv igjen
        </button>
      </div>
    );
  }
  
  // Form State
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto space-y-4">
      {/* Email Input + CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            {...register('email')}
            type="email"
            placeholder="Din e-postadresse"
            className="w-full px-6 py-4 border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
            disabled={state === 'loading'}
          />
          {errors.email && (
            <p className="text-red-600 text-sm mt-2 ml-4">{errors.email.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={state === 'loading'}
          className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
        >
          {state === 'loading' ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Sender...</span>
            </>
          ) : (
            'Kom på ventelisten'
          )}
        </button>
      </div>
      
      {/* Disclaimer Checkbox (HIDDEN INITIALLY - Shows in modal on submit) */}
      {/* For now, integrate inline: */}
      <div className="mt-6">
        <SignupDisclaimer
          accepted={disclaimerAccepted}
          onAccept={(accepted) => {
            // This is handled by react-hook-form
          }}
          error={!!errors.acceptDisclaimer}
        />
        <input
          type="checkbox"
          {...register('acceptDisclaimer')}
          className="hidden" // Hidden, controlled by SignupDisclaimer
        />
      </div>
    </form>
  );
}
```

---

### 4. API ROUTE - WAITLIST

**File:** `src/app/api/waitlist/route.ts`

**Features:**
- Rate limiting (Upstash Redis)
- Email validation
- Supabase insert
- Send verification email (Resend)
- Error handling
- Analytics tracking

**Code:**
```typescript
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { Resend } from 'resend';
import { randomBytes } from 'crypto';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 requests per hour
  analytics: true
});

const resend = new Resend(process.env.RESEND_API_KEY!);

const requestSchema = z.object({
  email: z.string().email('Invalid email address')
});

export async function POST(request: Request) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'anonymous';
    
    // Check rate limit
    const { success: rateLimitOk } = await ratelimit.limit(ip);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'For mange forsøk. Prøv igjen om 1 time.' },
        { status: 429 }
      );
    }
    
    // Parse and validate request
    const body = await request.json();
    const { email } = requestSchema.parse(body);
    
    // Generate verification token
    const verificationToken = randomBytes(32).toString('hex');
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('waitlist')
      .insert({
        email,
        verification_token: verificationToken,
        source: 'landing_page'
      })
      .select()
      .single();
    
    if (error) {
      // Check for duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Denne e-postadressen er allerede registrert.' },
          { status: 400 }
        );
      }
      throw error;
    }
    
    // Send verification email
    await resend.emails.send({
      from: 'Klarpakke <no-reply@klarpakke.no>',
      to: email,
      subject: 'Bekreft din e-postadresse - Klarpakke',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
          </head>
          <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: #0052FF; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0;">Velkommen til Klarpakke! 🎉</h1>
            </div>
            <div style="background: #F7FAFC; padding: 30px; border-radius: 0 0 8px 8px;">
              <p style="font-size: 16px; color: #1A202C;">
                Takk for at du meldte deg på ventelisten vår!
              </p>
              <p style="font-size: 16px; color: #4A5568;">
                Klikk på knappen nedenfor for å bekrefte e-postadressen din:
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a 
                  href="${process.env.NEXT_PUBLIC_SITE_URL}/verify?token=${verificationToken}"
                  style="
                    background: #0052FF;
                    color: white;
                    padding: 15px 40px;
                    text-decoration: none;
                    border-radius: 50px;
                    font-weight: 600;
                    display: inline-block;
                  "
                >
                  Bekreft e-postadresse
                </a>
              </div>
              <p style="font-size: 14px; color: #718096; margin-top: 30px;">
                Lenken utløper om 24 timer.
              </p>
              <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 30px 0;">
              <p style="font-size: 12px; color: #A0AEC0;">
                <strong>Viktig:</strong> Klarpakke er en opplæringsbedrift. 
                All trading er simulert. Vi gir ikke finansiell rådgivning.
              </p>
            </div>
          </body>
        </html>
      `
    });
    
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Waitlist API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Ugyldig e-postadresse.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'En feil oppstod. Prøv igjen senere.' },
      { status: 500 }
    );
  }
}
```

---

## 🗄️ SUPABASE SCHEMA

**File:** `supabase/migrations/20260203_waitlist.sql`

```sql
-- Waitlist table for email capture
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  email_verified BOOLEAN DEFAULT FALSE NOT NULL,
  verification_token TEXT UNIQUE,
  token_expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  source TEXT DEFAULT 'landing_page',
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_created ON waitlist(created_at DESC);
CREATE INDEX idx_waitlist_token ON waitlist(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX idx_waitlist_verified ON waitlist(email_verified) WHERE email_verified = TRUE;

-- RLS Policies
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to insert (for signup)
CREATE POLICY "Allow anonymous insert to waitlist"
  ON waitlist
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow users to view only their own entry
CREATE POLICY "Users can view own waitlist entry"
  ON waitlist
  FOR SELECT
  TO anon
  USING (
    email = current_setting('request.jwt.claims', true)::json->>'email'
  );

-- Allow service role full access (for backend operations)
CREATE POLICY "Service role has full access"
  ON waitlist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_waitlist_updated_at
  BEFORE UPDATE ON waitlist
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to verify email
CREATE OR REPLACE FUNCTION verify_waitlist_email(token_param TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  valid_token BOOLEAN;
BEGIN
  UPDATE waitlist
  SET 
    email_verified = TRUE,
    verification_token = NULL,
    token_expires_at = NULL
  WHERE 
    verification_token = token_param
    AND token_expires_at > NOW()
    AND email_verified = FALSE
  RETURNING TRUE INTO valid_token;
  
  RETURN COALESCE(valid_token, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 📧 EMAIL VERIFICATION PAGE

**File:** `src/app/verify/page.tsx`

```tsx
import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import { CheckCircle2, XCircle } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface VerifyPageProps {
  searchParams: { token?: string };
}

export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const { token } = searchParams;
  
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ugyldig lenke</h1>
          <p className="text-gray-600">
            Verifiseringslenken er ugyldig eller har utløpt.
          </p>
        </div>
      </div>
    );
  }
  
  // Verify token
  const { data, error } = await supabase.rpc('verify_waitlist_email', {
    token_param: token
  });
  
  const verified = data === true;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {verified ? (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">E-post bekreftet! ✅</h1>
            <p className="text-gray-600 mb-6">
              Du er nå på ventelisten. Vi sender deg en e-post når vi lanserer!
            </p>
            <a 
              href="/"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              Tilbake til forsiden
            </a>
          </>
        ) : (
          <>
            <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifisering feilet</h1>
            <p className="text-gray-600 mb-6">
              Lenken kan ha utløpt eller allerede blitt brukt.
            </p>
            <a 
              href="/"
              className="inline-block bg-gray-200 text-gray-900 px-8 py-3 rounded-full font-semibold hover:bg-gray-300 transition-colors"
            >
              Tilbake til forsiden
            </a>
          </>
        )}
      </div>
    </div>
  );
}
```

---

## 🌍 MULTILINGUAL SUPPORT

**File:** `src/lib/i18n/translations.ts`

```typescript
export const translations = {
  no: {
    nav: {
      features: 'Funksjoner',
      learn: 'Lær',
      pricing: 'Priser',
      login: 'Logg inn',
      getStarted: 'Kom i gang'
    },
    hero: {
      badge: '📚 100% Opplæringsfokus - Ingen ekte penger i fare',
      heading: 'Fremtiden for trading-opplæring er her.',
      subheading: 'Lær å trade med simulert kapital. Ingen risiko, kun kunnskap. AI-drevet veiledning på norsk, 24/7.',
      emailPlaceholder: 'Din e-postadresse',
      ctaButton: 'Kom på ventelisten',
      trustBadge: 'Gratis · Ingen kredittkort · Avmeld når som helst'
    },
    footer: {
      companyInfo: 'Klarpakke AS - Org.nr: 929003292 MVA',
      registeredWith: 'Registrert hos Brønnøysundregistrene',
      disclaimer: '⚠️ Kun opplæring - ingen finansiell rådgivning',
      copyright: '© 2026 Klarpakke AS. Alle rettigheter reservert.'
    }
  },
  en: {
    nav: {
      features: 'Features',
      learn: 'Learn',
      pricing: 'Pricing',
      login: 'Log in',
      getStarted: 'Get started'
    },
    hero: {
      badge: '📚 100% Educational Focus - No real money at risk',
      heading: 'The future of trading education is here.',
      subheading: 'Learn to trade with simulated capital. No risk, only knowledge. AI-powered guidance in Norwegian, 24/7.',
      emailPlaceholder: 'Your email address',
      ctaButton: 'Join the waitlist',
      trustBadge: 'Free · No credit card · Unsubscribe anytime'
    },
    footer: {
      companyInfo: 'Klarpakke AS - Org.nr: 929003292 VAT',
      registeredWith: 'Registered with Brønnøysundregistrene',
      disclaimer: '⚠️ Educational only - no financial advice',
      copyright: '© 2026 Klarpakke AS. All rights reserved.'
    }
  }
};

export type Language = keyof typeof translations;
```

---

## 📊 ANALYTICS SETUP

### Google Analytics 4

**File:** `src/app/layout.tsx` (add to <head>)

```tsx
import Script from 'next/script';

export default function RootLayout({ children }) {
  return (
    <html lang="no">
      <head>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

### PostHog

**File:** `src/lib/analytics/posthog.ts`

```typescript
import posthog from 'posthog-js';

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: 'https://eu.posthog.com', // EU region for GDPR compliance
    autocapture: true,
    capture_pageview: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true, // Privacy: mask all form inputs
      maskTextSelector: '*' // Privacy: mask all text
    }
  });
}

export { posthog };

// Track custom events
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined') {
    posthog.capture(eventName, properties);
  }
}
```

---

## 🔒 ENVIRONMENT VARIABLES

**File:** `.env.example`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://swfyuwkptusceiouqlks.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Resend
RESEND_API_KEY=re_your_api_key_here

# Upstash Redis (for rate limiting)
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here

# Site URL
NEXT_PUBLIC_SITE_URL=https://klarpakke.no

# Analytics
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxx

# Sentry (already configured)
NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn_here
```

---

## 📦 DEPENDENCIES TO INSTALL

**File:** `package.json` (add these)

```json
{
  "dependencies": {
    "@hookform/resolvers": "^3.3.4",
    "@supabase/supabase-js": "^2.39.3",
    "@upstash/ratelimit": "^1.0.1",
    "@upstash/redis": "^1.28.2",
    "framer-motion": "^11.0.3",
    "lucide-react": "^0.323.0",
    "posthog-js": "^1.100.0",
    "react-hook-form": "^7.49.3",
    "resend": "^3.2.0",
    "zod": "^3.22.4"
  }
}
```

**Install command:**
```bash
npm install @hookform/resolvers @supabase/supabase-js @upstash/ratelimit @upstash/redis framer-motion lucide-react posthog-js react-hook-form resend zod
```

---

## ✅ DELIVERABLES CHECKLIST

### Code
- [ ] Navigation component (desktop + mobile)
- [ ] Hero section (with animations)
- [ ] Waitlist form (validation + states)
- [ ] API route (rate limiting + email)
- [ ] Email verification page
- [ ] Supabase migration script
- [ ] i18n translations (NO + EN)
- [ ] Analytics setup (GA4 + PostHog)

### Documentation
- [ ] README with setup instructions
- [ ] Environment variables guide
- [ ] Deployment guide (Cloudflare Pages)
- [ ] Testing checklist

### Testing
- [ ] Email signup flow (end-to-end)
- [ ] Rate limiting (test 4th request blocked)
- [ ] Email verification (valid + expired tokens)
- [ ] Mobile responsiveness (Chrome DevTools)
- [ ] Lighthouse score >90
- [ ] RLS policies tested

### Deployment
- [ ] All TypeScript errors fixed
- [ ] No console errors/warnings
- [ ] Build succeeds locally
- [ ] Pull request ready for review

---

## 🚀 SUCCESS CRITERIA

1. **Visual:** Pixel-perfect Coinbase aesthetic (clean blue + white)
2. **Functional:** Waitlist signup works (email sent + verified)
3. **Secure:** RLS policies prevent data leaks
4. **Fast:** Lighthouse >90, LCP <2.5s
5. **Accessible:** WCAG 2.1 AA compliant
6. **Compliant:** GDPR double opt-in flow
7. **Tracked:** Analytics events fire correctly
8. **Bilingual:** NO/EN language switcher works

---

## ⏱️ TIMELINE

**Start:** 2026-02-03 02:20 CET  
**Deadline:** 2026-02-04 18:00 CET  
**Total Time:** 40 hours  

**Estimated effort:**
- Components: 12h
- API + Database: 8h
- Email templates: 4h
- Analytics setup: 2h
- Testing: 6h
- Documentation: 4h
- Buffer: 4h

---

## 📞 CONTACT

If you have questions:
- **GitHub Issue:** Open issue in klarpakke/klarpakke
- **Pull Request:** Create PR to `feature/uke1-disclaimers` branch

---

**LET'S BUILD! 🚀**