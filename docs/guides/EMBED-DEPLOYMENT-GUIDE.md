# 📋 HTML Embed Deployment Guide
## Klarpakke - 11 Sider som trenger HTML Embeds

**Dato:** 31. Januar 2026  
**Status:** 6 sider OK, 11 sider trenger HTML embeds  
**Metode:** Kopier HTML fra denne guiden → Lim inn i Webflow HTML Embed

---

## 🚀 Rask Start (5 minutter per side)

### Steg 1: Opprett side i Webflow Designer
1. Gå til **Pages** panel (venstre side)
2. Klikk **+** (Create new page)
3. Velg **Standard page**
4. Fyll inn:
   - **Page name:** [Se tabell under]
   - **Slug:** [Se tabell under]
5. Klikk **Create page**

### Steg 2: Legg til HTML Embed
1. I Designer, dra inn en **"Embed"** komponent fra Add panel
2. Plasser den i main-content området
3. Klikk **"Edit code"**
4. Kopier HTML fra denne guiden (seksjon under)
5. Lim inn i code editor
6. Klikk **Save & Close**

### Steg 3: Publiser
1. Klikk **Publish** (øverst til høyre)
2. Velg **Publish to selected domains**
3. Test siden i nettleser

---

## 📄 Side 1: Signup (/signup)

### Metadata
- **Page Name:** Signup
- **Slug:** signup
- **SEO Title:** Opprett konto - Klarpakke
- **SEO Description:** Registrer deg for Klarpakke og få tilgang til moderne regnskapstjenester

### HTML Embed Code
```html
<!-- KLARPAKKE SIGNUP PAGE - Complete HTML Embed -->
<div data-klarpakke-page="/signup" data-kp-root="signup" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1E3A5F 0%, #0F2942 100%); padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="width: 100%; max-width: 480px; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
    
    <!-- Logo -->
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #1E3A5F, #10B981); border-radius: 12px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 28px; font-weight: bold;">K</div>
      <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Opprett konto</h1>
      <p style="color: #6b7280; margin: 8px 0 0;">Kom i gang med Klarpakke</p>
    </div>

    <!-- Signup Form -->
    <form id="kp-signup-form" style="display: flex; flex-direction: column; gap: 20px;">
      
      <!-- Company Name -->
      <div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">Bedriftsnavn *</label>
        <input type="text" id="kp-company" required placeholder="Ditt firma AS" style="width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; transition: border-color 0.2s; box-sizing: border-box;">
      </div>

      <!-- Email -->
      <div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">E-post *</label>
        <input type="email" id="kp-email" required placeholder="deg@bedrift.no" style="width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; transition: border-color 0.2s; box-sizing: border-box;">
      </div>

      <!-- Phone -->
      <div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">Telefon</label>
        <input type="tel" id="kp-phone" placeholder="+47 000 00 000" style="width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; transition: border-color 0.2s; box-sizing: border-box;">
      </div>

      <!-- Password -->
      <div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">Passord *</label>
        <input type="password" id="kp-password" required placeholder="Minst 8 tegn" minlength="8" style="width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; transition: border-color 0.2s; box-sizing: border-box;">
      </div>

      <!-- Terms Checkbox -->
      <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer;">
        <input type="checkbox" id="kp-terms" required style="margin-top: 2px; width: 18px; height: 18px; accent-color: #1E3A5F;">
        <span style="font-size: 14px; color: #4b5563; line-height: 1.5;">Jeg godtar <a href="/terms" style="color: #1E3A5F; text-decoration: none; font-weight: 500;">vilkårene</a> og <a href="/privacy" style="color: #1E3A5F; text-decoration: none; font-weight: 500;">personvernreglene</a></span>
      </label>

      <!-- Submit Button -->
      <button type="submit" id="kp-signup-btn" style="width: 100%; padding: 14px 24px; background: linear-gradient(135deg, #1E3A5F, #10B981); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">
        Opprett konto
      </button>

      <!-- Error Message -->
      <div id="kp-error" style="display: none; padding: 12px; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 14px;"></div>

      <!-- Login Link -->
      <p style="text-align: center; color: #6b7280; font-size: 14px; margin: 8px 0 0;">
        Har du allerede konto? <a href="/login" style="color: #1E3A5F; text-decoration: none; font-weight: 600;">Logg inn</a>
      </p>
    </form>
  </div>
</div>

<!-- Supabase Auth Script -->
<script>
(function() {
  const form = document.getElementById('kp-signup-form');
  const errorDiv = document.getElementById('kp-error');
  const btn = document.getElementById('kp-signup-btn');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Oppretter konto...';

    try {
      // Get form data
      const email = document.getElementById('kp-email').value;
      const password = document.getElementById('kp-password').value;
      const company = document.getElementById('kp-company').value;
      const phone = document.getElementById('kp-phone').value;

      // Sign up with Supabase (configured in site settings)
      if (window.supabase) {
        const { data, error } = await window.supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              company_name: company,
              phone: phone
            }
          }
        });

        if (error) throw error;

        // Success - redirect to dashboard
        window.location.href = '/dashboard';
      } else {
        throw new Error('Auth system not loaded');
      }
    } catch (err) {
      errorDiv.textContent = err.message || 'Kunne ikke opprette konto. Prøv igjen.';
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.textContent = 'Opprett konto';
    }
  });
})();
</script>
```

---

## 📄 Side 2: Reset Password (/reset-password)

### Metadata
- **Page Name:** Reset Password
- **Slug:** reset-password
- **SEO Title:** Tilbakestill passord - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE RESET PASSWORD PAGE -->
<div data-klarpakke-page="/reset-password" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1E3A5F 0%, #0F2942 100%); padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="width: 100%; max-width: 440px; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
    
    <div style="text-align: center; margin-bottom: 32px;">
      <div style="width: 64px; height: 64px; background: #f3f4f6; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E3A5F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      </div>
      <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">Tilbakestill passord</h1>
      <p style="color: #6b7280; margin: 8px 0 0;">Vi sender deg en lenke for å tilbakestille passordet</p>
    </div>

    <form id="kp-reset-form" style="display: flex; flex-direction: column; gap: 20px;">
      <div>
        <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">E-post *</label>
        <input type="email" id="kp-reset-email" required placeholder="deg@bedrift.no" style="width: 100%; padding: 12px 16px; border: 2px solid #e5e7eb; border-radius: 8px; font-size: 16px; box-sizing: border-box;">
      </div>

      <button type="submit" id="kp-reset-btn" style="width: 100%; padding: 14px 24px; background: #1E3A5F; color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer;">
        Send tilbakestillingslenke
      </button>

      <div id="kp-reset-success" style="display: none; padding: 12px; background: #d1fae5; border: 1px solid #a7f3d0; border-radius: 8px; color: #065f46; font-size: 14px;">
        ✓ Sjekk e-posten din for videre instruksjoner.
      </div>

      <div id="kp-reset-error" style="display: none; padding: 12px; background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; color: #dc2626; font-size: 14px;"></div>

      <p style="text-align: center; color: #6b7280; font-size: 14px; margin: 8px 0 0;">
        <a href="/login" style="color: #1E3A5F; text-decoration: none; font-weight: 600;">← Tilbake til innlogging</a>
      </p>
    </form>
  </div>
</div>

<script>
(function() {
  const form = document.getElementById('kp-reset-form');
  const successDiv = document.getElementById('kp-reset-success');
  const errorDiv = document.getElementById('kp-reset-error');
  const btn = document.getElementById('kp-reset-btn');

  form.addEventListener('submit', async function(e) {
    e.preventDefault();
    successDiv.style.display = 'none';
    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.textContent = 'Sender...';

    try {
      const email = document.getElementById('kp-reset-email').value;
      
      if (window.supabase) {
        const { error } = await window.supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/update-password'
        });
        
        if (error) throw error;
        
        successDiv.style.display = 'block';
        form.reset();
      }
    } catch (err) {
      errorDiv.textContent = err.message || 'Kunne ikke sende e-post. Prøv igjen.';
      errorDiv.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Send tilbakestillingslenke';
    }
  });
})();
</script>
```

---

## 📄 Side 3: Verify Email (/verify-email)

### Metadata
- **Page Name:** Verify Email
- **Slug:** verify-email
- **SEO Title:** Bekreft e-post - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE VERIFY EMAIL PAGE -->
<div data-klarpakke-page="/verify-email" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #1E3A5F 0%, #0F2942 100%); padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="width: 100%; max-width: 480px; background: white; border-radius: 16px; padding: 48px 40px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center;">
    
    <div style="width: 80px; height: 80px; background: #d1fae5; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
    </div>

    <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px;">E-post bekreftet!</h1>
    <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
      Takk for at du bekreftet e-postadressen din. Kontoen din er nå aktiv og klar til bruk.
    </p>

    <div style="display: flex; flex-direction: column; gap: 12px;">
      <a href="/dashboard" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #1E3A5F, #10B981); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: transform 0.2s;">
        Gå til dashboard
      </a>
      <a href="/" style="display: inline-block; padding: 12px 32px; color: #6b7280; text-decoration: none; font-size: 14px;">
        ← Tilbake til forsiden
      </a>
    </div>

    <p style="color: #9ca3af; font-size: 13px; margin-top: 32px;">
      Trenger du hjelp? <a href="/help" style="color: #1E3A5F; text-decoration: none;">Kontakt support</a>
    </p>
  </div>
</div>

<script>
// Auto-verify if token present in URL
(function() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const type = params.get('type');
  
  if (token && type === 'signup' && window.supabase) {
    window.supabase.auth.verifyOtp({ token_hash: token, type: 'signup' })
      .then(({ error }) => {
        if (error) console.error('Verification error:', error);
      });
  }
})();
</script>
```

---

## 📄 Side 4: 404 Not Found

### Metadata
- **Page Name:** 404
- **Slug:** 404
- **SEO Title:** Side ikke funnet - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE 404 PAGE -->
<div data-klarpakke-page="/404" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0F2942; padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="text-align: center; max-width: 600px;">
    
    <!-- Large 404 -->
    <div style="font-size: 120px; font-weight: 900; color: transparent; -webkit-text-stroke: 2px #10B981; line-height: 1; margin-bottom: 24px;">
      404
    </div>

    <h1 style="font-size: 32px; font-weight: 700; color: white; margin: 0 0 16px;">Oops! Siden finnes ikke</h1>
    <p style="color: #94a3b8; font-size: 18px; line-height: 1.6; margin: 0 0 40px;">
      Beklager, men siden du leter etter finnes ikke eller har blitt flyttet.
    </p>

    <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
      <a href="/" style="padding: 14px 28px; background: linear-gradient(135deg, #1E3A5F, #10B981); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        ← Til forsiden
      </a>
      <a href="/help" style="padding: 14px 28px; background: transparent; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid #374151;">
        Få hjelp
      </a>
    </div>

    <!-- Search suggestion -->
    <div style="margin-top: 48px; padding: 24px; background: rgba(255,255,255,0.05); border-radius: 12px;">
      <p style="color: #94a3b8; font-size: 14px; margin: 0 0 12px;">Populære sider:</p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <a href="/pricing" style="color: #10B981; text-decoration: none; font-size: 14px;">Priser</a>
        <span style="color: #475569;">•</span>
        <a href="/login" style="color: #10B981; text-decoration: none; font-size: 14px;">Logg inn</a>
        <span style="color: #475569;">•</span>
        <a href="/signup" style="color: #10B981; text-decoration: none; font-size: 14px;">Opprett konto</a>
      </div>
    </div>
  </div>
</div>
```

---

## 📄 Side 5: 403 Forbidden

### Metadata
- **Page Name:** 403
- **Slug:** 403
- **SEO Title:** Ingen tilgang - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE 403 PAGE -->
<div data-klarpakke-page="/403" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #7c2d12 0%, #9a3412 50%, #0F2942 100%); padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="text-align: center; max-width: 560px; background: rgba(255,255,255,0.95); border-radius: 20px; padding: 48px;">
    
    <div style="width: 80px; height: 80px; background: #fee2e2; border-radius: 50%; margin: 0 auto 24px; display: flex; align-items: center; justify-content: center;">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
    </div>

    <div style="font-size: 72px; font-weight: 900; color: #dc2626; line-height: 1; margin-bottom: 16px;">403</div>
    
    <h1 style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px;">Ingen tilgang</h1>
    <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
      Beklager, men du har ikke tillatelse til å se denne siden. 
      Logg inn eller kontakt administrator hvis du mener dette er en feil.
    </p>

    <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
      <a href="/login" style="padding: 12px 24px; background: #1E3A5F; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Logg inn
      </a>
      <a href="/" style="padding: 12px 24px; background: #f3f4f6; color: #374151; text-decoration: none; border-radius: 8px; font-weight: 600;">
        Til forsiden
      </a>
    </div>
  </div>
</div>
```

---

## 📄 Side 6: 500 Server Error

### Metadata
- **Page Name:** 500
- **Slug:** 500
- **SEO Title:** Serverfeil - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE 500 PAGE -->
<div data-klarpakke-page="/500" style="min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #0F2942; padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="text-align: center; max-width: 560px;">
    
    <!-- Warning Icon -->
    <div style="width: 100px; height: 100px; background: rgba(245, 158, 11, 0.2); border-radius: 50%; margin: 0 auto 32px; display: flex; align-items: center; justify-content: center; border: 3px solid #f59e0b;">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    </div>

    <div style="font-size: 64px; font-weight: 900; color: #f59e0b; line-height: 1; margin-bottom: 16px;">500</div>
    
    <h1 style="font-size: 28px; font-weight: 700; color: white; margin: 0 0 16px;">Noe gikk galt</h1>
    <p style="color: #94a3b8; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
      Beklager, men vi opplever en teknisk feil. 
      Vårt team har blitt varslet og jobber med å fikse problemet.
    </p>

    <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
      <button onclick="window.location.reload()" style="padding: 14px 28px; background: linear-gradient(135deg, #1E3A5F, #10B981); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
        Prøv igjen
      </button>
      <a href="/" style="padding: 14px 28px; background: transparent; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; border: 2px solid #374151;">
        Til forsiden
      </a>
    </div>

    <div style="margin-top: 40px; padding: 20px; background: rgba(255,255,255,0.05); border-radius: 12px;">
      <p style="color: #94a3b8; font-size: 14px; margin: 0;">
        Fortsatt problemer? <a href="mailto:kontakt@klarpakke.no" style="color: #10B981; text-decoration: none;">kontakt@klarpakke.no</a>
      </p>
    </div>
  </div>
</div>
```

---

## 📄 Side 7: Terms of Service (/terms)

### Metadata
- **Page Name:** Terms
- **Slug:** terms
- **SEO Title:** Vilkår for bruk - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE TERMS PAGE -->
<div data-klarpakke-page="/terms" style="min-height: 100vh; background: #f8fafc; padding: 60px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; padding: 48px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    
    <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 32px;">
      <h1 style="font-size: 32px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px;">Vilkår for bruk</h1>
      <p style="color: #6b7280; margin: 0;">Sist oppdatert: 31. januar 2026</p>
    </div>

    <div style="color: #374151; line-height: 1.7; font-size: 16px;">
      
      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">1. Innledning</h2>
      <p style="margin: 0 0 16px;">Velkommen til Klarpakke. Ved å bruke våre tjenester godtar du disse vilkårene. Les dem nøye før du begynner å bruke plattformen.</p>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">2. Definisjoner</h2>
      <ul style="margin: 0 0 16px; padding-left: 24px;">
        <li style="margin-bottom: 8px;"><strong>"Tjenesten"</strong> - Klarpakke sin nettbaserte regnskapsplattform</li>
        <li style="margin-bottom: 8px;"><strong>"Bruker"</strong> - Enhver person eller bedrift som bruker tjenesten</li>
        <li style="margin-bottom: 8px;"><strong>"Innhold"</strong> - All data som lastes opp eller genereres i tjenesten</li>
      </ul>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">3. Bruksvilkår</h2>
      <p style="margin: 0 0 16px;">Som bruker av Klarpakke forplikter du deg til å:</p>
      <ul style="margin: 0 0 16px; padding-left: 24px;">
        <li style="margin-bottom: 8px;">Oppgi korrekte og fullstendige opplysninger</li>
        <li style="margin-bottom: 8px;">Holde påloggingsinformasjonen din konfidensiell</li>
        <li style="margin-bottom: 8px;">Bruke tjenesten i samsvar med gjeldende lover</li>
        <li style="margin-bottom: 8px;">Ikke forsøke å få uautorisert tilgang til systemet</li>
      </ul>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">4. Abonnement og betaling</h2>
      <p style="margin: 0 0 16px;">Klarpakke tilbys som et abonnement. Priser og betingelser er spesifisert på vår prisingsside. Abonnementet fornyes automatisk med mindre det sies opp.</p>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">5. Databehandling</h2>
      <p style="margin: 0 0 16px;">Vi behandler dine data i henhold til vår personvernerklæring. Alle sensitive data krypteres og lagres sikkert.</p>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">6. Opphør</h2>
      <p style="margin: 0 0 16px;">Du kan når som helst si opp abonnementet ditt. Ved opphør slettes dine data etter 30 dager, med mindre annet er avtalt.</p>

      <div style="background: #f3f4f6; border-radius: 8px; padding: 20px; margin-top: 40px;">
        <p style="margin: 0; color: #4b5563; font-size: 14px;">
          <strong>Har du spørsmål?</strong> Kontakt oss på <a href="mailto:kontakt@klarpakke.no" style="color: #1E3A5F;">kontakt@klarpakke.no</a>
        </p>
      </div>
    </div>
  </div>
</div>
```

---

## 📄 Side 8: Privacy Policy (/privacy)

### Metadata
- **Page Name:** Privacy
- **Slug:** privacy
- **SEO Title:** Personvern - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE PRIVACY PAGE -->
<div data-klarpakke-page="/privacy" style="min-height: 100vh; background: #f8fafc; padding: 60px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; padding: 48px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    
    <div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 24px; margin-bottom: 32px;">
      <h1 style="font-size: 32px; font-weight: 700; color: #1a1a1a; margin: 0 0 8px;">Personvernerklæring</h1>
      <p style="color: #6b7280; margin: 0;">Sist oppdatert: 31. januar 2026</p>
    </div>

    <div style="color: #374151; line-height: 1.7; font-size: 16px;">
      
      <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px 20px; margin-bottom: 32px; border-radius: 0 8px 8px 0;">
        <p style="margin: 0; color: #1e40af;"><strong>Ditt personvern er viktig for oss.</strong> Denne erklæringen forklarer hvordan vi samler inn, bruker og beskytter dine personopplysninger.</p>
      </div>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">1. Behandlingsansvarlig</h2>
      <p style="margin: 0 0 16px;">Klarpakke AS er behandlingsansvarlig for dine personopplysninger. Kontaktinformasjon:<br>
      E-post: kontakt@klarpakke.no<br>
      Adresse: [Bedriftsadresse]</p>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">2. Hvilke data samler vi inn?</h2>
      <p style="margin: 0 0 12px;">Vi samler inn følgende typer informasjon:</p>
      <ul style="margin: 0 0 16px; padding-left: 24px;">
        <li style="margin-bottom: 8px;"><strong>Kontaktinformasjon:</strong> Navn, e-post, telefonnummer</li>
        <li style="margin-bottom: 8px;"><strong>Bedriftsinformasjon:</strong> Firmanavn, org.nr, adresse</li>
        <li style="margin-bottom: 8px;"><strong>Bruksdata:</strong> IP-adresse, nettlesertype, aktivitetslogger</li>
        <li style="margin-bottom: 8px;"><strong>Regnskapsdata:</strong> Data du velger å lagre i tjenesten</li>
      </ul>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">3. Formål med behandling</h2>
      <p style="margin: 0 0 16px;">Vi bruker dine data til:</p>
      <ul style="margin: 0 0 16px; padding-left: 24px;">
        <li style="margin-bottom: 8px;">Å levere og forbedre våre tjenester</li>
        <li style="margin-bottom: 8px;">Kommunikasjon om kundeforholdet</li>
        <li style="margin-bottom: 8px;">Fakturering og betaling</li>
        <li style="margin-bottom: 8px;">Sikkerhet og forebygging av misbruk</li>
      </ul>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">4. Dine rettigheter</h2>
      <p style="margin: 0 0 16px;">I henhold til GDPR har du følgende rettigheter:</p>
      <ul style="margin: 0 0 16px; padding-left: 24px;">
        <li style="margin-bottom: 8px;">Rett til innsyn i dine data</li>
        <li style="margin-bottom: 8px;">Rett til retting av feilaktige data</li>
        <li style="margin-bottom: 8px;">Rett til sletting</li>
        <li style="margin-bottom: 8px;">Rett til dataportabilitet</li>
        <li style="margin-bottom: 8px;">Rett til å protestere mot behandling</li>
      </ul>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">5. Datasikkerhet</h2>
      <p style="margin: 0 0 16px;">Vi bruker industristandard sikkerhetstiltak inkludert:</p>
      <ul style="margin: 0 0 16px; padding-left: 24px;">
        <li style="margin-bottom: 8px;">SSL/TLS-kryptering for all datatrafikk</li>
        <li style="margin-bottom: 8px;">Kryptering av sensitive data i databasen</li>
        <li style="margin-bottom: 8px;">Regelmessige sikkerhetskopier</li>
        <li style="margin-bottom: 8px;">Tofaktorautentisering</li>
      </ul>

      <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; margin: 32px 0 16px;">6. Kontakt oss</h2>
      <p style="margin: 0;">Har du spørsmål om personvern? Kontakt vår personvernansvarlig:<br>
      <a href="mailto:kontakt@klarpakke.no" style="color: #1E3A5F; font-weight: 500;">kontakt@klarpakke.no</a></p>

    </div>
  </div>
</div>
```

---

## 📄 Side 9: Help Center (/help)

### Metadata
- **Page Name:** Help
- **Slug:** help
- **SEO Title:** Hjelpesenter - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE HELP PAGE -->
<div data-klarpakke-page="/help" style="min-height: 100vh; background: #f8fafc; padding: 60px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="max-width: 900px; margin: 0 auto;">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 48px;">
      <h1 style="font-size: 36px; font-weight: 700; color: #1a1a1a; margin: 0 0 12px;">Hvordan kan vi hjelpe?</h1>
      <p style="color: #6b7280; font-size: 18px; margin: 0;">Finn svar på dine spørsmål eller kontakt support</p>
    </div>

    <!-- Search Box -->
    <div style="max-width: 600px; margin: 0 auto 48px;">
      <div style="position: relative;">
        <input type="text" placeholder="Søk etter hjelp..." style="width: 100%; padding: 16px 20px 16px 52px; border: 2px solid #e5e7eb; border-radius: 12px; font-size: 16px; box-sizing: border-box;">
        <svg style="position: absolute; left: 18px; top: 50%; transform: translateY(-50%);" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <path d="m21 21-4.35-4.35"></path>
        </svg>
      </div>
    </div>

    <!-- FAQ Categories -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-bottom: 48px;">
      
      <!-- Getting Started -->
      <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="width: 48px; height: 48px; background: #dbeafe; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
          </svg>
        </div>
        <h3 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px;">Komme i gang</h3>
        <ul style="margin: 0; padding: 0; list-style: none;">
          <li style="margin-bottom: 8px;"><a href="#" style="color: #4b5563; text-decoration: none; font-size: 14px;">Opprette konto</a></li>
          <li style="margin-bottom: 8px;"><a href="#" style="color: #4b5563; text-decoration: none; font-size: 14px;">Første innlogging</a></li>
          <li style="margin-bottom: 8px;"><a href="#" style="color: #4b5563; text-decoration: none; font-size: 14px;">Sette opp bedrift</a></li>
          <li><a href="#" style="color: #1E3A5F; text-decoration: none; font-size: 14px; font-weight: 500;">Se alle →</a></li>
        </ul>
      </div>

      <!-- Billing -->
      <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="width: 48px; height: 48px; background: #d1fae5; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </div>
        <h3 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px;">Fakturering</h3>
        <ul style="margin: 0; padding: 0; list-style: none;">
          <li style="margin-bottom: 8px;"><a href="#" style="color: #4b5563; text-decoration: none; font-size: 14px;">Endre abonnement</a></li>
          <li style="margin-bottom: 8px;"><a href="#" style="color: #4b5563; text-decoration: none; font-size: 14px;">Oppdatere betalingskort</a></li>
          <li style="margin-bottom: 8px;"><a href="#" style="color: #4b5563; text-decoration: none; font-size: 14px;">Se fakturaer</a></li>
          <li><a href="#" style="color: #1E3A5F; text-decoration: none; font-size: 14px; font-weight: 500;">Se alle →</a></li>
        </ul>
      </div>

      <!-- Technical -->
      <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <div style="width: 48px; height: 48px; background: #fef3c7; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
            <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path>
          </svg>
        </div>
        <h3 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 8px;">Teknisk support</h3>
        <ul style="margin: 0; padding: 0; list-style: none;">
          <li style="margin-bottom: 8px;"><a href="#" style="color: #4b5563; text-decoration: none; font-size: 14px;">Tilbakestille passord</a></li>
          <li style="margin-bottom: 8px;"><a href="#" style="color: #4b5563; text-decoration: none; font-size: 14px;">To-faktor autentisering</a></li>
          <li style="margin-bottom: 8px;"><a href="#" style="color: #4b5563; text-decoration: none; font-size: 14px;">API-tilkobling</a></li>
          <li><a href="#" style="color: #1E3A5F; text-decoration: none; font-size: 14px; font-weight: 500;">Se alle →</a></li>
        </ul>
      </div>
    </div>

    <!-- Contact Section -->
    <div style="background: linear-gradient(135deg, #1E3A5F 0%, #0F2942 100%); border-radius: 16px; padding: 40px; text-align: center; color: white;">
      <h2 style="font-size: 24px; font-weight: 600; margin: 0 0 12px;">Fant du ikke det du lette etter?</h2>
      <p style="margin: 0 0 24px; opacity: 0.9;">Vårt supportteam er tilgjengelig mandag-fredag, 08:00-16:00</p>
      <div style="display: flex; gap: 16px; justify-content: center; flex-wrap: wrap;">
        <a href="mailto:kontakt@klarpakke.no" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 24px; background: white; color: #1E3A5F; text-decoration: none; border-radius: 8px; font-weight: 600;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          Send e-post
        </a>
        <span style="padding: 12px 24px; border: 2px solid rgba(255,255,255,0.3); border-radius: 8px;">
          kontakt@klarpakke.no
        </span>
      </div>
    </div>

  </div>
</div>
```

---

## 📄 Side 10: Trading History (/trading-history)

### Metadata
- **Page Name:** Trading History
- **Slug:** trading-history
- **SEO Title:** Transaksjonshistorikk - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE TRADING HISTORY PAGE -->
<div data-klarpakke-page="/trading-history" style="min-height: 100vh; background: #f8fafc; padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="max-width: 1200px; margin: 0 auto;">
    
    <!-- Header -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 32px; flex-wrap: wrap; gap: 16px;">
      <div>
        <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 4px;">Transaksjonshistorikk</h1>
        <p style="color: #6b7280; margin: 0;">Oversikt over alle dine økonomiske transaksjoner</p>
      </div>
      <div style="display: flex; gap: 12px;">
        <button style="padding: 10px 20px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; color: #374151; font-weight: 500; cursor: pointer;">
          Eksportér CSV
        </button>
        <button style="padding: 10px 20px; background: #1E3A5F; border: none; border-radius: 8px; color: white; font-weight: 500; cursor: pointer;">
          + Ny transaksjon
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;">
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px;">Totalt inntekter</p>
        <p style="font-size: 24px; font-weight: 700; color: #10b981; margin: 0;">Kr 145,230</p>
      </div>
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px;">Totalt utgifter</p>
        <p style="font-size: 24px; font-weight: 700; color: #ef4444; margin: 0;">Kr 89,450</p>
      </div>
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px;">Netto resultat</p>
        <p style="font-size: 24px; font-weight: 700; color: #1E3A5F; margin: 0;">Kr 55,780</p>
      </div>
      <div style="background: white; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <p style="color: #6b7280; font-size: 14px; margin: 0 0 4px;">Antall transaksjoner</p>
        <p style="font-size: 24px; font-weight: 700; color: #1a1a1a; margin: 0;">47</p>
      </div>
    </div>

    <!-- Filters -->
    <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <input type="text" placeholder="Søk transaksjoner..." style="flex: 1; min-width: 200px; padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px;">
        <select style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: white;">
          <option>Alle typer</option>
          <option>Inntekt</option>
          <option>Utgift</option>
        </select>
        <select style="padding: 10px 16px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; background: white;">
          <option>Siste 30 dager</option>
          <option>Siste 3 måneder</option>
          <option>Siste år</option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f9fafb;">
            <th style="padding: 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Dato</th>
            <th style="padding: 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Beskrivelse</th>
            <th style="padding: 16px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Kategori</th>
            <th style="padding: 16px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Beløp</th>
            <th style="padding: 16px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-top: 1px solid #e5e7eb;">
            <td style="padding: 16px; font-size: 14px; color: #374151;">31.01.2026</td>
            <td style="padding: 16px; font-size: 14px; color: #1a1a1a; font-weight: 500;">Konsulenttjenester - Firma AS</td>
            <td style="padding: 16px;"><span style="padding: 4px 12px; background: #dbeafe; color: #1e40af; border-radius: 20px; font-size: 12px; font-weight: 500;">Inntekt</span></td>
            <td style="padding: 16px; text-align: right; font-size: 14px; color: #10b981; font-weight: 600;">+Kr 25,000</td>
            <td style="padding: 16px; text-align: center;"><span style="padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 20px; font-size: 12px; font-weight: 500;">Fullført</span></td>
          </tr>
          <tr style="border-top: 1px solid #e5e7eb;">
            <td style="padding: 16px; font-size: 14px; color: #374151;">28.01.2026</td>
            <td style="padding: 16px; font-size: 14px; color: #1a1a1a; font-weight: 500;">Kontorleie - Januar</td>
            <td style="padding: 16px;"><span style="padding: 4px 12px; background: #fee2e2; color: #991b1b; border-radius: 20px; font-size: 12px; font-weight: 500;">Utgift</span></td>
            <td style="padding: 16px; text-align: right; font-size: 14px; color: #ef4444; font-weight: 600;">-Kr 12,500</td>
            <td style="padding: 16px; text-align: center;"><span style="padding: 4px 12px; background: #d1fae5; color: #065f46; border-radius: 20px; font-size: 12px; font-weight: 500;">Fullført</span></td>
          </tr>
          <tr style="border-top: 1px solid #e5e7eb;">
            <td style="padding: 16px; font-size: 14px; color: #374151;">25.01.2026</td>
            <td style="padding: 16px; font-size: 14px; color: #1a1a1a; font-weight: 500;">Programvarelisenser</td>
            <td style="padding: 16px;"><span style="padding: 4px 12px; background: #fee2e2; color: #991b1b; border-radius: 20px; font-size: 12px; font-weight: 500;">Utgift</span></td>
            <td style="padding: 16px; text-align: right; font-size: 14px; color: #ef4444; font-weight: 600;">-Kr 3,990</td>
            <td style="padding: 16px; text-align: center;"><span style="padding: 4px 12px; background: #fef3c7; color: #92400e; border-radius: 20px; font-size: 12px; font-weight: 500;">Ventende</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 24px;">
      <button style="padding: 8px 16px; border: 1px solid #e5e7eb; background: white; border-radius: 8px; color: #6b7280; cursor: pointer;">← Forrige</button>
      <button style="padding: 8px 16px; border: 1px solid #1E3A5F; background: #1E3A5F; border-radius: 8px; color: white;">1</button>
      <button style="padding: 8px 16px; border: 1px solid #e5e7eb; background: white; border-radius: 8px; color: #374151; cursor: pointer;">2</button>
      <button style="padding: 8px 16px; border: 1px solid #e5e7eb; background: white; border-radius: 8px; color: #374151; cursor: pointer;">3</button>
      <button style="padding: 8px 16px; border: 1px solid #e5e7eb; background: white; border-radius: 8px; color: #6b7280; cursor: pointer;">Neste →</button>
    </div>

  </div>
</div>
```

---

## 📄 Side 11: User Profile (/user-profile)

### Metadata
- **Page Name:** User Profile
- **Slug:** user-profile
- **SEO Title:** Min profil - Klarpakke

### HTML Embed Code
```html
<!-- KLARPAKKE USER PROFILE PAGE -->
<div data-klarpakke-page="/user-profile" style="min-height: 100vh; background: #f8fafc; padding: 40px 20px; font-family: system-ui, -apple-system, sans-serif;">
  
  <div style="max-width: 1000px; margin: 0 auto;">
    
    <!-- Profile Header -->
    <div style="background: linear-gradient(135deg, #1E3A5F 0%, #0F2942 100%); border-radius: 16px; padding: 40px; color: white; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 24px; flex-wrap: wrap;">
        <div style="width: 100px; height: 100px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: 600;">
          JD
        </div>
        <div style="flex: 1;">
          <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 4px;">John Doe</h1>
          <p style="margin: 0 0 8px; opacity: 0.9;">john.doe@bedrift.no</p>
          <span style="display: inline-block; padding: 6px 16px; background: #10B981; border-radius: 20px; font-size: 14px; font-weight: 500;">Business Plan</span>
        </div>
        <button style="padding: 12px 24px; background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); border-radius: 8px; color: white; font-weight: 500; cursor: pointer;">
          Endre bilde
        </button>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 280px 1fr; gap: 24px; flex-wrap: wrap;">
      
      <!-- Sidebar Navigation -->
      <div style="background: white; border-radius: 12px; padding: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); height: fit-content;">
        <nav style="display: flex; flex-direction: column; gap: 4px;">
          <a href="#" style="padding: 12px 16px; background: #f3f4f6; border-radius: 8px; color: #1a1a1a; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            Profilinformasjon
          </a>
          <a href="#" style="padding: 12px 16px; border-radius: 8px; color: #6b7280; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            Sikkerhet
          </a>
          <a href="#" style="padding: 12px 16px; border-radius: 8px; color: #6b7280; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>
            Abonnement
          </a>
          <a href="#" style="padding: 12px 16px; border-radius: 8px; color: #6b7280; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 12px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            Innstillinger
          </a>
        </nav>
      </div>

      <!-- Main Content -->
      <div style="display: flex; flex-direction: column; gap: 24px;">
        
        <!-- Personal Info -->
        <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px;">Personlig informasjon</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex-wrap: wrap;">
            <div>
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">Fornavn</label>
              <input type="text" value="John" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>
            <div>
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">Etternavn</label>
              <input type="text" value="Doe" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">E-post</label>
              <input type="email" value="john.doe@bedrift.no" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">Telefon</label>
              <input type="tel" value="+47 987 65 432" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>
          </div>

          <div style="display: flex; gap: 12px; margin-top: 24px;">
            <button style="padding: 10px 24px; background: #1E3A5F; color: white; border: none; border-radius: 8px; font-weight: 500; cursor: pointer;">Lagre endringer</button>
            <button style="padding: 10px 24px; background: white; color: #6b7280; border: 1px solid #e5e7eb; border-radius: 8px; font-weight: 500; cursor: pointer;">Avbryt</button>
          </div>
        </div>

        <!-- Company Info -->
        <div style="background: white; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <h2 style="font-size: 18px; font-weight: 600; color: #1a1a1a; margin: 0 0 20px;">Bedriftsinformasjon</h2>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">Bedriftsnavn</label>
              <input type="text" value="Doe Consulting AS" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>
            <div>
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">Organisasjonsnummer</label>
              <input type="text" value="987 654 321" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>
            <div style="grid-column: 1 / -1;">
              <label style="display: block; font-size: 14px; font-weight: 500; color: #374151; margin-bottom: 6px;">Adresse</label>
              <input type="text" value="Storgata 123, 0155 Oslo" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; box-sizing: border-box;">
            </div>
          </div>
        </div>

      </div>
    </div>

  </div>
</div>
```

---

## ✅ Sjekkliste for Deployment

### Før du begynner:
- [ ] Sjekk at du er i Webflow Designer
- [ ] Ha denne guiden åpen i eget vindu
- [ ] Sjekk at du har "can edit" tillatelser

### For hver side:
- [ ] Opprett side med riktig slug
- [ ] Lim inn HTML embed
- [ ] Sjekk at det ser riktig ut i preview
- [ ] Oppdater SEO meta tags
- [ ] Publiser
- [ ] Test i nettleser

### Når alle 11 sider er ferdig:
- [ ] Test alle lenker mellom sider
- [ ] Sjekk mobilvisning
- [ ] Verifiser at auth fungerer (login/signup)
- [ ] Deploy til staging først
- [ ] Deretter til produksjon

---

## 🆘 Feilsøking

**Problem: HTML embed vises ikke**
→ Sjekk at du klikket "Save & Close" i code editor

**Problem: Styling ser rart ut**
→ Sjekk at Webflow ikke overskriver med egne klasser

**Problem: Script fungerer ikke**
→ Sjekk at Supabase config er i Site Settings > Custom Code

---

**God luck! Du klarer dette! 🚀**
