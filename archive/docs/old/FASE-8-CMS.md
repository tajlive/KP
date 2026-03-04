# FASE 8: CONTENT MANAGEMENT (Blogg & Hjelp)

**Estimert tid:** 8 timer  
**Mål:** Blogg med SEO, og hjelpesenter

---

## Task 8.1: Blogg Database Schema

### Migration

**Fil:** `supabase/migrations/20260201230000_blog_system.sql`

```sql
-- Blog System for Klarpakke

-- Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  featured_image TEXT,
  author_id UUID REFERENCES auth.users(id),
  author_name TEXT,
  category TEXT,
  tags TEXT[],
  meta_title TEXT,
  meta_description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog Categories
CREATE TABLE IF NOT EXISTS blog_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0
);

-- Help Articles (for help center)
CREATE TABLE IF NOT EXISTS help_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT[],
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_blog_status ON blog_posts(status);
CREATE INDEX idx_blog_published ON blog_posts(published_at DESC);
CREATE INDEX idx_blog_category ON blog_posts(category);
CREATE INDEX idx_blog_tags ON blog_posts USING GIN(tags);
CREATE INDEX idx_help_category ON help_articles(category);

-- RLS Policies
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE help_articles ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Public can read published blog posts"
  ON blog_posts FOR SELECT
  TO authenticated, anon
  USING (status = 'published');

-- Admins can manage posts
CREATE POLICY "Admins can manage blog posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (auth.uid() IN (SELECT user_id FROM admin_users));

-- Public can read help articles
CREATE POLICY "Public can read help articles"
  ON help_articles FOR SELECT
  TO authenticated, anon
  USING (status = 'published');

-- Function: Increment view count
CREATE OR REPLACE FUNCTION increment_blog_view(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE blog_posts
  SET view_count = view_count + 1
  WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default categories
INSERT INTO blog_categories (slug, name, description, sort_order) VALUES
  ('trading-strategy', 'Trading Strategi', 'Strategier og teknikker', 1),
  ('risk-management', 'Risikostyring', 'Hvordan beskytte kapitalen', 2),
  ('market-analysis', 'Markedsanalyse', 'Teknisk og fundamental analyse', 3),
  ('beginner-guides', 'Nybegynnerguide', 'Kom i gang med trading', 4),
  ('platform-updates', 'Plattformoppdateringer', 'Nyheter fra Klarpakke', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert sample help articles
INSERT INTO help_articles (slug, title, content, category, is_featured) VALUES
  ('kom-i-gang', 'Kom i gang med Klarpakke', 
   '# Kom i gang\n\n1. Opprett konto\n2. Fullfør onboarding\n3. Start med paper trading', 
   'getting-started', true),
   
  ('paper-trading', 'Hva er Paper Trading?', 
   '# Paper Trading\n\nPaper trading lar deg øve på trading uten risiko...', 
   'basics', true),
   
  ('futures-quiz', 'Hvordan består jeg Futures Quiz?', 
   '# Futures Quiz\n\nDu trenger 85% for å bestå. Les materialet grundig.', 
   'quizzes', true)
ON CONFLICT (slug) DO NOTHING;
```

---

## Task 8.2: Blogg UI

### /blog page

```html
<div id="klarpakke-blog-root" data-kp-root="blog">
  
  <h1>Blogg</h1>
  
  <!-- Categories -->
  <div class="blog-categories">
    <button data-cat="all" class="active">Alle</button>
    <button data-cat="trading-strategy">Strategi</button>
    <button data-cat="risk-management">Risiko</button>
    <button data-cat="market-analysis">Analyse</button>
    <button data-cat="beginner-guides">Nybegynner</button>
  </div>
  
  <!-- Search -->
  <div class="blog-search">
    <input type="text" data-search-input placeholder="Søk etter artikler...">
  </div>
  
  <!-- Posts Grid -->
  <div class="blog-grid" data-posts-grid>
    <!-- Loaded dynamically -->
  </div>
  
  <!-- Pagination -->
  <div class="pagination" data-pagination>
    <button data-prev disabled>Forrige</button>
    <span data-page-info>Side 1 av 1</span>
    <button data-next disabled>Neste</button>
  </div>
  
</div>

<script>
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

let currentPage = 1;
let currentCategory = 'all';
let searchQuery = '';

async function loadPosts() {
  let query = supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false });
  
  if (currentCategory !== 'all') {
    query = query.eq('category', currentCategory);
  }
  
  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,excerpt.ilike.%${searchQuery}%`);
  }
  
  const { data: posts, error } = await query
    .range((currentPage - 1) * 12, currentPage * 12 - 1);
  
  const grid = document.querySelector('[data-posts-grid]');
  grid.innerHTML = posts?.map(post => `
    <article class="blog-card">
      <a href="/blog/${post.slug}">
        ${post.featured_image ? `<img src="${post.featured_image}" alt="${post.title}">` : ''}
        <div class="card-content">
          <span class="category">${post.category}</span>
          <h2>${post.title}</h2>
          <p class="excerpt">${post.excerpt}</p>
          <div class="meta">
            <span>${post.author_name}</span>
            <span>${new Date(post.published_at).toLocaleDateString('nb-NO')}</span>
          </div>
        </div>
      </a>
    </article>
  `).join('') || '<p>Ingen artikler funnet</p>';
}

// Category filters
document.querySelectorAll('[data-cat]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.cat;
    currentPage = 1;
    loadPosts();
  });
});

// Search
document.querySelector('[data-search-input]').addEventListener('input', (e) => {
  searchQuery = e.target.value;
  currentPage = 1;
  loadPosts();
});

// Load initial
loadPosts();
</script>
```

### /blog/[slug] page (Article)

```html
<div id="klarpakke-article-root" data-kp-root="blog-article">
  
  <article data-article-content>
    <!-- Content loaded dynamically -->
  </article>
  
  <!-- Related Posts -->
  <aside class="related-posts">
    <h3>Lignende artikler</h3>
    <div data-related-posts></div>
  </aside>
  
</div>

<script>
(async function() {
  const slug = window.location.pathname.split('/').pop();
  
  // Load article
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();
  
  if (error || !post) {
    document.querySelector('[data-article-content]').innerHTML = '<h1>Artikkel ikke funnet</h1>';
    return;
  }
  
  // Update meta tags for SEO
  document.title = `${post.title} - Klarpakke Blogg`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', post.meta_description || post.excerpt);
  
  // Render content
  document.querySelector('[data-article-content]').innerHTML = `
    <header>
      <span class="category">${post.category}</span>
      <h1>${post.title}</h1>
      <div class="meta">
        <span>Av ${post.author_name}</span>
        <span>${new Date(post.published_at).toLocaleDateString('nb-NO')}</span>
      </div>
    </header>
    ${post.featured_image ? `<img src="${post.featured_image}" alt="${post.title}">` : ''}
    <div class="content">
      ${marked.parse(post.content)}
    </div>
  `;
  
  // Track view
  await supabase.rpc('increment_blog_view', { p_post_id: post.id });
  
  // Load related posts
  const { data: related } = await supabase
    .from('blog_posts')
    .select('slug, title, featured_image')
    .eq('category', post.category)
    .eq('status', 'published')
    .neq('id', post.id)
    .limit(3);
  
  document.querySelector('[data-related-posts]').innerHTML = related?.map(r => `
    <a href="/blog/${r.slug}" class="related-card">
      ${r.featured_image ? `<img src="${r.featured_image}">` : ''}
      <span>${r.title}</span>
    </a>
  `).join('') || '';
})();
</script>
```

---

## Task 8.3: Hjelpesenter

### /help page

```html
<div id="klarpakke-help-root" data-kp-root="help">
  
  <h1>Hjelpesenter</h1>
  
  <!-- Search -->
  <div class="help-search">
    <input type="text" data-help-search placeholder="Hva lurer du på?">
  </div>
  
  <!-- Categories -->
  <div class="help-categories" data-help-categories>
    <!-- Loaded dynamically -->
  </div>
  
  <!-- Popular Articles -->
  <div class="popular-articles">
    <h2>Populære artikler</h2>
    <div data-popular-articles></div>
  </div>
  
  <!-- Contact Support -->
  <div class="contact-support">
    <h2>Fant du ikke svar?</h2>
    <p>Kontakt oss på <a href="mailto:kontakt@klarpakke.no">kontakt@klarpakke.no</a></p>
  </div>
  
</div>

<script>
(async function() {
  // Load categories
  const { data: articles } = await supabase
    .from('help_articles')
    .select('category')
    .eq('status', 'published');
  
  const categories = [...new Set(articles?.map(a => a.category) || [])];
  
  document.querySelector('[data-help-categories]').innerHTML = categories.map(cat => `
    <a href="/help/category/${cat}" class="category-card">
      <h3>${cat}</h3>
    </a>
  `).join('');
  
  // Load popular articles
  const { data: popular } = await supabase
    .from('help_articles')
    .select('*')
    .eq('status', 'published')
    .eq('is_featured', true)
    .limit(6);
  
  document.querySelector('[data-popular-articles]').innerHTML = popular?.map(a => `
    <a href="/help/${a.slug}" class="article-link">${a.title}</a>
  `).join('') || '';
  
  // Search
  document.querySelector('[data-help-search]').addEventListener('input', async (e) => {
    const query = e.target.value;
    if (query.length < 3) return;
    
    const { data: results } = await supabase
      .from('help_articles')
      .select('slug, title')
      .ilike('title', `%${query}%`)
      .limit(5);
    
    // Show dropdown with results
  });
})();
</script>
```

---

## LEVERANSE

Etter FASE 8 skal du ha:

- [ ] Blogg med CRUD for admins
- [ ] Blog listing med kategorier
- [ ] Blog article med SEO meta tags
- [ ] Hjelpesenter med søk
- [ ] Help articles i databasen

---

*Sist oppdatert: 31. januar 2026*  
*Blyt AS - Org.nr. 929003292*
